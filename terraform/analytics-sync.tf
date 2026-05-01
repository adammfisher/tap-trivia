# =============================================================================
# Phase 5 — analytics-sync Lambda + 4-source integration
# =============================================================================
# - taptrivia-analytics-py layer (PyJWT + cryptography + google-auth)
# - analytics-sync Lambda
# - IAM additions on the shared role: Cost Explorer, CloudWatch metrics
# - SNS alerts topic + email subscription
# - 4 CloudWatch alarms (one per source) on TapTrivia/AnalyticsSync.SourceFailure
# - EventBridge daily 06:05 UTC schedule
#
# Build the layer before `terraform apply`:
#   bash backend/layers/analytics-py/build.sh
# =============================================================================

# -----------------------------------------------------------------------------
# IAM additions on the shared lambda_execution role
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_cost_explorer" {
  name = "${local.name_prefix}-CostExplorer"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast"
      ]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy" "lambda_cloudwatch_metrics" {
  name = "${local.name_prefix}-CloudWatchMetrics"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["cloudwatch:PutMetricData"]
      Resource = "*"
      Condition = {
        StringEquals = { "cloudwatch:namespace" = "TapTrivia/AnalyticsSync" }
      }
    }]
  })
}

# -----------------------------------------------------------------------------
# analytics-py Lambda layer (PyJWT + cryptography + google-auth)
# -----------------------------------------------------------------------------
resource "aws_lambda_layer_version" "analytics_py" {
  layer_name          = "${local.name_prefix}-analytics-py"
  description         = "PyJWT, cryptography, google-auth — used by analytics Lambdas"
  filename            = "${path.module}/../backend/layers/analytics-py/layer.zip"
  source_code_hash    = filebase64sha256("${path.module}/../backend/layers/analytics-py/layer.zip")
  compatible_runtimes = ["python3.12"]
}

# -----------------------------------------------------------------------------
# analytics-sync Lambda
# -----------------------------------------------------------------------------
data "archive_file" "analytics_sync" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/analytics-sync"
  output_path = "${path.module}/zip/analytics-sync.zip"
}

resource "aws_lambda_function" "analytics_sync" {
  function_name    = "${local.name_prefix}-analytics-sync"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "lambda_function.handler"
  runtime          = "python3.12"
  memory_size      = 1024
  timeout          = 300
  filename         = data.archive_file.analytics_sync.output_path
  source_code_hash = data.archive_file.analytics_sync.output_base64sha256
  layers           = [aws_lambda_layer_version.analytics_py.arn]

  environment {
    variables = {
      TABLE_ANALYTICS_CACHE          = "TapTrivia-AnalyticsCache"
      TABLE_BARS                     = "TapTrivia-Bars"
      TABLE_PLAYERS                  = "TapTrivia-Players"
      TABLE_QUESTION_USAGE_BY_QUESTION = "TapTrivia-QuestionUsageByQuestion"
    }
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Function    = "analytics-sync"
  }
}

resource "aws_cloudwatch_log_group" "analytics_sync" {
  name              = "/aws/lambda/${aws_lambda_function.analytics_sync.function_name}"
  retention_in_days = 30

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

# -----------------------------------------------------------------------------
# EventBridge — daily 06:05 UTC (~02:05 EDT, low-traffic window)
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "analytics_sync_daily" {
  name                = "${local.name_prefix}-AnalyticsSyncDaily"
  description         = "Daily trigger for analytics-sync at 06:05 UTC"
  schedule_expression = "cron(5 6 * * ? *)"
  state               = local.is_dev ? "DISABLED" : "ENABLED"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

resource "aws_cloudwatch_event_target" "analytics_sync_daily" {
  rule  = aws_cloudwatch_event_rule.analytics_sync_daily.name
  arn   = aws_lambda_function.analytics_sync.arn
  input = jsonencode({ trigger = "scheduled" })
}

resource "aws_lambda_permission" "analytics_sync_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.analytics_sync.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.analytics_sync_daily.arn
}

# -----------------------------------------------------------------------------
# SNS alerts topic + email subscription
# -----------------------------------------------------------------------------
resource "aws_sns_topic" "analytics_alerts" {
  name = "${local.name_prefix}-AnalyticsAlerts"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

resource "aws_sns_topic_subscription" "analytics_alerts_email" {
  topic_arn = aws_sns_topic.analytics_alerts.arn
  protocol  = "email"
  endpoint  = "adam@visudolabs.com"
}

# -----------------------------------------------------------------------------
# CloudWatch alarms — one per source. Each fires on three consecutive
# datapoints of "SourceFailure" >= 1 within a 1-day window. The metric is
# emitted by the Lambda on every run (0 on success, 1 on failure), so a
# missed run also counts as a failure once it's been three runs without
# fresh 0-data — only relevant if the Lambda itself stops running.
# -----------------------------------------------------------------------------
locals {
  analytics_alarm_sources = ["revenuecat", "appstore", "googleplay", "aws"]
  analytics_alarm_pretty  = {
    revenuecat = "RevenueCatFailure"
    appstore   = "AppStoreFailure"
    googleplay = "GooglePlayFailure"
    aws        = "AwsCostsFailure"
  }
}

resource "aws_cloudwatch_metric_alarm" "analytics_source_failures" {
  for_each = toset(local.analytics_alarm_sources)

  alarm_name          = "${local.name_prefix}-AnalyticsSync-${local.analytics_alarm_pretty[each.key]}"
  alarm_description   = "analytics-sync ${each.key} source failed 3 consecutive runs"
  namespace           = "TapTrivia/AnalyticsSync"
  metric_name         = "SourceFailure"
  dimensions          = { Source = each.key }
  statistic           = "Maximum"
  period              = 86400 # one day — matches daily schedule
  evaluation_periods  = 3
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.analytics_alerts.arn]
  ok_actions    = [aws_sns_topic.analytics_alerts.arn]

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "analytics_sync_function" {
  value = aws_lambda_function.analytics_sync.function_name
}

output "analytics_alerts_topic" {
  value = aws_sns_topic.analytics_alerts.arn
}

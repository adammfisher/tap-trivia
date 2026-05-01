# =============================================================================
# Geo-IP infrastructure (Phase 2 of the analytics build).
# =============================================================================
# - Internal S3 bucket holding the GeoLite2-City.mmdb
# - Lambda layer with maxminddb + the geoip_resolver helper + zip_to_dma.json
# - geoip-update Lambda (downloads MaxMind .mmdb monthly to S3)
# - EventBridge monthly schedule
# - IAM additions on the existing lambda_execution role:
#     S3 access to taptrivia-internal/*
#     Secrets Manager access to taptrivia/* secrets
#
# The MaxMind credentials secret (taptrivia/geoip/maxmind-credentials) is
# bootstrapped out-of-band via AWS CLI; only IAM access is declared here so
# the secret value never enters tfstate.
#
# Build the layer artifact before `terraform apply`:
#   bash backend/layers/geoip-py/build.sh
# =============================================================================

# -----------------------------------------------------------------------------
# Internal S3 bucket
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "internal" {
  count  = local.is_dev ? 0 : 1
  bucket = "taptrivia-internal"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Purpose     = "Internal artifacts - GeoLite2 mmdb"
  }
}

resource "aws_s3_bucket_public_access_block" "internal" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.internal[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "internal" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.internal[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# -----------------------------------------------------------------------------
# IAM additions on the shared lambda_execution role
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_s3_internal" {
  name = "${local.name_prefix}-S3-Internal"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:HeadObject"
        ]
        Resource = "arn:aws:s3:::taptrivia-internal/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::taptrivia-internal"
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_secrets_manager" {
  name = "${local.name_prefix}-SecretsManager"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:${var.region}:*:secret:taptrivia/*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Lambda layer (maxminddb + geoip_resolver + zip_to_dma.json)
# -----------------------------------------------------------------------------
# layer.zip is built by backend/layers/geoip-py/build.sh — run that first.
resource "aws_lambda_layer_version" "geoip_py" {
  layer_name          = "${local.name_prefix}-geoip-py"
  description         = "maxminddb + geoip_resolver helper + zip_to_dma.json"
  filename            = "${path.module}/../backend/layers/geoip-py/layer.zip"
  source_code_hash    = filebase64sha256("${path.module}/../backend/layers/geoip-py/layer.zip")
  compatible_runtimes = ["python3.12"]
}

# -----------------------------------------------------------------------------
# geoip-update Lambda
# -----------------------------------------------------------------------------
data "archive_file" "geoip_update" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/geoip-update"
  output_path = "${path.module}/zip/geoip-update.zip"
}

resource "aws_lambda_function" "geoip_update" {
  function_name    = "${local.name_prefix}-geoip-update"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "lambda_function.handler"
  runtime          = "python3.12"
  memory_size      = 512
  timeout          = 120
  filename         = data.archive_file.geoip_update.output_path
  source_code_hash = data.archive_file.geoip_update.output_base64sha256
  layers           = [aws_lambda_layer_version.geoip_py.arn]

  environment {
    variables = {
      GEOIP_BUCKET      = "taptrivia-internal"
      GEOIP_KEY         = "geoip/GeoLite2-City.mmdb"
      MAXMIND_SECRET_ID = "taptrivia/geoip/maxmind-credentials"
    }
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

resource "aws_cloudwatch_log_group" "geoip_update" {
  name              = "/aws/lambda/${aws_lambda_function.geoip_update.function_name}"
  retention_in_days = 30

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

# -----------------------------------------------------------------------------
# EventBridge monthly schedule
# -----------------------------------------------------------------------------
# Fires at 03:00 UTC on the 1st of each month. The Lambda is idempotent
# (overwrites the .mmdb in place); a missed run just delays the refresh by
# a month and resolvers continue using the stale copy until then.
resource "aws_cloudwatch_event_rule" "geoip_update_monthly" {
  name                = "${local.name_prefix}-GeoIPUpdateMonthly"
  description         = "Trigger geoip-update Lambda monthly to refresh GeoLite2-City.mmdb"
  schedule_expression = "cron(0 3 1 * ? *)"
  state               = local.is_dev ? "DISABLED" : "ENABLED"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

resource "aws_cloudwatch_event_target" "geoip_update_monthly" {
  rule = aws_cloudwatch_event_rule.geoip_update_monthly.name
  arn  = aws_lambda_function.geoip_update.arn
}

resource "aws_lambda_permission" "geoip_update_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.geoip_update.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.geoip_update_monthly.arn
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "geoip_internal_bucket" {
  value       = local.is_dev ? null : aws_s3_bucket.internal[0].bucket
  description = "Internal bucket holding GeoLite2-City.mmdb"
}

output "geoip_update_function_name" {
  value = aws_lambda_function.geoip_update.function_name
}

output "geoip_layer_arn" {
  value = aws_lambda_layer_version.geoip_py.arn
}

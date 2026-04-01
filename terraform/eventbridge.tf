# =============================================================================
# EventBridge Rules for Tap Trivia
# =============================================================================
# Scheduled rules that trigger Lambda functions on a cron schedule.
# =============================================================================

# -----------------------------------------------------------------------------
# Daily Game Generation
# -----------------------------------------------------------------------------
# Runs at 14:00 UTC (9:00 AM Eastern) every day to pre-generate the day's
# trivia games so questions are ready before the 10 AM ET start.
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "generate_games" {
  name                = "${local.name_prefix}-GenerateGames"
  description         = "Trigger daily game generation at 9 AM ET (14:00 UTC)"
  schedule_expression = "cron(0 14 * * ? *)"
  state               = local.is_dev ? "DISABLED" : "ENABLED"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

resource "aws_cloudwatch_event_target" "generate_games" {
  rule = aws_cloudwatch_event_rule.generate_games.name
  arn  = aws_lambda_function.generate_games.arn
}


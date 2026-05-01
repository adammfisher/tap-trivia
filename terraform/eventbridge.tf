# =============================================================================
# EventBridge Rules for Tap Trivia
# =============================================================================
# Scheduled rules that trigger Lambda functions on a cron schedule.
# =============================================================================

# -----------------------------------------------------------------------------
# Daily Game Generation
# -----------------------------------------------------------------------------
# Runs at 17:00 UTC (12:00 PM EST / 1:00 PM EDT) every day. The Lambda is
# idempotent and pre-generates today + tomorrow, so a missed run still leaves
# 24+ hours of slots ahead. Critical for app-store reviewers who may test at
# any hour — if no game is scheduled they get rejected.
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "generate_games" {
  name                = "${local.name_prefix}-GenerateGames"
  description         = "Trigger daily game generation at 12 PM EST (17:00 UTC)"
  schedule_expression = "cron(0 17 * * ? *)"
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


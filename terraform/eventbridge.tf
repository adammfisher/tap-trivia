# =============================================================================
# EventBridge Rules for Tap Trivia
# =============================================================================
# Scheduled rules that trigger Lambda functions on a cron schedule.
# =============================================================================

# -----------------------------------------------------------------------------
# Daily Game Generation
# -----------------------------------------------------------------------------
# Runs at 21:00 UTC (4:00 PM Eastern) every day to pre-generate the night's
# trivia games so questions are ready before the 5 PM ET start.
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "generate_games" {
  name                = "TapTrivia-GenerateGames"
  description         = "Trigger daily game generation at 4 PM ET (21:00 UTC)"
  schedule_expression = "cron(0 21 * * ? *)"

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
  }
}

resource "aws_cloudwatch_event_target" "generate_games" {
  rule = aws_cloudwatch_event_rule.generate_games.name
  arn  = aws_lambda_function.generate_games.arn
}


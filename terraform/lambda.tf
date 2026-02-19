# =============================================================================
# Lambda Functions for Tap Trivia
# =============================================================================
# All 11 Lambda functions, their deployment packages (archive_file),
# API Gateway / EventBridge invocation permissions, and shared environment
# variable configuration.
# =============================================================================

# -----------------------------------------------------------------------------
# Common Environment Variables
# Shared across all Lambda functions so each can access any DynamoDB table.
# -----------------------------------------------------------------------------
locals {
  common_environment_variables = {
    TABLE_GAMES          = aws_dynamodb_table.games.name
    TABLE_QUESTIONS      = aws_dynamodb_table.questions.name
    TABLE_QUESTION_USAGE = aws_dynamodb_table.question_usage.name
    TABLE_ANSWERS        = aws_dynamodb_table.answers.name
    TABLE_PLAYERS        = aws_dynamodb_table.players.name
    TABLE_BARS           = aws_dynamodb_table.bars.name
    TABLE_SESSIONS       = aws_dynamodb_table.sessions.name
    TABLE_FEEDBACK       = aws_dynamodb_table.feedback.name
  }
}

# =============================================================================
# Deployment Packages (archive_file data sources)
# =============================================================================

data "archive_file" "register_bar" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/register-bar"
  output_path = "${path.module}/zip/register-bar.zip"
}

data "archive_file" "get_bar" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/get-bar"
  output_path = "${path.module}/zip/get-bar.zip"
}

data "archive_file" "join_bar" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/join-bar"
  output_path = "${path.module}/zip/join-bar.zip"
}

data "archive_file" "reset_bar_code" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/reset-bar-code"
  output_path = "${path.module}/zip/reset-bar-code.zip"
}

data "archive_file" "get_current_game" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/get-current-game"
  output_path = "${path.module}/zip/get-current-game.zip"
}

data "archive_file" "get_question" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/get-question"
  output_path = "${path.module}/zip/get-question.zip"
}

data "archive_file" "submit_answer" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/submit-answer"
  output_path = "${path.module}/zip/submit-answer.zip"
}

data "archive_file" "get_leaderboard" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/get-leaderboard"
  output_path = "${path.module}/zip/get-leaderboard.zip"
}

data "archive_file" "get_tv_state" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/get-tv-state"
  output_path = "${path.module}/zip/get-tv-state.zip"
}

data "archive_file" "generate_games" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/generate-games"
  output_path = "${path.module}/zip/generate-games.zip"
}

data "archive_file" "get_player" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/get-player"
  output_path = "${path.module}/zip/get-player.zip"
}

# =============================================================================
# Lambda Functions
# =============================================================================

# -----------------------------------------------------------------------------
# 1. register-bar
#    Registers a new bar/venue. Calls ip-api.com for geolocation.
#    DynamoDB: Read/Write Bars (+ tvDeviceId-index GSI)
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "register_bar" {
  function_name    = "TapTrivia-register-bar"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.register_bar.output_path
  source_code_hash = data.archive_file.register_bar.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "register-bar"
  }
}

# -----------------------------------------------------------------------------
# 2. get-bar
#    Retrieves bar details.
#    DynamoDB: Read Bars
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "get_bar" {
  function_name    = "TapTrivia-get-bar"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.get_bar.output_path
  source_code_hash = data.archive_file.get_bar.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "get-bar"
  }
}

# -----------------------------------------------------------------------------
# 3. join-bar
#    Allows a player to join a bar's trivia session.
#    DynamoDB: Read/Write Bars, Write Players
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "join_bar" {
  function_name    = "TapTrivia-join-bar"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.join_bar.output_path
  source_code_hash = data.archive_file.join_bar.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "join-bar"
  }
}

# -----------------------------------------------------------------------------
# 4. reset-bar-code
#    Resets the join code for a bar.
#    DynamoDB: Read/Write Bars
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "reset_bar_code" {
  function_name    = "TapTrivia-reset-bar-code"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.reset_bar_code.output_path
  source_code_hash = data.archive_file.reset_bar_code.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "reset-bar-code"
  }
}

# -----------------------------------------------------------------------------
# 5. get-current-game
#    Retrieves the currently active game.
#    DynamoDB: Read Games
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "get_current_game" {
  function_name    = "TapTrivia-get-current-game"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.get_current_game.output_path
  source_code_hash = data.archive_file.get_current_game.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "get-current-game"
  }
}

# -----------------------------------------------------------------------------
# 6. get-question
#    Retrieves a specific question from a game.
#    DynamoDB: Read Games (+ gameId-index GSI)
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "get_question" {
  function_name    = "TapTrivia-get-question"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.get_question.output_path
  source_code_hash = data.archive_file.get_question.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "get-question"
  }
}

# -----------------------------------------------------------------------------
# 7. submit-answer
#    Submits a player's answer to a question and calculates points.
#    DynamoDB: Read Games (gameId-index), Read/Write Answers, Read/Write Players
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "submit_answer" {
  function_name    = "TapTrivia-submit-answer"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.submit_answer.output_path
  source_code_hash = data.archive_file.submit_answer.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "submit-answer"
  }
}

# -----------------------------------------------------------------------------
# 8. get-leaderboard
#    Retrieves the leaderboard for a game.
#    DynamoDB: Read Answers (game-player-index, game-bar-index), Read Bars,
#              Read Players
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "get_leaderboard" {
  function_name    = "TapTrivia-get-leaderboard"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.get_leaderboard.output_path
  source_code_hash = data.archive_file.get_leaderboard.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "get-leaderboard"
  }
}

# -----------------------------------------------------------------------------
# 9. get-tv-state
#    Returns the current state for the TV display at a bar.
#    DynamoDB: Read Games, Read Answers (game-bar-index), Read/Write Bars
#    Extra env: PLAYER_APP_URL (custom domain)
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "get_tv_state" {
  function_name    = "TapTrivia-get-tv-state"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.get_tv_state.output_path
  source_code_hash = data.archive_file.get_tv_state.output_base64sha256

  environment {
    variables = merge(local.common_environment_variables, {
      PLAYER_APP_URL = "https://play.taptrivia.tv"
    })
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "get-tv-state"
  }
}

# -----------------------------------------------------------------------------
# 10. generate-games
#     Generates new trivia games on a schedule (invoked by EventBridge).
#     DynamoDB: Read/Write Games, Read Questions (+ category-difficulty-index),
#               Read/Write QuestionUsage
#     Higher memory (256MB) and timeout (60s) for batch processing.
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "generate_games" {
  function_name    = "TapTrivia-generate-games"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 512
  timeout          = 300
  filename         = data.archive_file.generate_games.output_path
  source_code_hash = data.archive_file.generate_games.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "generate-games"
  }
}

# -----------------------------------------------------------------------------
# 11. get-player
#     Retrieves or updates player profile information.
#     DynamoDB: Read/Write Players
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "get_player" {
  function_name    = "TapTrivia-get-player"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.get_player.output_path
  source_code_hash = data.archive_file.get_player.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "get-player"
  }
}

# =============================================================================
# Lambda Permissions — API Gateway Invocation
# =============================================================================
# All functions except generate-games are invoked by API Gateway.
# =============================================================================

resource "aws_lambda_permission" "register_bar_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.register_bar.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_bar_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_bar.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "join_bar_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.join_bar.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "reset_bar_code_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.reset_bar_code.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_current_game_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_current_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_question_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_question.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "submit_answer_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.submit_answer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_leaderboard_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_leaderboard.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_tv_state_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_tv_state.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_player_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_player.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# =============================================================================
# Lambda Permission — EventBridge Invocation
# =============================================================================
# generate-games is invoked on a schedule by EventBridge, not API Gateway.
# =============================================================================

resource "aws_lambda_permission" "generate_games_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.generate_games.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.generate_games.arn
}

# =============================================================================
# Dashboard Lambda Functions (5 new)
# =============================================================================

# -----------------------------------------------------------------------------
# Deployment Packages
# -----------------------------------------------------------------------------

data "archive_file" "send_otp" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/send-otp"
  output_path = "${path.module}/zip/send-otp.zip"
}

data "archive_file" "verify_otp" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/verify-otp"
  output_path = "${path.module}/zip/verify-otp.zip"
}

data "archive_file" "get_dashboard" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/get-dashboard"
  output_path = "${path.module}/zip/get-dashboard.zip"
}

data "archive_file" "save_signage" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/save-signage"
  output_path = "${path.module}/zip/save-signage.zip"
}

data "archive_file" "upload_logo" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/upload-logo"
  output_path = "${path.module}/zip/upload-logo.zip"
}

# -----------------------------------------------------------------------------
# 12. send-otp
#     Sends a 6-digit OTP to bar owner's email for dashboard login.
#     DynamoDB: Read/Write Bars
#     SES: Send email
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "send_otp" {
  function_name    = "TapTrivia-send-otp"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.send_otp.output_path
  source_code_hash = data.archive_file.send_otp.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "send-otp"
  }
}

# -----------------------------------------------------------------------------
# 13. verify-otp
#     Verifies OTP and creates a dashboard session token.
#     DynamoDB: Read/Write Bars, Write Sessions
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "verify_otp" {
  function_name    = "TapTrivia-verify-otp"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.verify_otp.output_path
  source_code_hash = data.archive_file.verify_otp.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "verify-otp"
  }
}

# -----------------------------------------------------------------------------
# 14. get-dashboard
#     Returns bar profile, signage config, and analytics for dashboard.
#     DynamoDB: Read Bars, Read Sessions
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "get_dashboard" {
  function_name    = "TapTrivia-get-dashboard"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.get_dashboard.output_path
  source_code_hash = data.archive_file.get_dashboard.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "get-dashboard"
  }
}

# -----------------------------------------------------------------------------
# 15. save-signage
#     Saves bar's digital signage configuration.
#     DynamoDB: Read/Write Bars, Read Sessions
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "save_signage" {
  function_name    = "TapTrivia-save-signage"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.save_signage.output_path
  source_code_hash = data.archive_file.save_signage.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "save-signage"
  }
}

# -----------------------------------------------------------------------------
# 16. upload-logo
#     Processes and uploads bar logo with background removal via Bedrock.
#     DynamoDB: Read/Write Bars, Read Sessions
#     S3: Write to taptrivia-logos bucket
#     Bedrock: Invoke Titan Image Generator
#     Higher memory (256MB) and timeout (30s) for image processing.
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "upload_logo" {
  function_name    = "TapTrivia-upload-logo"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 256
  timeout          = 30
  filename         = data.archive_file.upload_logo.output_path
  source_code_hash = data.archive_file.upload_logo.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "upload-logo"
  }
}

# -----------------------------------------------------------------------------
# Dashboard Lambda Permissions — API Gateway Invocation
# -----------------------------------------------------------------------------

resource "aws_lambda_permission" "send_otp_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.send_otp.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "verify_otp_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.verify_otp.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_dashboard_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_dashboard.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "save_signage_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.save_signage.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "upload_logo_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload_logo.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# =============================================================================
# Player Feedback Lambda
# =============================================================================

data "archive_file" "submit_feedback" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/submit-feedback"
  output_path = "${path.module}/zip/submit-feedback.zip"
}

# -----------------------------------------------------------------------------
# 17. submit-feedback
#     Stores player feedback from the mobile app.
#     DynamoDB: Write Feedback
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "submit_feedback" {
  function_name    = "TapTrivia-submit-feedback"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.submit_feedback.output_path
  source_code_hash = data.archive_file.submit_feedback.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Function    = "submit-feedback"
  }
}

resource "aws_lambda_permission" "submit_feedback_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.submit_feedback.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

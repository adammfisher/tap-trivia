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
  function_name    = "${local.name_prefix}-register-bar"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.register_bar.output_path
  source_code_hash = data.archive_file.register_bar.output_base64sha256

  environment {
    variables = merge(local.common_environment_variables, local.is_dev ? { SKIP_SES = "true" } : {})
  }

  tags = {
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-get-bar"
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
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-join-bar"
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
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-reset-bar-code"
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
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-get-current-game"
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
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-get-question"
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
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-submit-answer"
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
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-get-leaderboard"
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
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-get-tv-state"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.get_tv_state.output_path
  source_code_hash = data.archive_file.get_tv_state.output_base64sha256

  environment {
    variables = merge(local.common_environment_variables, {
      PLAYER_APP_URL = local.is_dev ? "http://localhost:8091" : "https://app.taptrivia.tv"
    })
  }

  tags = {
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-generate-games"
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
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-get-player"
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
    Environment = local.stage
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

data "archive_file" "save_settings" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/save-settings"
  output_path = "${path.module}/zip/save-settings.zip"
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
  function_name    = "${local.name_prefix}-send-otp"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.send_otp.output_path
  source_code_hash = data.archive_file.send_otp.output_base64sha256

  environment {
    variables = merge(local.common_environment_variables, local.is_dev ? { SKIP_SES = "true" } : {})
  }

  tags = {
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-verify-otp"
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
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-get-dashboard"
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
    Environment = local.stage
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
  function_name    = "${local.name_prefix}-save-signage"
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
    Environment = local.stage
    Project     = "TapTrivia"
    Function    = "save-signage"
  }
}

# -----------------------------------------------------------------------------
# 15b. save-settings
#     Saves per-venue settings flags (e.g. housePlayersEnabled) on the bar record.
#     DynamoDB: Read/Write Bars, Read Sessions
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "save_settings" {
  function_name    = "${local.name_prefix}-save-settings"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.save_settings.output_path
  source_code_hash = data.archive_file.save_settings.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Function    = "save-settings"
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
  function_name    = "${local.name_prefix}-upload-logo"
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
    Environment = local.stage
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

resource "aws_lambda_permission" "save_settings_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.save_settings.function_name
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
# Between-Game Data Lambda
# =============================================================================

data "archive_file" "get_between_game_data" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/get-between-game-data"
  output_path = "${path.module}/zip/get-between-game-data.zip"
}

# -----------------------------------------------------------------------------
# 20. get-between-game-data
#     Returns podium, bar standings, national top 25, and hype data
#     for the between-game TV experience.
#     DynamoDB: Read Answers (game-bar-index), Read Players (WeeklyLeaderboard GSI),
#               Read Bars (StateScoreIndex GSI), Read Games
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "get_between_game_data" {
  function_name    = "${local.name_prefix}-get-between-game-data"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 256
  timeout          = 15
  filename         = data.archive_file.get_between_game_data.output_path
  source_code_hash = data.archive_file.get_between_game_data.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Function    = "get-between-game-data"
  }
}

resource "aws_lambda_permission" "get_between_game_data_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_between_game_data.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# =============================================================================
# Group Lambda
# =============================================================================

data "archive_file" "create_group" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/create-group"
  output_path = "${path.module}/zip/create-group.zip"
}

# -----------------------------------------------------------------------------
# 18. create-group
#     Creates a persistent friend group (virtual bar).
#     DynamoDB: Read/Write Bars
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "create_group" {
  function_name    = "${local.name_prefix}-create-group"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.create_group.output_path
  source_code_hash = data.archive_file.create_group.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Function    = "create-group"
  }
}

resource "aws_lambda_permission" "create_group_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_group.function_name
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
  function_name    = "${local.name_prefix}-submit-feedback"
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
    Environment = local.stage
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

# =============================================================================
# TV Activate Lambda
# =============================================================================

data "archive_file" "tv_activate" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/tv-activate"
  output_path = "${path.module}/zip/tv-activate.zip"
}

# -----------------------------------------------------------------------------
# 19. tv-activate (Python — pairs a TV with a bar)
#     - Validates bar code
#     - Resolves source IP to geo via geoip-py layer
#     - Upserts TapTrivia-TvPairings (preserves paired_at_utc on re-pair)
#     - Copies geo to TapTrivia-Bars on first TV; increments total_tvs after
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "tv_activate" {
  function_name    = "${local.name_prefix}-tv-activate"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "lambda_function.handler"
  runtime          = "python3.12"
  memory_size      = 256
  timeout          = 15
  filename         = data.archive_file.tv_activate.output_path
  source_code_hash = data.archive_file.tv_activate.output_base64sha256
  layers           = [aws_lambda_layer_version.geoip_py.arn]

  environment {
    variables = merge(local.common_environment_variables, {
      TABLE_TV_PAIRINGS = "TapTrivia-TvPairings"
      GEOIP_BUCKET      = "taptrivia-internal"
      GEOIP_KEY         = "geoip/GeoLite2-City.mmdb"
    })
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Function    = "tv-activate"
  }
}

resource "aws_lambda_permission" "tv_activate_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tv_activate.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# -----------------------------------------------------------------------------
# 20. tv-heartbeat (Python — keepalive ping for paired TVs)
#     POST /tv-heartbeat updates last_heartbeat_utc on TvPairings.
# -----------------------------------------------------------------------------
data "archive_file" "tv_heartbeat" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/tv-heartbeat"
  output_path = "${path.module}/zip/tv-heartbeat.zip"
}

resource "aws_lambda_function" "tv_heartbeat" {
  function_name    = "${local.name_prefix}-tv-heartbeat"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "lambda_function.handler"
  runtime          = "python3.12"
  memory_size      = 128
  timeout          = 5
  filename         = data.archive_file.tv_heartbeat.output_path
  source_code_hash = data.archive_file.tv_heartbeat.output_base64sha256

  environment {
    variables = {
      TABLE_TV_PAIRINGS = "TapTrivia-TvPairings"
    }
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Function    = "tv-heartbeat"
  }
}

resource "aws_lambda_permission" "tv_heartbeat_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tv_heartbeat.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# -----------------------------------------------------------------------------
# 21. signage-impression (Python — write one signage display event)
#     POST /signage-impression writes to TapTrivia-SignageImpressions with
#     ULID sort key and 90-day TTL.
# -----------------------------------------------------------------------------
data "archive_file" "signage_impression" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/signage-impression"
  output_path = "${path.module}/zip/signage-impression.zip"
}

resource "aws_lambda_function" "signage_impression" {
  function_name    = "${local.name_prefix}-signage-impression"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "lambda_function.handler"
  runtime          = "python3.12"
  memory_size      = 128
  timeout          = 5
  filename         = data.archive_file.signage_impression.output_path
  source_code_hash = data.archive_file.signage_impression.output_base64sha256

  environment {
    variables = {
      TABLE_SIGNAGE_IMPRESSIONS = "TapTrivia-SignageImpressions"
    }
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Function    = "signage-impression"
  }
}

resource "aws_lambda_permission" "signage_impression_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.signage_impression.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# =============================================================================
# Contact Form Lambda
# =============================================================================

data "archive_file" "contact" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/contact"
  output_path = "${path.module}/zip/contact.zip"
}

resource "aws_lambda_function" "contact" {
  function_name    = "${local.name_prefix}-contact"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.contact.output_path
  source_code_hash = data.archive_file.contact.output_base64sha256

  environment {
    variables = local.common_environment_variables
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Function    = "contact"
  }
}

resource "aws_lambda_permission" "contact_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contact.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

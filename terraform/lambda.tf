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
#    Extra env: PLAYER_APP_URL (CloudFront distribution URL)
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
      PLAYER_APP_URL = "https://${aws_cloudfront_distribution.player_app.domain_name}"
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
  memory_size      = 256
  timeout          = 120
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

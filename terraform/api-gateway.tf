# =============================================================================
# API Gateway (HTTP API) for Tap Trivia
# =============================================================================
# Single HTTP API with Lambda proxy integrations for all backend routes.
# CORS is configured at the API level to allow browser-based clients.
# =============================================================================

# -----------------------------------------------------------------------------
# HTTP API
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_api" "main" {
  name          = "TapTrivia-API"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "OPTIONS"]
    allow_headers = ["Content-Type", "X-Player-ID", "Authorization"]
    max_age       = 86400
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
  }
}

# -----------------------------------------------------------------------------
# Default Stage (auto-deploy)
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
  }
}

# =============================================================================
# Bar Routes
# =============================================================================

# -----------------------------------------------------------------------------
# POST /bar/register → register-bar
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "register_bar" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.register_bar.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "register_bar" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /bar/register"
  target    = "integrations/${aws_apigatewayv2_integration.register_bar.id}"
}

# -----------------------------------------------------------------------------
# GET /bar/{barCode} → get-bar
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "get_bar" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_bar.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_bar" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /bar/{barCode}"
  target    = "integrations/${aws_apigatewayv2_integration.get_bar.id}"
}

# -----------------------------------------------------------------------------
# POST /bar/join → join-bar
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "join_bar" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.join_bar.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "join_bar" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /bar/join"
  target    = "integrations/${aws_apigatewayv2_integration.join_bar.id}"
}

# -----------------------------------------------------------------------------
# POST /bar/{barCode}/reset → reset-bar-code
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "reset_bar_code" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.reset_bar_code.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "reset_bar_code" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /bar/{barCode}/reset"
  target    = "integrations/${aws_apigatewayv2_integration.reset_bar_code.id}"
}

# =============================================================================
# Game Routes
# =============================================================================

# -----------------------------------------------------------------------------
# GET /game/current → get-current-game
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "get_current_game" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_current_game.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_current_game" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /game/current"
  target    = "integrations/${aws_apigatewayv2_integration.get_current_game.id}"
}

# -----------------------------------------------------------------------------
# GET /game/{gameId}/question/{questionNumber} → get-question
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "get_question" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_question.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_question" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /game/{gameId}/question/{questionNumber}"
  target    = "integrations/${aws_apigatewayv2_integration.get_question.id}"
}

# -----------------------------------------------------------------------------
# POST /game/{gameId}/answer → submit-answer
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "submit_answer" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.submit_answer.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "submit_answer" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /game/{gameId}/answer"
  target    = "integrations/${aws_apigatewayv2_integration.submit_answer.id}"
}

# -----------------------------------------------------------------------------
# GET /game/{gameId}/leaderboard → get-leaderboard
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "get_leaderboard" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_leaderboard.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_leaderboard" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /game/{gameId}/leaderboard"
  target    = "integrations/${aws_apigatewayv2_integration.get_leaderboard.id}"
}

# -----------------------------------------------------------------------------
# GET /game/tv-state → get-tv-state
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "get_tv_state" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_tv_state.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_tv_state" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /game/tv-state"
  target    = "integrations/${aws_apigatewayv2_integration.get_tv_state.id}"
}

# =============================================================================
# Player Routes
# =============================================================================

# -----------------------------------------------------------------------------
# GET /player/{playerId} → get-player
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "get_player" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_player.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_player" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /player/{playerId}"
  target    = "integrations/${aws_apigatewayv2_integration.get_player.id}"
}

# -----------------------------------------------------------------------------
# PUT /player/{playerId} → get-player (update player)
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_route" "update_player" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /player/{playerId}"
  target    = "integrations/${aws_apigatewayv2_integration.get_player.id}"
}

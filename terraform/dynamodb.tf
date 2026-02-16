# =============================================================================
# DynamoDB Tables for Tap Trivia
# =============================================================================
# All tables use on-demand billing (PAY_PER_REQUEST) to handle variable
# traffic patterns without capacity planning.
# =============================================================================

# -----------------------------------------------------------------------------
# 1. TapTrivia-Games
#    Stores active and recent game sessions.
#    GSI on gameId for lookups by game identifier.
#    TTL enabled to auto-expire old game records.
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "games" {
  name         = "TapTrivia-Games"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "gameId"
    type = "S"
  }

  global_secondary_index {
    name            = "gameId-index"
    hash_key        = "gameId"
    projection_type = "ALL"
  }

  ttl {
    enabled        = true
    attribute_name = "ttl"
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Table       = "Games"
  }
}

# -----------------------------------------------------------------------------
# 2. TapTrivia-Questions
#    Question bank organized by category and difficulty.
#    GSI uses a composite sort key "difficultySort" (e.g. "2#4821") to enable
#    querying questions by category with difficulty+questionId ordering.
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "questions" {
  name         = "TapTrivia-Questions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "difficultySort"
    type = "S"
  }

  global_secondary_index {
    name            = "category-difficulty-index"
    hash_key        = "category"
    range_key       = "difficultySort"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Table       = "Questions"
  }
}

# -----------------------------------------------------------------------------
# 3. TapTrivia-QuestionUsage
#    Tracks which questions have been used in which contexts to avoid repeats.
#    Simple key-value table with no GSIs or TTL.
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "question_usage" {
  name         = "TapTrivia-QuestionUsage"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"

  attribute {
    name = "PK"
    type = "S"
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Table       = "QuestionUsage"
  }
}

# -----------------------------------------------------------------------------
# 4. TapTrivia-Answers
#    Stores individual player answers for each question in a game.
#    GSI game-player-index: look up all answers by a player in a game.
#    GSI game-bar-index: look up answers by bar within a game, sorted by points.
#    TTL enabled to auto-expire old answer records.
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "answers" {
  name         = "TapTrivia-Answers"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "gameId"
    type = "S"
  }

  attribute {
    name = "playerId"
    type = "S"
  }

  attribute {
    name = "gameIdBarCode"
    type = "S"
  }

  attribute {
    name = "pointsAwarded"
    type = "N"
  }

  global_secondary_index {
    name            = "game-player-index"
    hash_key        = "gameId"
    range_key       = "playerId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "game-bar-index"
    hash_key        = "gameIdBarCode"
    range_key       = "pointsAwarded"
    projection_type = "ALL"
  }

  ttl {
    enabled        = true
    attribute_name = "ttl"
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Table       = "Answers"
  }
}

# -----------------------------------------------------------------------------
# 5. TapTrivia-Players
#    Player profiles and authentication data.
#    Simple key-value table with no GSIs or TTL.
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "players" {
  name         = "TapTrivia-Players"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"

  attribute {
    name = "PK"
    type = "S"
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Table       = "Players"
  }
}

# -----------------------------------------------------------------------------
# 6. TapTrivia-Bars
#    Bar/venue registrations. Permanent records — no TTL.
#    GSI tvDeviceId-index: look up bar by its TV device identifier.
#    GSI state-index: list bars by state, sorted by barCode.
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "bars" {
  name         = "TapTrivia-Bars"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "tvDeviceId"
    type = "S"
  }

  attribute {
    name = "state"
    type = "S"
  }

  attribute {
    name = "barCode"
    type = "S"
  }

  global_secondary_index {
    name            = "tvDeviceId-index"
    hash_key        = "tvDeviceId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "state-index"
    hash_key        = "state"
    range_key       = "barCode"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Table       = "Bars"
  }
}

# -----------------------------------------------------------------------------
# 7. TapTrivia-GameStats (Phase 1.5)
#    Aggregated game statistics for reporting and analytics.
#    GSI date-index: query stats by date, sorted by PK.
#    TTL enabled to auto-expire old stats records.
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "game_stats" {
  name         = "TapTrivia-GameStats"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  global_secondary_index {
    name            = "date-index"
    hash_key        = "date"
    range_key       = "PK"
    projection_type = "ALL"
  }

  ttl {
    enabled        = true
    attribute_name = "ttl"
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Table       = "GameStats"
  }
}

# -----------------------------------------------------------------------------
# 8. TapTrivia-Sessions
#    Dashboard session tokens for bar owner authentication.
#    TTL enabled for automatic session expiry cleanup.
#    No GSIs needed — sessions are only looked up by token (PK).
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "sessions" {
  name         = "TapTrivia-Sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"

  attribute {
    name = "PK"
    type = "S"
  }

  ttl {
    enabled        = true
    attribute_name = "ttl"
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Table       = "Sessions"
  }
}

# =============================================================================
# IAM Roles and Policies for Tap Trivia Lambda Functions
# =============================================================================
# A single shared execution role for all Lambda functions, granting:
#   - CloudWatch Logs access for logging
#   - DynamoDB access to all TapTrivia-* tables and their indexes
# =============================================================================

# -----------------------------------------------------------------------------
# Shared Lambda Execution Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "lambda_execution" {
  name = "TapTrivia-LambdaExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Logs Policy
# Allows all Lambda functions to create and write to log groups/streams.
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_cloudwatch" {
  name = "TapTrivia-CloudWatchLogs"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# DynamoDB Policy
# Grants full DynamoDB access to all TapTrivia-* tables and their indexes.
# A single broad policy keeps configuration simple while still scoping
# permissions to only TapTrivia resources.
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "TapTrivia-DynamoDB"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "dynamodb:*"
        Resource = [
          "arn:aws:dynamodb:*:*:table/TapTrivia-*",
          "arn:aws:dynamodb:*:*:table/TapTrivia-*/index/*"
        ]
      }
    ]
  })
}

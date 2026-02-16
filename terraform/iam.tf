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

# -----------------------------------------------------------------------------
# SES Policy
# Allows Lambda functions to send emails via SES for OTP and welcome emails.
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_ses" {
  name = "TapTrivia-SES"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "arn:aws:ses:us-east-1:*:identity/taptrivia.tv"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# S3 Logos Bucket Policy
# Allows Lambda functions to read/write bar logos in the logos bucket.
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_s3_logos" {
  name = "TapTrivia-S3-Logos"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::taptrivia-logos/*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Bedrock Policy
# Allows Lambda functions to invoke Titan Image Generator for logo processing.
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_bedrock" {
  name = "TapTrivia-Bedrock"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-image-generator-v2:0"
      }
    ]
  })
}

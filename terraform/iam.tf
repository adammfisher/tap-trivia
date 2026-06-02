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
  name = "${local.name_prefix}-LambdaExecutionRole"

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
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Logs Policy
# Allows all Lambda functions to create and write to log groups/streams.
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_cloudwatch" {
  name = "${local.name_prefix}-CloudWatchLogs"
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
  name = "${local.name_prefix}-DynamoDB"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "dynamodb:*"
        Resource = [
          "arn:aws:dynamodb:*:*:table/${local.name_prefix}-*",
          "arn:aws:dynamodb:*:*:table/${local.name_prefix}-*/index/*"
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
  name = "${local.name_prefix}-SES"
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
        Resource = "*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# S3 Logos Bucket Policy
# Allows Lambda functions to read/write bar logos in the logos bucket.
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_s3_logos" {
  name = "${local.name_prefix}-S3-Logos"
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
  name = "${local.name_prefix}-Bedrock"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        # Logo background removal uses the Stability "Stable Image Remove Background"
        # model. It is only invokable via the cross-region inference profile, which
        # also requires permission on the underlying foundation-model in each region
        # the profile can route to (us-east-1/us-east-2/us-west-2).
        Resource = [
          "arn:aws:bedrock:us-east-1:683032473658:inference-profile/us.stability.stable-image-remove-background-v1:0",
          "arn:aws:bedrock:us-east-1::foundation-model/stability.stable-image-remove-background-v1:0",
          "arn:aws:bedrock:us-east-2::foundation-model/stability.stable-image-remove-background-v1:0",
          "arn:aws:bedrock:us-west-2::foundation-model/stability.stable-image-remove-background-v1:0"
        ]
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# CloudFront Invalidation Policy
# Allows upload-logo Lambda to invalidate cached logos after replacement.
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_cloudfront" {
  name = "${local.name_prefix}-CloudFront"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = "arn:aws:cloudfront::*:distribution/*"
      }
    ]
  })
}

# SSM Parameter Store — game mode toggle
resource "aws_iam_role_policy" "lambda_ssm" {
  name = "${local.name_prefix}-SSM"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["ssm:GetParameter"]
        Resource = "arn:aws:ssm:${var.region}:*:parameter/taptrivia/prod/*"
      }
    ]
  })
}

# =============================================================================
# S3 Buckets for Tap Trivia
# =============================================================================
# Three buckets:
#   1. Lambda deployment artifacts (zip files)
#   2. Player web app (static SPA served via CloudFront)
#   3. TV web app (static SPA served via CloudFront)
# =============================================================================

# -----------------------------------------------------------------------------
# Data source: current AWS account ID (used in bucket policies)
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}

# =============================================================================
# 1. Lambda Deployment Bucket
# =============================================================================
resource "aws_s3_bucket" "lambda_deploy" {
  bucket = "tap-trivia-lambda-deploy"

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Purpose     = "Lambda deployment artifacts"
  }
}

# =============================================================================
# 2. Player Web App Bucket
# =============================================================================
resource "aws_s3_bucket" "player_app" {
  bucket = "tap-trivia-player-app"

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Purpose     = "Player web app static files"
  }
}

resource "aws_s3_bucket_public_access_block" "player_app" {
  bucket = aws_s3_bucket.player_app.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "player_app" {
  bucket = aws_s3_bucket.player_app.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_policy" "player_app" {
  bucket = aws_s3_bucket.player_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.player_app.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.player_app.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.player_app]
}

# =============================================================================
# 3. TV Web App Bucket
# =============================================================================
resource "aws_s3_bucket" "tv_app" {
  bucket = "tap-trivia-tv-app"

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    Purpose     = "TV web app static files"
  }
}

resource "aws_s3_bucket_public_access_block" "tv_app" {
  bucket = aws_s3_bucket.tv_app.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "tv_app" {
  bucket = aws_s3_bucket.tv_app.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_policy" "tv_app" {
  bucket = aws_s3_bucket.tv_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.tv_app.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.tv_app.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.tv_app]
}

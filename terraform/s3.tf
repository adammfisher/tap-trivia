# =============================================================================
# S3 Buckets for Tap Trivia (prod-only — skipped in dev workspace)
# =============================================================================

data "aws_caller_identity" "current" {}

# =============================================================================
# 1. Lambda Deployment Bucket
# =============================================================================
resource "aws_s3_bucket" "lambda_deploy" {
  count  = local.is_dev ? 0 : 1
  bucket = "tap-trivia-lambda-deploy"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Purpose     = "Lambda deployment artifacts"
  }
}

moved {
  from = aws_s3_bucket.lambda_deploy
  to   = aws_s3_bucket.lambda_deploy[0]
}

# =============================================================================
# 2. Player Web App Bucket
# =============================================================================
resource "aws_s3_bucket" "player_app" {
  count  = local.is_dev ? 0 : 1
  bucket = "tap-trivia-player-app"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Purpose     = "Player web app static files"
  }
}

moved {
  from = aws_s3_bucket.player_app
  to   = aws_s3_bucket.player_app[0]
}

resource "aws_s3_bucket_public_access_block" "player_app" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.player_app[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

moved {
  from = aws_s3_bucket_public_access_block.player_app
  to   = aws_s3_bucket_public_access_block.player_app[0]
}

resource "aws_s3_bucket_versioning" "player_app" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.player_app[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

moved {
  from = aws_s3_bucket_versioning.player_app
  to   = aws_s3_bucket_versioning.player_app[0]
}

resource "aws_s3_bucket_policy" "player_app" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.player_app[0].id

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
        Resource = "${aws_s3_bucket.player_app[0].arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.player_app[0].arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.player_app]
}

moved {
  from = aws_s3_bucket_policy.player_app
  to   = aws_s3_bucket_policy.player_app[0]
}

# =============================================================================
# 3. TV Web App Bucket
# =============================================================================
resource "aws_s3_bucket" "tv_app" {
  count  = local.is_dev ? 0 : 1
  bucket = "tap-trivia-tv-app"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Purpose     = "TV web app static files"
  }
}

moved {
  from = aws_s3_bucket.tv_app
  to   = aws_s3_bucket.tv_app[0]
}

resource "aws_s3_bucket_public_access_block" "tv_app" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.tv_app[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

moved {
  from = aws_s3_bucket_public_access_block.tv_app
  to   = aws_s3_bucket_public_access_block.tv_app[0]
}

resource "aws_s3_bucket_versioning" "tv_app" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.tv_app[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

moved {
  from = aws_s3_bucket_versioning.tv_app
  to   = aws_s3_bucket_versioning.tv_app[0]
}

resource "aws_s3_bucket_policy" "tv_app" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.tv_app[0].id

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
        Resource = "${aws_s3_bucket.tv_app[0].arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.tv_app[0].arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.tv_app]
}

moved {
  from = aws_s3_bucket_policy.tv_app
  to   = aws_s3_bucket_policy.tv_app[0]
}

# =============================================================================
# 4. Logos Bucket
# =============================================================================
resource "aws_s3_bucket" "logos" {
  count  = local.is_dev ? 0 : 1
  bucket = "taptrivia-logos"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Purpose     = "Bar logo images"
  }
}

moved {
  from = aws_s3_bucket.logos
  to   = aws_s3_bucket.logos[0]
}

resource "aws_s3_bucket_public_access_block" "logos" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.logos[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

moved {
  from = aws_s3_bucket_public_access_block.logos
  to   = aws_s3_bucket_public_access_block.logos[0]
}

resource "aws_s3_bucket_policy" "logos" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.logos[0].id

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
        Resource = "${aws_s3_bucket.logos[0].arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.tv_app[0].arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.logos]
}

moved {
  from = aws_s3_bucket_policy.logos
  to   = aws_s3_bucket_policy.logos[0]
}

# =============================================================================
# 5. Dashboard Web App Bucket
# =============================================================================
resource "aws_s3_bucket" "dashboard_app" {
  count  = local.is_dev ? 0 : 1
  bucket = "taptrivia-dashboard"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Purpose     = "Dashboard web app static files"
  }
}

moved {
  from = aws_s3_bucket.dashboard_app
  to   = aws_s3_bucket.dashboard_app[0]
}

resource "aws_s3_bucket_public_access_block" "dashboard_app" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.dashboard_app[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

moved {
  from = aws_s3_bucket_public_access_block.dashboard_app
  to   = aws_s3_bucket_public_access_block.dashboard_app[0]
}

resource "aws_s3_bucket_versioning" "dashboard_app" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.dashboard_app[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

moved {
  from = aws_s3_bucket_versioning.dashboard_app
  to   = aws_s3_bucket_versioning.dashboard_app[0]
}

resource "aws_s3_bucket_policy" "dashboard_app" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.dashboard_app[0].id

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
        Resource = "${aws_s3_bucket.dashboard_app[0].arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.dashboard_app[0].arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.dashboard_app]
}

moved {
  from = aws_s3_bucket_policy.dashboard_app
  to   = aws_s3_bucket_policy.dashboard_app[0]
}

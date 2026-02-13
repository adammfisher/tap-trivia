# =============================================================================
# CloudFront Distributions for Tap Trivia
# =============================================================================
# Two distributions serve the Player and TV single-page applications from S3.
# Origin Access Control (OAC) restricts S3 access to CloudFront only.
# Custom error responses redirect 403/404 to index.html for SPA client routing.
# =============================================================================

# -----------------------------------------------------------------------------
# Origin Access Control (shared by both distributions)
# -----------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "TapTrivia-S3-OAC"
  description                       = "OAC for Tap Trivia S3 origins"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# =============================================================================
# 1. Player App Distribution
# =============================================================================
resource "aws_cloudfront_distribution" "player_app" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "Tap Trivia - Player App"

  origin {
    domain_name              = aws_s3_bucket.player_app.bucket_regional_domain_name
    origin_id                = "S3-player-app"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  default_cache_behavior {
    target_origin_id       = "S3-player-app"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # AWS Managed CachingOptimized policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA routing: serve index.html for paths that don't match S3 objects
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    App         = "PlayerApp"
  }
}

# =============================================================================
# 2. TV App Distribution
# =============================================================================
resource "aws_cloudfront_distribution" "tv_app" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "Tap Trivia - TV App"

  origin {
    domain_name              = aws_s3_bucket.tv_app.bucket_regional_domain_name
    origin_id                = "S3-tv-app"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  default_cache_behavior {
    target_origin_id       = "S3-tv-app"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # AWS Managed CachingOptimized policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA routing: serve index.html for paths that don't match S3 objects
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
    App         = "TVApp"
  }
}

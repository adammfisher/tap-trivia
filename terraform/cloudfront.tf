# =============================================================================
# CloudFront Distributions for Tap Trivia (prod-only — skipped in dev workspace)
# =============================================================================

# -----------------------------------------------------------------------------
# Origin Access Control (shared by all distributions)
# -----------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  count                             = local.is_dev ? 0 : 1
  name                              = "TapTrivia-S3-OAC"
  description                       = "OAC for Tap Trivia S3 origins"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

moved {
  from = aws_cloudfront_origin_access_control.s3_oac
  to   = aws_cloudfront_origin_access_control.s3_oac[0]
}

# =============================================================================
# 1. Player App Distribution — play.taptrivia.tv → app.taptrivia.tv redirect
# =============================================================================
resource "aws_cloudfront_function" "play_redirect" {
  count   = local.is_dev ? 0 : 1
  name    = "play-to-app-redirect"
  runtime = "cloudfront-js-2.0"
  code    = <<-EOF
    function handler(event) {
      return {
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: { location: { value: 'https://app.taptrivia.tv' + event.request.uri } }
      };
    }
  EOF
}

resource "aws_cloudfront_distribution" "player_app" {
  count               = local.is_dev ? 0 : 1
  enabled             = true
  price_class         = "PriceClass_100"
  comment             = "Tap Trivia - play.taptrivia.tv → app.taptrivia.tv redirect"
  aliases             = ["play.taptrivia.tv"]

  # Dummy origin — CloudFront function handles all requests before reaching origin
  origin {
    domain_name              = aws_s3_bucket.player_app[0].bucket_regional_domain_name
    origin_id                = "S3-player-app"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac[0].id
  }

  default_cache_behavior {
    target_origin_id       = "S3-player-app"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.play_redirect[0].arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main[0].certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    App         = "PlayerApp"
  }
}

moved {
  from = aws_cloudfront_distribution.player_app
  to   = aws_cloudfront_distribution.player_app[0]
}

# =============================================================================
# 2. TV App Distribution
# =============================================================================
resource "aws_cloudfront_distribution" "tv_app" {
  count               = local.is_dev ? 0 : 1
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "Tap Trivia - TV App"
  aliases             = ["tv.taptrivia.tv"]

  origin {
    domain_name              = aws_s3_bucket.tv_app[0].bucket_regional_domain_name
    origin_id                = "S3-tv-app"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac[0].id
  }

  origin {
    domain_name              = aws_s3_bucket.logos[0].bucket_regional_domain_name
    origin_id                = "S3-logos"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac[0].id
  }

  default_cache_behavior {
    target_origin_id       = "S3-tv-app"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  ordered_cache_behavior {
    path_pattern           = "/logos/*"
    target_origin_id       = "S3-logos"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

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
    acm_certificate_arn      = aws_acm_certificate_validation.main[0].certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    App         = "TVApp"
  }
}

moved {
  from = aws_cloudfront_distribution.tv_app
  to   = aws_cloudfront_distribution.tv_app[0]
}

# =============================================================================
# 3. Dashboard App Distribution
# =============================================================================
resource "aws_cloudfront_distribution" "dashboard_app" {
  count               = local.is_dev ? 0 : 1
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "Tap Trivia - Dashboard App"
  aliases             = ["admin.taptrivia.tv"]

  origin {
    domain_name              = aws_s3_bucket.dashboard_app[0].bucket_regional_domain_name
    origin_id                = "S3-dashboard-app"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac[0].id
  }

  default_cache_behavior {
    target_origin_id       = "S3-dashboard-app"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

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
    acm_certificate_arn      = aws_acm_certificate_validation.main[0].certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    App         = "DashboardApp"
  }
}

moved {
  from = aws_cloudfront_distribution.dashboard_app
  to   = aws_cloudfront_distribution.dashboard_app[0]
}

# =============================================================================
# 4. App Redirect Distribution (app.taptrivia.tv)
# =============================================================================
resource "aws_cloudfront_distribution" "app_redirect" {
  count               = local.is_dev ? 0 : 1
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "Tap Trivia - App Store Redirect"
  aliases             = ["app.taptrivia.tv"]

  origin {
    domain_name              = aws_s3_bucket.app_redirect[0].bucket_regional_domain_name
    origin_id                = "S3-app-redirect"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac[0].id
  }

  default_cache_behavior {
    target_origin_id       = "S3-app-redirect"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

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
    acm_certificate_arn      = aws_acm_certificate_validation.main[0].certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    App         = "AppRedirect"
  }
}

# =============================================================================
# 5. taptrivia.tv → www.taptrivia.tv redirect
# =============================================================================
resource "aws_cloudfront_function" "taptrivia_tv_redirect" {
  count   = local.is_dev ? 0 : 1
  name    = "taptrivia-tv-to-com-redirect"
  runtime = "cloudfront-js-2.0"
  code    = <<-EOF
    function handler(event) {
      return {
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: { location: { value: 'https://www.taptrivia.tv' + event.request.uri } }
      };
    }
  EOF
}

resource "aws_cloudfront_distribution" "taptrivia_tv_redirect" {
  count               = local.is_dev ? 0 : 1
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "taptrivia.tv → www.taptrivia.tv redirect"
  aliases             = ["taptrivia.tv"]

  # Dummy origin — CloudFront function handles all requests before reaching origin
  origin {
    domain_name              = aws_s3_bucket.player_app[0].bucket_regional_domain_name
    origin_id                = "S3-dummy"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac[0].id
  }

  default_cache_behavior {
    target_origin_id       = "S3-dummy"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.taptrivia_tv_redirect[0].arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main[0].certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    App         = "TapTriviaTV-Redirect"
  }
}

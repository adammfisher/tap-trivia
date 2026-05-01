# =============================================================================
# Phase 7 — analytics frontend hosting (analytics.taptrivia.tv)
# =============================================================================
# Operator-only console. Lives on its own subdomain so it can NEVER share
# CORS, cookies, JWT scope, or routing with the bar-owner dashboard at
# admin.taptrivia.tv (different product, different audience).
#
# Reuses:
#   - the existing wildcard cert *.taptrivia.tv
#   - the existing Tap Trivia OAC (aws_cloudfront_origin_access_control.s3_oac)
#   - the existing Route 53 hosted zone for taptrivia.tv
# =============================================================================

# -----------------------------------------------------------------------------
# S3 bucket — private; only the CloudFront OAC has access.
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "analytics_frontend" {
  count  = local.is_dev ? 0 : 1
  bucket = "taptrivia-analytics"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    App         = "AnalyticsFrontend"
  }
}

resource "aws_s3_bucket_public_access_block" "analytics_frontend" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.analytics_frontend[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "analytics_frontend" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.analytics_frontend[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# -----------------------------------------------------------------------------
# CloudFront distribution
# -----------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "analytics_frontend" {
  count               = local.is_dev ? 0 : 1
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "Tap Trivia - Analytics (Operator Console)"
  aliases             = ["analytics.taptrivia.tv"]

  origin {
    domain_name              = aws_s3_bucket.analytics_frontend[0].bucket_regional_domain_name
    origin_id                = "S3-analytics-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac[0].id
  }

  default_cache_behavior {
    target_origin_id       = "S3-analytics-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    # AWS-managed CachingOptimized policy — same as player/tv apps.
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA routing: 403/404 on missing keys → serve index.html with 200 so
  # client-side handling can take over.
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
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main[0].certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    App         = "AnalyticsFrontend"
  }
}

# -----------------------------------------------------------------------------
# S3 bucket policy — only the CF distribution above can read.
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_policy" "analytics_frontend" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.analytics_frontend[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipalReadOnly"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = ["s3:GetObject"]
      Resource  = "${aws_s3_bucket.analytics_frontend[0].arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.analytics_frontend[0].arn
        }
      }
    }]
  })
}

# -----------------------------------------------------------------------------
# Route 53 alias
# -----------------------------------------------------------------------------
resource "aws_route53_record" "analytics_frontend" {
  count   = local.is_dev ? 0 : 1
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "analytics.taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.analytics_frontend[0].domain_name
    zone_id                = aws_cloudfront_distribution.analytics_frontend[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "analytics_frontend_url" {
  value = local.is_dev ? null : "https://analytics.taptrivia.tv"
}

output "analytics_frontend_cf_dist_id" {
  value = local.is_dev ? null : aws_cloudfront_distribution.analytics_frontend[0].id
}

output "analytics_frontend_bucket" {
  value = local.is_dev ? null : aws_s3_bucket.analytics_frontend[0].bucket
}

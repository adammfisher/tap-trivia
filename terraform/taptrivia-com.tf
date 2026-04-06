# =============================================================================
# www.taptrivia.tv — Marketing Website Infrastructure (prod-only)
# =============================================================================
# Uses existing taptrivia.tv Route 53 zone and ACM wildcard cert.
# taptrivia.tv apex redirects to www.taptrivia.tv (handled in cloudfront.tf).
# =============================================================================

# -----------------------------------------------------------------------------
# S3 Bucket — www.taptrivia.tv
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "www_taptrivia_tv" {
  count  = local.is_dev ? 0 : 1
  bucket = "www-taptrivia-tv"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Purpose     = "Marketing website"
  }
}

resource "aws_s3_bucket_public_access_block" "www_taptrivia_tv" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.www_taptrivia_tv[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "www_taptrivia_tv" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.www_taptrivia_tv[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.www_taptrivia_tv[0].arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.www_taptrivia_tv[0].arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.www_taptrivia_tv]
}

# -----------------------------------------------------------------------------
# CloudFront Distribution — www.taptrivia.tv
# -----------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "www_taptrivia_tv" {
  count               = local.is_dev ? 0 : 1
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "TapTrivia Marketing Site — www.taptrivia.tv"
  aliases             = ["www.taptrivia.tv"]

  origin {
    domain_name              = aws_s3_bucket.www_taptrivia_tv[0].bucket_regional_domain_name
    origin_id                = "S3-www-taptrivia-tv"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac[0].id
  }

  default_cache_behavior {
    target_origin_id       = "S3-www-taptrivia-tv"
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
    App         = "MarketingSite"
  }
}

# -----------------------------------------------------------------------------
# DNS Record — www.taptrivia.tv
# -----------------------------------------------------------------------------
resource "aws_route53_record" "www_taptrivia_tv" {
  count   = local.is_dev ? 0 : 1
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.www_taptrivia_tv[0].domain_name
    zone_id                = aws_cloudfront_distribution.www_taptrivia_tv[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "www_taptrivia_tv_cf_dist_id" {
  description = "CloudFront distribution ID for www.taptrivia.tv"
  value       = local.is_dev ? "" : aws_cloudfront_distribution.www_taptrivia_tv[0].id
}

# =============================================================================
# taptrivia.com — Marketing Website Infrastructure (prod-only)
# =============================================================================
# Route 53 hosted zone, ACM cert, S3 bucket, CloudFront, DNS records.
# The apex (taptrivia.com) redirects to www.taptrivia.com via CloudFront function.
# =============================================================================

# -----------------------------------------------------------------------------
# Route 53 Hosted Zone for taptrivia.com
# -----------------------------------------------------------------------------
resource "aws_route53_zone" "taptrivia_com" {
  count = local.is_dev ? 0 : 1
  name  = "taptrivia.com"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

# -----------------------------------------------------------------------------
# ACM Certificate for taptrivia.com + *.taptrivia.com
# -----------------------------------------------------------------------------
resource "aws_acm_certificate" "taptrivia_com" {
  count                     = local.is_dev ? 0 : 1
  domain_name               = "taptrivia.com"
  subject_alternative_names = ["*.taptrivia.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

resource "aws_route53_record" "taptrivia_com_cert_validation" {
  for_each = local.is_dev ? {} : {
    for dvo in aws_acm_certificate.taptrivia_com[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.taptrivia_com[0].zone_id
}

resource "aws_acm_certificate_validation" "taptrivia_com" {
  count                   = local.is_dev ? 0 : 1
  certificate_arn         = aws_acm_certificate.taptrivia_com[0].arn
  validation_record_fqdns = [for record in aws_route53_record.taptrivia_com_cert_validation : record.fqdn]
}

# -----------------------------------------------------------------------------
# S3 Bucket — www.taptrivia.com
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "www_taptrivia_com" {
  count  = local.is_dev ? 0 : 1
  bucket = "www.taptrivia.com"

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Purpose     = "Marketing website"
  }
}

resource "aws_s3_bucket_public_access_block" "www_taptrivia_com" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.www_taptrivia_com[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "www_taptrivia_com" {
  count  = local.is_dev ? 0 : 1
  bucket = aws_s3_bucket.www_taptrivia_com[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.www_taptrivia_com[0].arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.www_taptrivia_com[0].arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.www_taptrivia_com]
}

# -----------------------------------------------------------------------------
# CloudFront Function — Apex redirect taptrivia.com → www.taptrivia.com
# -----------------------------------------------------------------------------
resource "aws_cloudfront_function" "apex_redirect" {
  count   = local.is_dev ? 0 : 1
  name    = "taptrivia-com-apex-redirect"
  runtime = "cloudfront-js-2.0"
  code    = <<-EOF
    function handler(event) {
      var host = event.request.headers.host.value;
      if (host === 'taptrivia.com') {
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: { location: { value: 'https://www.taptrivia.com' + event.request.uri } }
        };
      }
      return event.request;
    }
  EOF
}

# -----------------------------------------------------------------------------
# CloudFront Distribution — www.taptrivia.com (+ apex for redirect)
# -----------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "www_taptrivia_com" {
  count               = local.is_dev ? 0 : 1
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "TapTrivia Marketing Site — www.taptrivia.com"
  aliases             = ["www.taptrivia.com", "taptrivia.com"]

  origin {
    domain_name              = aws_s3_bucket.www_taptrivia_com[0].bucket_regional_domain_name
    origin_id                = "S3-www-taptrivia-com"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac[0].id
  }

  default_cache_behavior {
    target_origin_id       = "S3-www-taptrivia-com"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.apex_redirect[0].arn
    }
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
    acm_certificate_arn      = aws_acm_certificate_validation.taptrivia_com[0].certificate_arn
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
# DNS Records
# -----------------------------------------------------------------------------
resource "aws_route53_record" "www_taptrivia_com" {
  count   = local.is_dev ? 0 : 1
  zone_id = aws_route53_zone.taptrivia_com[0].zone_id
  name    = "www.taptrivia.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.www_taptrivia_com[0].domain_name
    zone_id                = aws_cloudfront_distribution.www_taptrivia_com[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "taptrivia_com_apex" {
  count   = local.is_dev ? 0 : 1
  zone_id = aws_route53_zone.taptrivia_com[0].zone_id
  name    = "taptrivia.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.www_taptrivia_com[0].domain_name
    zone_id                = aws_cloudfront_distribution.www_taptrivia_com[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "taptrivia_com_nameservers" {
  description = "Nameservers for taptrivia.com — update at your domain registrar"
  value       = local.is_dev ? [] : aws_route53_zone.taptrivia_com[0].name_servers
}

output "www_taptrivia_com_cf_dist_id" {
  description = "CloudFront distribution ID for www.taptrivia.com"
  value       = local.is_dev ? "" : aws_cloudfront_distribution.www_taptrivia_com[0].id
}

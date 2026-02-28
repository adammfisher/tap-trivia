# =============================================================================
# DNS & TLS for taptrivia.tv
# =============================================================================
# Route 53 hosted zone (auto-created by domain registration),
# ACM wildcard certificate with DNS validation, API Gateway custom domain,
# and alias records for all subdomains.
# =============================================================================

# -----------------------------------------------------------------------------
# Route 53 Hosted Zone (data source — created by domain registration)
# -----------------------------------------------------------------------------
data "aws_route53_zone" "main" {
  name = "taptrivia.tv"
}

# -----------------------------------------------------------------------------
# ACM Certificate — wildcard + root domain
# -----------------------------------------------------------------------------
resource "aws_acm_certificate" "main" {
  domain_name               = "taptrivia.tv"
  subject_alternative_names = ["*.taptrivia.tv"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
  }
}

# -----------------------------------------------------------------------------
# DNS Validation Records
# -----------------------------------------------------------------------------
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
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
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# -----------------------------------------------------------------------------
# API Gateway Custom Domain
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.taptrivia.tv"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.main.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = {
    Environment = var.stage
    Project     = "TapTrivia"
  }
}

resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}

# -----------------------------------------------------------------------------
# DNS Records — CloudFront Aliases
# -----------------------------------------------------------------------------

# play.taptrivia.tv → Player App CloudFront
resource "aws_route53_record" "player_app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "play.taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.player_app.domain_name
    zone_id                = aws_cloudfront_distribution.player_app.hosted_zone_id
    evaluate_target_health = false
  }
}

# taptrivia.tv (root) → Player App CloudFront
resource "aws_route53_record" "root" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.player_app.domain_name
    zone_id                = aws_cloudfront_distribution.player_app.hosted_zone_id
    evaluate_target_health = false
  }
}

# tv.taptrivia.tv → TV App CloudFront
resource "aws_route53_record" "tv_app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "tv.taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.tv_app.domain_name
    zone_id                = aws_cloudfront_distribution.tv_app.hosted_zone_id
    evaluate_target_health = false
  }
}

# api.taptrivia.tv → API Gateway
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# admin.taptrivia.tv → Dashboard App CloudFront
resource "aws_route53_record" "dashboard_app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "admin.taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.dashboard_app.domain_name
    zone_id                = aws_cloudfront_distribution.dashboard_app.hosted_zone_id
    evaluate_target_health = false
  }
}

# =============================================================================
# SES Configuration for taptrivia.tv
# =============================================================================

resource "aws_ses_domain_identity" "taptrivia" {
  domain = "taptrivia.tv"
}

resource "aws_ses_domain_dkim" "taptrivia" {
  domain = aws_ses_domain_identity.taptrivia.domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${aws_ses_domain_dkim.taptrivia.dkim_tokens[count.index]}._domainkey.taptrivia.tv"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.taptrivia.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_ses_domain_mail_from" "taptrivia" {
  domain           = aws_ses_domain_identity.taptrivia.domain
  mail_from_domain = "mail.taptrivia.tv"
}

resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "mail.taptrivia.tv"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.us-east-1.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "mail.taptrivia.tv"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

resource "aws_route53_record" "dmarc" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "_dmarc.taptrivia.tv"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=none; rua=mailto:dmarc@taptrivia.tv"]
}

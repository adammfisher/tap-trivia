# =============================================================================
# DNS & TLS for taptrivia.tv (prod-only — skipped in dev workspace)
# =============================================================================

# -----------------------------------------------------------------------------
# Route 53 Hosted Zone (data source — always available, read-only)
# -----------------------------------------------------------------------------
data "aws_route53_zone" "main" {
  name = "taptrivia.tv"
}

# -----------------------------------------------------------------------------
# ACM Certificate — wildcard + root domain
# -----------------------------------------------------------------------------
resource "aws_acm_certificate" "main" {
  count                     = local.is_dev ? 0 : 1
  domain_name               = "taptrivia.tv"
  subject_alternative_names = ["*.taptrivia.tv"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

moved {
  from = aws_acm_certificate.main
  to   = aws_acm_certificate.main[0]
}

# -----------------------------------------------------------------------------
# DNS Validation Records
# -----------------------------------------------------------------------------
resource "aws_route53_record" "cert_validation" {
  for_each = local.is_dev ? {} : {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
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
  count                   = local.is_dev ? 0 : 1
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

moved {
  from = aws_acm_certificate_validation.main
  to   = aws_acm_certificate_validation.main[0]
}

# -----------------------------------------------------------------------------
# API Gateway Custom Domain
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_domain_name" "api" {
  count       = local.is_dev ? 0 : 1
  domain_name = "api.taptrivia.tv"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.main[0].certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

moved {
  from = aws_apigatewayv2_domain_name.api
  to   = aws_apigatewayv2_domain_name.api[0]
}

resource "aws_apigatewayv2_api_mapping" "api" {
  count       = local.is_dev ? 0 : 1
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.api[0].id
  stage       = aws_apigatewayv2_stage.default.id
}

moved {
  from = aws_apigatewayv2_api_mapping.api
  to   = aws_apigatewayv2_api_mapping.api[0]
}

# -----------------------------------------------------------------------------
# DNS Records — CloudFront Aliases
# -----------------------------------------------------------------------------

resource "aws_route53_record" "player_app" {
  count   = local.is_dev ? 0 : 1
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "play.taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.player_app[0].domain_name
    zone_id                = aws_cloudfront_distribution.player_app[0].hosted_zone_id
    evaluate_target_health = false
  }
}

moved {
  from = aws_route53_record.player_app
  to   = aws_route53_record.player_app[0]
}

resource "aws_route53_record" "root" {
  count   = local.is_dev ? 0 : 1
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.taptrivia_tv_redirect[0].domain_name
    zone_id                = aws_cloudfront_distribution.taptrivia_tv_redirect[0].hosted_zone_id
    evaluate_target_health = false
  }
}

moved {
  from = aws_route53_record.root
  to   = aws_route53_record.root[0]
}

resource "aws_route53_record" "tv_app" {
  count   = local.is_dev ? 0 : 1
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "tv.taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.tv_app[0].domain_name
    zone_id                = aws_cloudfront_distribution.tv_app[0].hosted_zone_id
    evaluate_target_health = false
  }
}

moved {
  from = aws_route53_record.tv_app
  to   = aws_route53_record.tv_app[0]
}

resource "aws_route53_record" "api" {
  count   = local.is_dev ? 0 : 1
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api[0].domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api[0].domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

moved {
  from = aws_route53_record.api
  to   = aws_route53_record.api[0]
}

resource "aws_route53_record" "dashboard_app" {
  count   = local.is_dev ? 0 : 1
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "admin.taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.dashboard_app[0].domain_name
    zone_id                = aws_cloudfront_distribution.dashboard_app[0].hosted_zone_id
    evaluate_target_health = false
  }
}

moved {
  from = aws_route53_record.dashboard_app
  to   = aws_route53_record.dashboard_app[0]
}

# app.taptrivia.tv → App Redirect CloudFront
resource "aws_route53_record" "app_redirect" {
  count   = local.is_dev ? 0 : 1
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.taptrivia.tv"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.app_redirect[0].domain_name
    zone_id                = aws_cloudfront_distribution.app_redirect[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# =============================================================================
# SES Configuration for taptrivia.tv
# =============================================================================

resource "aws_ses_domain_identity" "taptrivia" {
  count  = local.is_dev ? 0 : 1
  domain = "taptrivia.tv"
}

moved {
  from = aws_ses_domain_identity.taptrivia
  to   = aws_ses_domain_identity.taptrivia[0]
}

resource "aws_ses_domain_dkim" "taptrivia" {
  count  = local.is_dev ? 0 : 1
  domain = aws_ses_domain_identity.taptrivia[0].domain
}

moved {
  from = aws_ses_domain_dkim.taptrivia
  to   = aws_ses_domain_dkim.taptrivia[0]
}

resource "aws_route53_record" "ses_dkim" {
  count   = local.is_dev ? 0 : 3
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${aws_ses_domain_dkim.taptrivia[0].dkim_tokens[count.index]}._domainkey.taptrivia.tv"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.taptrivia[0].dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_ses_domain_mail_from" "taptrivia" {
  count            = local.is_dev ? 0 : 1
  domain           = aws_ses_domain_identity.taptrivia[0].domain
  mail_from_domain = "mail.taptrivia.tv"
}

moved {
  from = aws_ses_domain_mail_from.taptrivia
  to   = aws_ses_domain_mail_from.taptrivia[0]
}

resource "aws_route53_record" "ses_mail_from_mx" {
  count   = local.is_dev ? 0 : 1
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "mail.taptrivia.tv"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.us-east-1.amazonses.com"]
}

moved {
  from = aws_route53_record.ses_mail_from_mx
  to   = aws_route53_record.ses_mail_from_mx[0]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  count   = local.is_dev ? 0 : 1
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "mail.taptrivia.tv"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

moved {
  from = aws_route53_record.ses_mail_from_spf
  to   = aws_route53_record.ses_mail_from_spf[0]
}

resource "aws_route53_record" "dmarc" {
  count   = local.is_dev ? 0 : 1
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "_dmarc.taptrivia.tv"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=none; rua=mailto:dmarc@taptrivia.tv"]
}

moved {
  from = aws_route53_record.dmarc
  to   = aws_route53_record.dmarc[0]
}

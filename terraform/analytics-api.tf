# =============================================================================
# Phase 6 — analytics-api Lambda + Cognito admin auth
# =============================================================================
# - Cognito User Pool TapTrivia-AdminPool (operator-only, no self-signup)
# - App Client TapTrivia-AdminWebClient (no secret, implicit + auth-code)
# - analytics-api Lambda (Python 3.12, 512MB, 10s)
# - JWT authorizer on the existing TapTrivia API for /analytics/*
# - 9 API routes: 8 GETs + POST /analytics/refresh
# - CORS update on the existing API to allow https://admin.taptrivia.tv
# - IAM additions on the shared lambda role: Lambda:InvokeFunction on
#   analytics-sync (for the refresh endpoint)
#
# adam@visudolabs.com is provisioned via AWS CLI after `terraform apply`.
# =============================================================================

# -----------------------------------------------------------------------------
# Cognito User Pool — operator-only, no self-signup
# -----------------------------------------------------------------------------
resource "aws_cognito_user_pool" "admin" {
  name = "${local.name_prefix}-AdminPool"

  # Email serves as the username — no separate username field.
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 12
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  mfa_configuration = "OPTIONAL"
  software_token_mfa_configuration {
    enabled = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  # Passwordless email-OTP sign-in via custom auth challenge triggers.
  lambda_config {
    define_auth_challenge          = aws_lambda_function.analytics_auth_define.arn
    create_auth_challenge          = aws_lambda_function.analytics_auth_create.arn
    verify_auth_challenge_response = aws_lambda_function.analytics_auth_verify.arn
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    mutable             = true
    required            = true
    string_attribute_constraints {
      min_length = 5
      max_length = 256
    }
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

resource "aws_cognito_user_pool_client" "admin_web" {
  name         = "${local.name_prefix}-AdminWebClient"
  user_pool_id = aws_cognito_user_pool.admin.id

  generate_secret = false

  allowed_oauth_flows                  = ["implicit", "code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = ["https://analytics.taptrivia.tv", "https://analytics.taptrivia.tv/"]
  logout_urls                          = ["https://analytics.taptrivia.tv", "https://analytics.taptrivia.tv/"]
  supported_identity_providers         = ["COGNITO"]

  explicit_auth_flows = [
    "ALLOW_CUSTOM_AUTH",         # passwordless email-OTP sign-in
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED"
}

resource "aws_cognito_user_pool_domain" "admin" {
  domain       = "taptrivia-admin"
  user_pool_id = aws_cognito_user_pool.admin.id
}

# -----------------------------------------------------------------------------
# IAM addition — analytics-api needs to invoke analytics-sync (refresh endpoint)
# DynamoDB read access is already covered by the existing
# TapTrivia-DynamoDB inline policy (full access to TapTrivia-* tables).
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_invoke_analytics_sync" {
  name = "${local.name_prefix}-InvokeAnalyticsSync"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["lambda:InvokeFunction"]
      Resource = aws_lambda_function.analytics_sync.arn
    }]
  })
}

# -----------------------------------------------------------------------------
# analytics-api Lambda
# -----------------------------------------------------------------------------
data "archive_file" "analytics_api" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/analytics-api"
  output_path = "${path.module}/zip/analytics-api.zip"
}

resource "aws_lambda_function" "analytics_api" {
  function_name    = "${local.name_prefix}-analytics-api"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "lambda_function.handler"
  runtime          = "python3.12"
  memory_size      = 512
  timeout          = 10
  filename         = data.archive_file.analytics_api.output_path
  source_code_hash = data.archive_file.analytics_api.output_base64sha256

  environment {
    variables = {
      TABLE_ANALYTICS_CACHE     = "TapTrivia-AnalyticsCache"
      TABLE_BARS                = "TapTrivia-Bars"
      TABLE_PLAYERS             = "TapTrivia-Players"
      TABLE_ANSWERS             = "TapTrivia-Answers"
      TABLE_TV_PAIRINGS         = "TapTrivia-TvPairings"
      TABLE_SIGNAGE_IMPRESSIONS = "TapTrivia-SignageImpressions"
      ANALYTICS_SYNC_FUNCTION   = aws_lambda_function.analytics_sync.function_name
      ALLOWED_ORIGIN            = "https://analytics.taptrivia.tv"
    }
  }

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
    Function    = "analytics-api"
  }
}

resource "aws_cloudwatch_log_group" "analytics_api" {
  name              = "/aws/lambda/${aws_lambda_function.analytics_api.function_name}"
  retention_in_days = 30

  tags = {
    Environment = local.stage
    Project     = "TapTrivia"
  }
}

resource "aws_lambda_permission" "analytics_api_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.analytics_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# -----------------------------------------------------------------------------
# JWT authorizer + integration + 9 routes on the existing TapTrivia API
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_authorizer" "admin_jwt" {
  api_id           = aws_apigatewayv2_api.main.id
  name             = "${local.name_prefix}-AdminJWT"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.admin_web.id]
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.admin.id}"
  }
}

resource "aws_apigatewayv2_integration" "analytics_api" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.analytics_api.invoke_arn
  payload_format_version = "2.0"
}

locals {
  analytics_routes = {
    overview     = "GET /analytics/overview"
    subscribers  = "GET /analytics/subscribers"
    bars         = "GET /analytics/bars"
    bar_drill    = "GET /analytics/bars/{barCode}"
    signage      = "GET /analytics/signage"
    finance      = "GET /analytics/finance"
    questions    = "GET /analytics/questions"
    aws          = "GET /analytics/aws"
    refresh      = "POST /analytics/refresh"
  }
}

resource "aws_apigatewayv2_route" "analytics" {
  for_each = local.analytics_routes

  api_id             = aws_apigatewayv2_api.main.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.analytics_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.admin_jwt.id
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.admin.id
}

output "cognito_app_client_id" {
  value = aws_cognito_user_pool_client.admin_web.id
}

output "cognito_issuer" {
  value = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.admin.id}"
}

output "analytics_api_function" {
  value = aws_lambda_function.analytics_api.function_name
}

# -----------------------------------------------------------------------------
# Cognito custom-auth triggers — passwordless email-OTP sign-in
# Three Node Lambdas wired to the admin pool's lambda_config. They reuse the
# shared lambda_execution role (already has CloudWatch Logs + ses:SendEmail).
# -----------------------------------------------------------------------------
locals {
  analytics_auth_triggers = {
    define = "analytics-auth-define"
    create = "analytics-auth-create"
    verify = "analytics-auth-verify"
  }
}

data "archive_file" "analytics_auth" {
  for_each    = local.analytics_auth_triggers
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/${each.value}"
  output_path = "${path.module}/zip/${each.value}.zip"
}

resource "aws_lambda_function" "analytics_auth_define" {
  function_name    = "${local.name_prefix}-analytics-auth-define"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 5
  filename         = data.archive_file.analytics_auth["define"].output_path
  source_code_hash = data.archive_file.analytics_auth["define"].output_base64sha256
}

resource "aws_lambda_function" "analytics_auth_create" {
  function_name    = "${local.name_prefix}-analytics-auth-create"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.analytics_auth["create"].output_path
  source_code_hash = data.archive_file.analytics_auth["create"].output_base64sha256
}

resource "aws_lambda_function" "analytics_auth_verify" {
  function_name    = "${local.name_prefix}-analytics-auth-verify"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 5
  filename         = data.archive_file.analytics_auth["verify"].output_path
  source_code_hash = data.archive_file.analytics_auth["verify"].output_base64sha256
}

# Allow Cognito to invoke each trigger.
resource "aws_lambda_permission" "analytics_auth_define" {
  statement_id  = "AllowCognitoInvokeDefine"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.analytics_auth_define.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.admin.arn
}

resource "aws_lambda_permission" "analytics_auth_create" {
  statement_id  = "AllowCognitoInvokeCreate"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.analytics_auth_create.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.admin.arn
}

resource "aws_lambda_permission" "analytics_auth_verify" {
  statement_id  = "AllowCognitoInvokeVerify"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.analytics_auth_verify.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.admin.arn
}

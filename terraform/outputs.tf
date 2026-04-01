output "api_url" {
  description = "The API Gateway invoke URL"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "player_cf_domain" {
  description = "Player app CloudFront domain name"
  value       = local.is_dev ? "" : aws_cloudfront_distribution.player_app[0].domain_name
}

output "player_cf_dist_id" {
  description = "Player app CloudFront distribution ID"
  value       = local.is_dev ? "" : aws_cloudfront_distribution.player_app[0].id
}

output "tv_cf_domain" {
  description = "TV app CloudFront domain name"
  value       = local.is_dev ? "" : aws_cloudfront_distribution.tv_app[0].domain_name
}

output "tv_cf_dist_id" {
  description = "TV app CloudFront distribution ID"
  value       = local.is_dev ? "" : aws_cloudfront_distribution.tv_app[0].id
}

output "generate_games_function" {
  description = "generate-games Lambda function name"
  value       = aws_lambda_function.generate_games.function_name
}

output "player_app_url" {
  description = "Player app custom domain URL"
  value       = local.is_dev ? "" : "https://play.taptrivia.tv"
}

output "tv_app_url" {
  description = "TV app custom domain URL"
  value       = local.is_dev ? "" : "https://tv.taptrivia.tv"
}

output "api_custom_url" {
  description = "API custom domain URL"
  value       = local.is_dev ? aws_apigatewayv2_stage.default.invoke_url : "https://api.taptrivia.tv"
}

output "root_url" {
  description = "Root domain URL"
  value       = local.is_dev ? "" : "https://taptrivia.tv"
}

output "dashboard_cf_domain" {
  description = "Dashboard app CloudFront domain name"
  value       = local.is_dev ? "" : aws_cloudfront_distribution.dashboard_app[0].domain_name
}

output "dashboard_cf_dist_id" {
  description = "Dashboard app CloudFront distribution ID"
  value       = local.is_dev ? "" : aws_cloudfront_distribution.dashboard_app[0].id
}

output "dashboard_app_url" {
  description = "Dashboard app custom domain URL"
  value       = local.is_dev ? "" : "https://admin.taptrivia.tv"
}

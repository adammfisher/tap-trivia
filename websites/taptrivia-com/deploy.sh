#!/bin/bash
set -e

S3_BUCKET="www.taptrivia.com"
CF_DISTRIBUTION_ID="FILL_AFTER_TERRAFORM"
AWS_PROFILE="default"
AWS_REGION="us-east-1"

echo "Building..."
npm run build

echo "Deploying to S3..."
aws s3 sync dist/ s3://$S3_BUCKET \
  --delete \
  --profile $AWS_PROFILE \
  --region $AWS_REGION

echo "Setting cache headers for index.html..."
aws s3 cp s3://$S3_BUCKET/index.html s3://$S3_BUCKET/index.html \
  --cache-control "max-age=60" \
  --content-type "text/html" \
  --metadata-directive REPLACE \
  --profile $AWS_PROFILE \
  --region $AWS_REGION

echo "Invalidating CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id $CF_DISTRIBUTION_ID \
  --paths "/*" \
  --profile $AWS_PROFILE \
  --region $AWS_REGION

echo "Done!"

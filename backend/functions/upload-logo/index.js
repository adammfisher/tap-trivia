'use strict';

const crypto = require('crypto');
const { TABLE, update } = require('./shared/dynamo');
const { authenticate, unauthorized } = require('./shared/auth');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const s3 = new S3Client({ region: 'us-east-1' });
const cloudfront = new CloudFrontClient({ region: 'us-east-1' });

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const VALID_CONTENT_TYPES = ['image/png', 'image/jpeg'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const LOGO_BUCKET = 'taptrivia-logos';
const LOGO_CDN = 'https://tv.taptrivia.tv';
const TV_CF_DIST_ID = 'EYJ9U9RQEM3MS';

exports.handler = async (event) => {
  try {
    const bar = await authenticate(event);
    if (!bar) return unauthorized();

    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { image, removeBackground } = body || {};
    const contentType = body.contentType || body.mimeType;

    // Validate input
    if (!image || typeof image !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Base64-encoded image data is required', statusCode: 400 })
      };
    }

    if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'contentType must be image/png or image/jpeg', statusCode: 400 })
      };
    }

    const imageBuffer = Buffer.from(image, 'base64');
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Image must be less than 5MB', statusCode: 400 })
      };
    }

    // Optionally call Bedrock Titan for background removal
    let processedImageBase64 = image;
    if (removeBackground !== false) {
      try {
        const command = new InvokeModelCommand({
          modelId: 'amazon.titan-image-generator-v2:0',
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            taskType: 'BACKGROUND_REMOVAL',
            backgroundRemovalParams: {
              image: image
            }
          })
        });

        const response = await bedrock.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        processedImageBase64 = result.images[0];
      } catch (bedrockErr) {
        console.error('Bedrock background removal failed:', bedrockErr);
        const msg = bedrockErr.message || '';
        if (msg.includes('too short') || msg.includes('Min image length')) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'IMAGE_TOO_SMALL', message: 'Image is too small. Please use an image at least 256x256 pixels.', statusCode: 400 })
          };
        }
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'PROCESSING_FAILED', message: 'Background removal failed. Try a larger or different image.', statusCode: 500 })
        };
      }
    }

    // Upload to S3 (overwrites existing logo for this bar)
    const processedBuffer = Buffer.from(processedImageBase64, 'base64');
    const logoHash = crypto.createHash('md5').update(processedBuffer).digest('hex');
    const key = `logos/${bar.barCode}.png`;

    await s3.send(new PutObjectCommand({
      Bucket: LOGO_BUCKET,
      Key: key,
      Body: processedBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=86400'
    }));

    // Invalidate CloudFront cache for this logo
    try {
      await cloudfront.send(new CreateInvalidationCommand({
        DistributionId: TV_CF_DIST_ID,
        InvalidationBatch: {
          CallerReference: `logo-${bar.barCode}-${Date.now()}`,
          Paths: {
            Quantity: 1,
            Items: [`/${key}`]
          }
        }
      }));
      console.log('CloudFront invalidation created for:', key);
    } catch (cfErr) {
      // Non-fatal — logo will still update when cache expires
      console.error('CloudFront invalidation failed (non-fatal):', cfErr.message);
    }

    // Update bar record
    const logoUrl = `${LOGO_CDN}/${key}`;
    await update(
      TABLE.BARS,
      { PK: `BAR#${bar.barCode}` },
      'SET logoUrl = :url, logoHash = :hash, logoUpdatedAt = :t',
      { ':url': logoUrl, ':hash': logoHash, ':t': new Date().toISOString() }
    );

    console.log('Logo uploaded for bar:', bar.barCode, 'hash:', logoHash);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        logoUrl: logoUrl,
        logoHash: logoHash
      })
    };
  } catch (err) {
    console.error('upload-logo error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', statusCode: 500 })
    };
  }
};

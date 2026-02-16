'use strict';

const crypto = require('crypto');
const { TABLE, update } = require('./shared/dynamo');
const { authenticate, unauthorized } = require('./shared/auth');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const s3 = new S3Client({ region: 'us-east-1' });

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const VALID_CONTENT_TYPES = ['image/png', 'image/jpeg'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const LOGO_BUCKET = 'taptrivia-logos';

exports.handler = async (event) => {
  try {
    const bar = await authenticate(event);
    if (!bar) return unauthorized();

    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { image, contentType } = body || {};

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

    // Check decoded image size
    const imageBuffer = Buffer.from(image, 'base64');
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Image must be less than 5MB', statusCode: 400 })
      };
    }

    // Call Bedrock Titan for background removal
    let processedImageBase64;
    try {
      const command = new InvokeModelCommand({
        modelId: 'amazon.titan-image-generator-v2:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          taskType: 'BACKGROUND_REMOVAL',
          backgroundRemovalParams: {
            image: {
              source: {
                bytes: image // raw base64, no data:uri prefix
              }
            }
          }
        })
      });

      const response = await bedrock.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));
      processedImageBase64 = result.images[0];
    } catch (bedrockErr) {
      console.error('Bedrock background removal failed:', bedrockErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'PROCESSING_FAILED', message: 'Logo processing failed. Try a different image.', statusCode: 500 })
      };
    }

    // TODO: resize to 512x512 with sharp (requires Lambda layer for native binaries)

    // Upload to S3
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

    // Update bar record
    await update(
      TABLE.BARS,
      { PK: `BAR#${bar.barCode}` },
      'SET logoUrl = :url, logoHash = :hash, logoUpdatedAt = :t',
      { ':url': key, ':hash': logoHash, ':t': new Date().toISOString() }
    );

    console.log('Logo uploaded for bar:', bar.barCode, 'hash:', logoHash);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        logoUrl: key,
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

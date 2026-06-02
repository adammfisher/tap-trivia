'use strict';

const crypto = require('crypto');
const Jimp = require('jimp');
const { TABLE, update } = require('./shared/dynamo');
const { authenticate, unauthorized } = require('./shared/auth');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

const s3 = new S3Client({ region: 'us-east-1' });
const cloudfront = new CloudFrontClient({ region: 'us-east-1' });

// Background removal for logos. Bar logos are graphics on a solid (or near-solid)
// background, so AI subject-detection models erase them — we key out the
// background color instead. Samples the corners to find the background color,
// then makes matching pixels transparent with a feathered edge.
const MAX_LOGO_DIMENSION = 512; // downscale large uploads before processing
const KEY_LOWER = 42;           // color distance ≤ this → fully transparent
const KEY_UPPER = 96;           // color distance ≥ this → fully opaque (feather between)
const SOLID_BG_MAX_VARIANCE = 38; // if corners disagree more than this, bg isn't solid

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Key out a solid/near-solid background in place (mutates image.bitmap alpha).
// Returns whether keying was actually applied.
function keyOutBackground(image) {
  const { width, height, data } = image.bitmap;

  // Sample background color + alpha from the four corners.
  const corner = (x, y) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  const corners = [corner(0, 0), corner(width - 1, 0), corner(0, height - 1), corner(width - 1, height - 1)];

  // If the corners are already transparent, the logo arrived with its background
  // removed — keying against transparent pixels' (garbage) RGB would wreck it.
  const meanCornerAlpha = corners.reduce((a, c) => a + c[3], 0) / corners.length;
  if (meanCornerAlpha < 32) return false;

  const bg = corners.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map((v) => v / corners.length);

  // If the corners disagree a lot, the background isn't a solid color — keying
  // would damage the image, so leave it unchanged.
  const cornerVariance = Math.max(...corners.map((c) => colorDist(c[0], c[1], c[2], bg[0], bg[1], bg[2])));
  if (cornerVariance > SOLID_BG_MAX_VARIANCE) return false;

  for (let i = 0; i < data.length; i += 4) {
    const dist = colorDist(data[i], data[i + 1], data[i + 2], bg[0], bg[1], bg[2]);
    let alpha;
    if (dist <= KEY_LOWER) alpha = 0;
    else if (dist >= KEY_UPPER) alpha = 255;
    else alpha = Math.round(((dist - KEY_LOWER) / (KEY_UPPER - KEY_LOWER)) * 255);
    data[i + 3] = Math.round((data[i + 3] * alpha) / 255);
  }
  return true;
}

// Recolor every visible pixel to white, preserving alpha — produces a clean
// white silhouette of the logo for placing on the colored TV gradient.
function recolorWhite(image) {
  const { data } = image.bitmap;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
}

// Process an uploaded logo per mode: 'remove' (transparent bg), 'white' (white
// silhouette on transparent bg), or 'none' (just normalize to PNG).
async function processLogo(buffer, mode) {
  const image = await Jimp.read(buffer);

  // Downscale oversized uploads — the stored logo is only shown small on TVs.
  const maxDim = Math.max(image.bitmap.width, image.bitmap.height);
  if (maxDim > MAX_LOGO_DIMENSION) {
    image.scale(MAX_LOGO_DIMENSION / maxDim);
  }

  if (mode === 'remove' || mode === 'white') {
    keyOutBackground(image);
  }
  if (mode === 'white') {
    recolorWhite(image);
  }

  return await image.getBufferAsync(Jimp.MIME_PNG);
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const VALID_CONTENT_TYPES = ['image/png', 'image/jpeg'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const LOGO_BUCKET = 'taptrivia-logos';
const LOGO_CDN = 'https://tv.taptrivia.tv';
const TV_CF_DIST_ID = process.env.CF_TV_DIST_ID || 'EYJ9U9RQEM3MS';

exports.handler = async (event) => {
  try {
    const bar = await authenticate(event);
    if (!bar) return unauthorized();

    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { image, removeBackground, logoMode } = body || {};
    const contentType = body.contentType || body.mimeType;

    // Resolve processing mode. Prefer explicit logoMode ('remove'|'white'|'none');
    // fall back to the legacy removeBackground boolean for older clients.
    let mode;
    if (logoMode === 'remove' || logoMode === 'white' || logoMode === 'none') {
      mode = logoMode;
    } else {
      mode = removeBackground === false ? 'none' : 'remove';
    }

    // Validate input
    if (!image || typeof image !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Base64-encoded image data is required' })
      };
    }

    if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'contentType must be image/png or image/jpeg' })
      };
    }

    const imageBuffer = Buffer.from(image, 'base64');
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Image must be less than 5MB' })
      };
    }

    // Validate magic bytes — reject files that lie about their content type
    const isPng = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47;
    const isJpeg = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 && imageBuffer[2] === 0xFF;
    if (contentType === 'image/png' && !isPng) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'INVALID_INPUT', message: 'File does not appear to be a valid PNG' }) };
    }
    if (contentType === 'image/jpeg' && !isJpeg) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'INVALID_INPUT', message: 'File does not appear to be a valid JPEG' }) };
    }
    if (!isPng && !isJpeg) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Unsupported image format' }) };
    }

    // Process the logo per the chosen mode (remove background / make white / none).
    let processedBuffer;
    try {
      processedBuffer = await processLogo(imageBuffer, mode);
    } catch (imgErr) {
      console.error('Logo processing failed for bar', bar.barCode, 'mode', mode, imgErr);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'PROCESSING_FAILED', message: 'Could not process this image. Try a different PNG or JPEG.' })
      };
    }

    // Upload to S3 (overwrites existing logo for this bar)
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
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
    };
  }
};

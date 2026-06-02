'use strict';

// Cognito CreateAuthChallenge trigger: generate a 6-digit OTP, email it via SES,
// and stash it server-side (privateChallengeParameters + challengeMetadata) for
// the verify trigger. The code is never exposed to the client.
const crypto = require('crypto');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'us-east-1' });
const FROM = 'TapTrivia <noreply@taptrivia.tv>';

function reuseExistingCode(session) {
  // Reuse the same code across retries within one sign-in so the user only gets
  // one email even if they fat-finger the code.
  for (let i = session.length - 1; i >= 0; i--) {
    const s = session[i];
    if (s.challengeName === 'CUSTOM_CHALLENGE' && s.challengeMetadata && s.challengeMetadata.startsWith('CODE-')) {
      return s.challengeMetadata.slice(5);
    }
  }
  return null;
}

async function sendOtpEmail(email, code) {
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a2e">
      <h2 style="margin:0 0 8px">TapTrivia Analytics</h2>
      <p style="color:#555;margin:0 0 20px">Your one-time login code:</p>
      <div style="font-size:34px;font-weight:700;letter-spacing:8px;background:#f4f1fb;border-radius:10px;padding:18px;text-align:center;color:#3d1866">${code}</div>
      <p style="color:#888;font-size:13px;margin:20px 0 0">This code expires in 5 minutes. If you didn't request it, ignore this email.</p>
    </div>`;
  await ses.send(new SendEmailCommand({
    Source: FROM,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: 'Your TapTrivia analytics login code' },
      Body: {
        Html: { Data: html },
        Text: { Data: `Your TapTrivia analytics login code is ${code}. It expires in 5 minutes.` }
      }
    }
  }));
}

exports.handler = async (event) => {
  const session = event.request.session || [];
  let code = reuseExistingCode(session);

  if (!code) {
    code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const email = event.request.userAttributes && event.request.userAttributes.email;
    // Only send if this is a real, known user. For an unknown email Cognito sets
    // userNotFound — we still run the challenge (so existence isn't revealed) but
    // send nothing, so it can never be answered.
    if (email && !event.request.userNotFound) {
      try {
        await sendOtpEmail(email, code);
      } catch (err) {
        console.error('OTP email send failed:', err);
        throw err;
      }
    }
  }

  // Server-side only — never sent to the client.
  event.response.privateChallengeParameters = { answer: code };
  event.response.challengeMetadata = 'CODE-' + code;
  // Public params carry no secret; just a hint the client can show.
  event.response.publicChallengeParameters = { deliveryMedium: 'EMAIL' };

  return event;
};

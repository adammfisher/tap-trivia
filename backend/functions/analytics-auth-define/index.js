'use strict';

// Cognito DefineAuthChallenge trigger for passwordless email-OTP sign-in.
// Drives a single CUSTOM_CHALLENGE: succeed on a correct code, fail after 3
// wrong attempts, otherwise keep presenting the challenge.
const MAX_ATTEMPTS = 3;

exports.handler = async (event) => {
  const session = event.request.session || [];
  const last = session.length ? session[session.length - 1] : null;

  if (last && last.challengeName === 'CUSTOM_CHALLENGE' && last.challengeResult === true) {
    // Correct OTP — issue tokens.
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  } else if (session.length >= MAX_ATTEMPTS) {
    // Too many wrong attempts (or unknown user) — fail.
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
  } else {
    // Present (another) OTP challenge.
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
  }

  return event;
};

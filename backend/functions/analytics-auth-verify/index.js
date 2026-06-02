'use strict';

// Cognito VerifyAuthChallengeResponse trigger: compare the submitted code to the
// one the create trigger stashed in privateChallengeParameters.
exports.handler = async (event) => {
  const expected = event.request.privateChallengeParameters
    ? event.request.privateChallengeParameters.answer
    : null;
  const submitted = (event.request.challengeAnswer || '').trim();

  event.response.answerCorrect = !!expected && submitted === expected;

  return event;
};

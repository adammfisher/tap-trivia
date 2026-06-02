// Cognito sign-in/out + session helpers, built on the Amplify v6 Auth
// module. We use Auth directly (not @aws-amplify/ui-react) so the form
// styling stays inside our design system.
import { Amplify } from "aws-amplify";
import { Hub } from "aws-amplify/utils";
import { signIn as ampSignIn, confirmSignIn as ampConfirmSignIn, signOut as ampSignOut, fetchAuthSession, getCurrentUser as ampGetUser } from "aws-amplify/auth";

export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId:        import.meta.env.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId:  import.meta.env.VITE_COGNITO_APP_CLIENT_ID,
        loginWith: { email: true },
      },
    },
  });
}

// Passwordless email-OTP sign-in (Cognito custom auth challenge).
// Step 1: request a code. Step 2: confirm it.
export async function requestOtp(email) {
  // Clear any half-finished session so re-requests start clean.
  try { await ampSignOut(); } catch { /* ignore */ }

  const r = await ampSignIn({
    username: email,
    options: { authFlowType: "CUSTOM_WITHOUT_SRP" },
  });

  const step = r?.nextStep?.signInStep;
  if (step !== "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE") {
    throw new Error("Could not start sign-in (" + (step || "unknown") + ")");
  }
  return r;
}

export async function confirmOtp(code) {
  const r = await ampConfirmSignIn({ challengeResponse: String(code).trim() });
  if (!r.isSignedIn) {
    throw new Error("Invalid or expired code");
  }
  return r;
}

export async function signOut() {
  await ampSignOut();
}

export async function getCurrentUser() {
  try { return await ampGetUser(); }
  catch { return null; }
}

export async function getIdToken() {
  const sess = await fetchAuthSession();
  return sess?.tokens?.idToken?.toString() || null;
}

export function onAuthStateChange(cb) {
  return Hub.listen("auth", ({ payload }) => cb(payload));
}

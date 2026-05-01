// Cognito sign-in/out + session helpers, built on the Amplify v6 Auth
// module. We use Auth directly (not @aws-amplify/ui-react) so the form
// styling stays inside our design system.
import { Amplify } from "aws-amplify";
import { Hub } from "aws-amplify/utils";
import { signIn as ampSignIn, signOut as ampSignOut, fetchAuthSession, getCurrentUser as ampGetUser } from "aws-amplify/auth";

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

export async function signIn(email, password) {
  // USER_PASSWORD_AUTH is enabled on the App Client; Amplify v6 selects
  // it automatically when given a password.
  const r = await ampSignIn({ username: email, password });
  if (!r.isSignedIn) {
    throw new Error("Sign-in not complete: " + (r.nextStep?.signInStep || "unknown"));
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

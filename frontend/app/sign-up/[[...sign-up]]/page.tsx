import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        forceRedirectUrl="/dashboard"
        signInUrl="/sign-in"
        routing="path"
        path="/sign-up"
        oauthFlow="redirect"
      />
    </div>
  );
}
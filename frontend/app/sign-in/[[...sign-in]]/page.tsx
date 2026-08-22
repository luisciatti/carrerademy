import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        forceRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
        routing="path"
        path="/sign-in"
        oauthFlow="redirect"
      />
    </div>
  );
}
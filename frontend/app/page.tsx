import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6">
      <main className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">CareerAdemy Auth Test</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Use the controls below to validate Clerk sign-in and sign-up.
        </p>

        <div className="mt-8 flex items-center gap-4">
          {!userId ? (
            <>
              <SignInButton mode="modal">
                <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100">
                  Sign up
                </button>
              </SignUpButton>
            </>
          ) : (
            <UserButton afterSignOutUrl="/" />
          )}
        </div>
      </main>
    </div>
  );
}

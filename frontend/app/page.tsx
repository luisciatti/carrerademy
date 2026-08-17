import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <main className="w-full max-w-4xl rounded-3xl border border-teal-900/40 bg-zinc-950/80 p-8 shadow-[0_0_60px_rgba(13,148,136,0.18)] md:p-12">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Cloud journey accelerator</p>
        <h1 className="mt-4 text-4xl font-black leading-tight text-zinc-100 md:text-5xl">
          Aprenda com trilha adaptada ao seu objetivo.
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-300">
          O CarrerAdemy transforma seu onboarding em um mapa de progresso com etapas desbloqueadas, contexto claro e foco total no proximo passo.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <SignInButton mode="modal">
            <button className="rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-teal-400">
              Entrar
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-teal-400">
              Criar conta
            </button>
          </SignUpButton>
          <Link href="/sign-in" className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-500">
            Abrir tela de login
          </Link>
        </div>
      </main>
    </div>
  );
}

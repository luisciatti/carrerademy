import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { AppRouteGuard } from "@/components/app-route-guard";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
    return (
        <AppRouteGuard>
            <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_20%_-10%,rgba(124,58,237,0.25),transparent),radial-gradient(1000px_700px_at_90%_0%,rgba(99,102,241,0.2),transparent),#0a0a12] text-zinc-100">
                <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
                    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
                        <Link href="/dashboard" className="text-lg font-black tracking-tight text-teal-200">
                            CarrerAdemy
                        </Link>
                        <nav className="flex items-center gap-4 text-sm text-zinc-300">
                            <Link href="/dashboard" className="hover:text-teal-200">
                                Dashboard
                            </Link>
                            <Link href="/trilha" className="hover:text-teal-200">
                                Minha trilha
                            </Link>
                            <Link href="/onboarding" className="hover:text-teal-200">
                                Novo onboarding
                            </Link>
                            <UserButton />
                        </nav>
                    </div>
                </header>
                <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
            </div>
        </AppRouteGuard>
    );
}

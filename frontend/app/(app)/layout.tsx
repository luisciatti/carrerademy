"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState, type ReactNode } from "react";

import { AppRouteGuard } from "@/components/app-route-guard";
import { PromoModal } from "@/components/promo-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { useBackendApi } from "@/lib/api";
import type { MeResponse } from "@/lib/types";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
    const api = useBackendApi();
    const [me, setMe] = useState<MeResponse | null>(null);

    useEffect(() => {
        api.getMe().then(setMe).catch(() => { });
    }, [api]);

    return (
        <AppRouteGuard>
            <div className="min-h-screen text-foreground">
                <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
                    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
                        <Link href="/dashboard" className="text-lg font-black tracking-tight text-accent">
                            CarrerAdemy
                        </Link>
                        <nav className="flex items-center gap-1 text-sm text-muted">
                            <Link href="/dashboard" className="rounded-md px-3 py-1.5 transition-colors duration-150 hover:bg-surface hover:text-foreground">Dashboard</Link>
                            <Link href="/trilha" className="rounded-md px-3 py-1.5 transition-colors duration-150 hover:bg-surface hover:text-foreground">Trilha</Link>
                            <Link href="/daily-session" className="rounded-md px-3 py-1.5 transition-colors duration-150 hover:bg-surface hover:text-foreground">Daily</Link>
                            <Link href="/notas" className="rounded-md px-3 py-1.5 transition-colors duration-150 hover:bg-surface hover:text-foreground">Notas</Link>
                            <Link href="/perfil" className="rounded-md px-3 py-1.5 transition-colors duration-150 hover:bg-surface hover:text-foreground">Perfil</Link>
                            <Link href="/onboarding" className="rounded-md px-3 py-1.5 transition-colors duration-150 hover:bg-surface hover:text-foreground">Onboarding</Link>
                            <ThemeToggle />
                            <UserButton />
                        </nav>
                    </div>
                </header>
                <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
            </div>
            <PromoModal me={me} />
        </AppRouteGuard>
    );
}

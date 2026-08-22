"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AppRouteGuard } from "@/components/app-route-guard";
import { PromoModal } from "@/components/promo-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { useMeQuery } from "@/lib/backend-queries";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { data: me } = useMeQuery();

    useEffect(() => {
        setDrawerOpen(false);
    }, [pathname]);

    const primaryItems = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/constelacao", label: "Trilhas" },
        { href: "/daily-session", label: "Daily Session" },
        { href: "/perfil", label: "Perfil" },
    ];

    const secondaryItems = [
        { href: "/notas", label: "Notas" },
    ];

    return (
        <AppRouteGuard>
            <div className="min-h-screen text-foreground">
                <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
                    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setDrawerOpen((value) => !value)}
                                className="rounded-xl border border-border bg-background/70 p-2 text-muted transition hover:bg-surface hover:text-foreground"
                                aria-label={drawerOpen ? "Fechar menu" : "Abrir menu"}
                                aria-expanded={drawerOpen}
                            >
                                {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>
                            <Link href="/dashboard" className="text-lg font-black tracking-tight text-accent">
                                CarrerAdemy
                            </Link>
                        </div>
                        <nav className="flex items-center gap-2 text-sm text-muted">
                            <ThemeToggle />
                            <UserButton />
                        </nav>
                    </div>
                </header>
                {drawerOpen && (
                    <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]" onClick={() => setDrawerOpen(false)}>
                        <aside
                            className="h-full w-full max-w-xs border-r border-border bg-background/96 p-5 shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold uppercase tracking-widest text-muted">Menu</p>
                                <button
                                    type="button"
                                    onClick={() => setDrawerOpen(false)}
                                    className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-foreground"
                                    aria-label="Fechar menu"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="mt-6 space-y-1">
                                {primaryItems.map((item) => {
                                    const active = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setDrawerOpen(false)}
                                            className={`block rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-accent/12 text-foreground" : "text-muted hover:bg-surface hover:text-foreground"}`}
                                        >
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>

                            <div className="mt-8">
                                <p className="px-3 text-xs uppercase tracking-widest text-muted">Mais</p>
                                <div className="mt-2 space-y-1">
                                    {secondaryItems.map((item) => {
                                        const active = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setDrawerOpen(false)}
                                                className={`block rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-accent/12 text-foreground" : "text-muted hover:bg-surface hover:text-foreground"}`}
                                            >
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-8 rounded-3xl bg-gradient-to-br from-[color:var(--accent-purple)]/14 via-white to-[color:var(--accent-coral)]/12 p-4 shadow-[0_14px_30px_rgba(99,78,117,0.08)] dark:from-[color:var(--accent-purple)]/22 dark:via-surface dark:to-[color:var(--accent-coral)]/12">
                                <p className="text-sm font-semibold text-[color:var(--accent-purple)]">{me?.name?.split(" ")[0] ?? "Sua jornada"}</p>
                                <p className="mt-1 text-sm text-muted">O dashboard continua sendo o ponto principal para seguir sem se perder no fluxo.</p>
                            </div>
                        </aside>
                    </div>
                )}
                <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
            </div>
            <PromoModal me={me ?? null} />
        </AppRouteGuard>
    );
}

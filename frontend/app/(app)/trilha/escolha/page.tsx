"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { extractApiMessage } from "@/lib/api";
import { useMyCareerPathsQuery } from "@/lib/backend-queries";

export default function EscolhaTrilhaPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [nextHref, setNextHref] = useState<string | null>(null);
    const pathsQuery = useMyCareerPathsQuery();

    const resolvedError = useMemo(() => {
        if (error) {
            return error;
        }
        if (pathsQuery.error) {
            return extractApiMessage(pathsQuery.error, "Nao foi possivel carregar suas trilhas.");
        }
        return null;
    }, [error, pathsQuery.error]);
    const loading = pathsQuery.isLoading;

    useEffect(() => {
        if (pathsQuery.isLoading || pathsQuery.error) {
            return;
        }

        const result = pathsQuery.data ?? [];
        if (result.length === 0) {
            setError("Ainda nao encontramos trilhas para sua conta. Refaça o onboarding para continuar.");
            return;
        }

        const standardPath = result.find((path) => path.kind === "STANDARD_SOFT_SKILLS");
        const activePath = result.find((path) => path.status === "ACTIVE");
        const generatingAi = result.find((path) => path.kind === "AI_PERSONALIZED" && path.status === "GENERATING");
        const fallbackPath = result[0];

        const href = standardPath
            ? `/trilha/${standardPath.id}`
            : activePath
                ? `/trilha/${activePath.id}`
                : generatingAi
                    ? `/trilha/gerando?career_path_id=${generatingAi.id}`
                    : fallbackPath
                        ? `/trilha/${fallbackPath.id}`
                        : "/dashboard";

        setNextHref(href);
        router.replace(href);
    }, [pathsQuery.data, pathsQuery.error, pathsQuery.isLoading, router]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-32 animate-pulse rounded-2xl bg-surface" />
                <div className="h-48 animate-pulse rounded-2xl bg-surface" />
            </div>
        );
    }

    if (resolvedError) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{resolvedError}</p>;
    }

    return (
        <div className="space-y-6">
            <section className="app-card bg-gradient-to-r from-accent-purple/12 via-accent-blue/10 to-accent-mint/10 p-6">
                <p className="text-xs uppercase tracking-widest text-accent-blue/80">Redirecionando</p>
                <h1 className="mt-2 text-2xl font-black text-foreground">Abrindo sua proxima etapa</h1>
                <p className="mt-2 text-sm text-muted">
                    Para reduzir decisoes no inicio, abrimos automaticamente sua trilha principal.
                </p>
                {nextHref && (
                    <Link href={nextHref} className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover">
                        Continuar agora
                    </Link>
                )}
            </section>

            <p className="text-sm text-muted">
                Se o redirecionamento nao acontecer, abra o <Link href="/dashboard" className="text-accent-blue hover:text-accent-hover">dashboard</Link>.
            </p>
        </div>
    );
}

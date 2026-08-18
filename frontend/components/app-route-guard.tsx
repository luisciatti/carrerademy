"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiFetch, ApiError } from "@/lib/api-client";
import type { CareerPath } from "@/lib/types";

type GuardState = "checking" | "ready";

export function AppRouteGuard({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, getToken, userId } = useAuth();
    const pathname = usePathname();

    if (!isLoaded) {
        return <GuardLoading />;
    }

    return (
        <GuardRuntime key={`${userId ?? "anon"}:${pathname}`} pathname={pathname} isSignedIn={isSignedIn} getToken={getToken}>
            {children}
        </GuardRuntime>
    );
}

function GuardRuntime({
    children,
    pathname,
    isSignedIn,
    getToken,
}: {
    children: React.ReactNode;
    pathname: string;
    isSignedIn: boolean | undefined;
    getToken: () => Promise<string | null>;
}) {
    const router = useRouter();
    const [state, setState] = useState<GuardState>("checking");
    const [authError, setAuthError] = useState<string | null>(null);

    const isPublicWithinApp = useMemo(() => pathname.startsWith("/paywall"), [pathname]);

    useEffect(() => {
        let cancelled = false;

        async function runGuard() {
            if (!isSignedIn) {
                router.replace("/sign-in");
                return;
            }

            setAuthError(null);

            try {
                const careerPaths = await apiFetch<CareerPath[]>("/api/v1/career-paths/me");

                if (cancelled) {
                    return;
                }

                const hasAnyPath = careerPaths.length > 0;
                const aiPath = careerPaths.find((path) => path.kind === "AI_PERSONALIZED");

                if (!hasAnyPath && pathname !== "/onboarding") {
                    router.replace("/onboarding");
                    return;
                }

                if (pathname === "/trilha/gerando" && aiPath?.status === "ACTIVE") {
                    router.replace(`/trilha/${aiPath.id}`);
                    return;
                }

                if (hasAnyPath && pathname === "/onboarding") {
                    router.replace("/dashboard");
                    return;
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }

                if (error instanceof ApiError && error.status === 404) {
                    if (pathname !== "/onboarding" && !isPublicWithinApp) {
                        router.replace("/onboarding");
                        return;
                    }
                } else if (error instanceof ApiError && error.status === 401) {
                    setAuthError("Sua sessao no Clerk existe, mas o backend nao conseguiu validar o token. Recarregue a pagina apos reiniciar o backend.");
                    setState("ready");
                    return;
                }
            }

            if (!cancelled) {
                setState("ready");
            }
        }

        void runGuard();

        return () => {
            cancelled = true;
        };
    }, [getToken, isPublicWithinApp, isSignedIn, pathname, router]);

    if (state === "checking") {
        return <GuardLoading />;
    }

    if (authError) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="w-full max-w-2xl rounded-2xl border border-amber-900/50 bg-zinc-950/90 p-8">
                    <h2 className="text-lg font-semibold text-amber-200">Falha de autenticacao com o backend</h2>
                    <p className="mt-3 text-sm text-zinc-300">{authError}</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

function GuardLoading() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="w-full max-w-xl rounded-2xl border border-teal-900/40 bg-zinc-950/80 p-8">
                <p className="text-sm text-zinc-300">Carregando seu espaco de aprendizado...</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded bg-zinc-800">
                    <div className="h-full w-1/2 animate-pulse rounded bg-teal-500" />
                </div>
            </div>
        </div>
    );
}

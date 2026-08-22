"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useMeQuery, useMyCareerPathsQuery } from "@/lib/backend-queries";
import { ApiError } from "@/lib/api-client";

type GuardState = "checking" | "ready";
const HANDSHAKE_RETRY_DELAY_MS = 450;

export function AppRouteGuard({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn } = useAuth();
    const pathname = usePathname();

    if (!isLoaded) {
        return <GuardLoading />;
    }

    return (
        <GuardRuntime pathname={pathname} isSignedIn={isSignedIn}>
            {children}
        </GuardRuntime>
    );
}

function GuardRuntime({
    children,
    pathname,
    isSignedIn,
}: {
    children: React.ReactNode;
    pathname: string;
    isSignedIn: boolean | undefined;
}) {
    const router = useRouter();
    const [state, setState] = useState<GuardState>("checking");
    const [authError, setAuthError] = useState<string | null>(null);
    const [hasRetriedHandshake, setHasRetriedHandshake] = useState(false);
    const [hasRetriedMissingPaths, setHasRetriedMissingPaths] = useState(false);
    const meQuery = useMeQuery();
    const meReady = !!meQuery.data;
    const { data: careerPaths, error: pathsError, isLoading: pathsLoading, mutate: retryPaths } = useMyCareerPathsQuery({ enabled: meReady, notFoundAsEmpty: false });

    const isPublicWithinApp = useMemo(() => pathname.startsWith("/paywall"), [pathname]);

    useEffect(() => {
        setHasRetriedHandshake(false);
        setHasRetriedMissingPaths(false);
    }, [isSignedIn]);

    useEffect(() => {
        if (!(meQuery.error instanceof ApiError) || meQuery.error.status !== 401 || hasRetriedHandshake) {
            return;
        }

        const retryTimer = window.setTimeout(() => {
            setHasRetriedHandshake(true);
            void meQuery.mutate();
        }, HANDSHAKE_RETRY_DELAY_MS);

        return () => window.clearTimeout(retryTimer);
    }, [hasRetriedHandshake, meQuery]);

    useEffect(() => {
        if (!isSignedIn) {
            router.replace("/sign-in");
            return;
        }

        setAuthError(null);

        if (meQuery.isLoading || (!meReady && meQuery.error instanceof ApiError && meQuery.error.status === 401 && !hasRetriedHandshake)) {
            setState("checking");
            return;
        }

        if (meQuery.error instanceof ApiError && meQuery.error.status === 401) {
            setAuthError("Sua sessao no Clerk existe, mas o backend nao conseguiu validar o token. Recarregue a pagina apos reiniciar o backend.");
            setState("ready");
            return;
        }

        if (meQuery.error) {
            setAuthError("Nao foi possivel validar sua sessao com o backend neste momento.");
            setState("ready");
            return;
        }

        if (pathsLoading) {
            setState("checking");
            return;
        }

        if (pathsError instanceof ApiError && pathsError.status === 401 && !hasRetriedHandshake) {
            setState("checking");
            const retryTimer = window.setTimeout(() => {
                setHasRetriedHandshake(true);
                void meQuery.mutate();
                void retryPaths();
            }, HANDSHAKE_RETRY_DELAY_MS);
            return () => window.clearTimeout(retryTimer);
        }

        if (pathsError instanceof ApiError && pathsError.status === 401) {
            setAuthError("Sua sessao no Clerk existe, mas o backend nao conseguiu validar o token. Recarregue a pagina apos reiniciar o backend.");
            setState("ready");
            return;
        }

        if (pathsError instanceof ApiError && pathsError.status === 404 && !hasRetriedMissingPaths) {
            setState("checking");
            const retryTimer = window.setTimeout(() => {
                setHasRetriedMissingPaths(true);
                void retryPaths();
            }, HANDSHAKE_RETRY_DELAY_MS);
            return () => window.clearTimeout(retryTimer);
        }

        if (pathsError instanceof ApiError && pathsError.status === 404) {
            if (pathname !== "/onboarding" && !isPublicWithinApp) {
                router.replace("/onboarding");
                return;
            }
            setState("ready");
            return;
        }

        if (pathsError) {
            setAuthError("Nao foi possivel carregar suas trilhas neste momento.");
            setState("ready");
            return;
        }

        const hasAnyPath = (careerPaths ?? []).length > 0;
        if (!hasAnyPath && pathname !== "/onboarding" && !isPublicWithinApp) {
            router.replace("/onboarding");
            return;
        }

        if (hasAnyPath && pathname === "/onboarding") {
            router.replace("/dashboard");
            return;
        }

        setState("ready");
    }, [careerPaths, hasRetriedHandshake, hasRetriedMissingPaths, isPublicWithinApp, isSignedIn, meQuery, meReady, pathname, pathsError, pathsLoading, retryPaths, router]);

    if (state === "checking") {
        return <GuardLoading />;
    }

    if (authError) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="w-full max-w-2xl rounded-2xl border border-accent-coral/40 bg-background/90 p-8 shadow-sm backdrop-blur">
                    <h2 className="text-lg font-semibold text-accent-coral">Falha de autenticacao com o backend</h2>
                    <p className="mt-3 text-sm text-muted">{authError}</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

function GuardLoading() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="w-full max-w-xl rounded-2xl border border-border bg-background/85 p-8 shadow-sm backdrop-blur">
                <p className="text-sm text-muted">Carregando seu espaco de aprendizado...</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded bg-surface">
                    <div className="h-full w-1/2 animate-pulse rounded bg-accent" />
                </div>
            </div>
        </div>
    );
}

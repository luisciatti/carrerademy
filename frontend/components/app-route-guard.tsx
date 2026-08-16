"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiFetch, ApiError } from "@/lib/api-client";
import type { CareerPath } from "@/lib/types";

type GuardState = "checking" | "ready";

export function AppRouteGuard({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [state, setState] = useState<GuardState>("checking");

    const isPublicWithinApp = useMemo(() => pathname.startsWith("/paywall"), [pathname]);

    useEffect(() => {
        let cancelled = false;

        async function runGuard() {
            if (!isLoaded) {
                return;
            }

            if (!isSignedIn) {
                router.replace("/sign-in");
                return;
            }

            try {
                const token = await getToken();
                const careerPath = await apiFetch<CareerPath>("/api/v1/career-paths/me", { token });

                if (cancelled) {
                    return;
                }

                if (careerPath.status === "GENERATING" && pathname !== "/trilha/gerando") {
                    router.replace("/trilha/gerando");
                    return;
                }

                if (careerPath.status === "ACTIVE" && (pathname === "/onboarding" || pathname === "/trilha/gerando" || pathname === "/")) {
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
                    router.replace("/sign-in");
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
    }, [getToken, isLoaded, isPublicWithinApp, isSignedIn, pathname, router]);

    if (state === "checking") {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="w-full max-w-xl rounded-2xl border border-violet-900/40 bg-zinc-950/80 p-8">
                    <p className="text-sm text-zinc-300">Carregando seu espaco de aprendizado...</p>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded bg-zinc-800">
                        <div className="h-full w-1/2 animate-pulse rounded bg-violet-500" />
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

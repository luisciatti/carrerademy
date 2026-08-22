"use client";

import { useAuth } from "@clerk/nextjs";
import { Bot, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useTheme } from "@/components/theme-provider";

type AiGuideProps = {
    tipId: string;
    message: string;
    title?: string;
    trigger?: boolean;
    position?: "bottom-right" | "bottom-left";
};

function buildStorageKey(userId: string | null | undefined, tipId: string): string {
    return `careerademy.ai-guide.${userId ?? "anon"}.${tipId}`;
}

export function AiGuide({
    tipId,
    message,
    title = "Guia IA",
    trigger = true,
    position = "bottom-right",
}: AiGuideProps) {
    const { userId } = useAuth();
    const { resolvedTheme } = useTheme();
    const [open, setOpen] = useState(false);

    const storageKey = useMemo(() => buildStorageKey(userId, tipId), [userId, tipId]);

    useEffect(() => {
        if (!trigger || typeof window === "undefined") return;

        const seen = window.localStorage.getItem(storageKey) === "1";
        if (!seen) {
            setOpen(true);
        }
    }, [storageKey, trigger]);

    function dismiss() {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(storageKey, "1");
        }
        setOpen(false);
    }

    if (!open) return null;

    const isDark = resolvedTheme === "dark";

    return (
        <aside
            className={`fixed z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border p-4 backdrop-blur ${isDark ? "border-accent-purple/40 bg-surface/95 shadow-[0_16px_40px_rgba(20,18,28,0.45)]" : "border-accent-blue/25 bg-white/95 shadow-[0_16px_40px_rgba(66,71,106,0.14)]"} ${position === "bottom-right" ? "bottom-4 right-4" : "bottom-4 left-4"}`}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-accent-blue/20 text-accent-blue">
                    <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-widest text-accent-blue/80">{title}</p>
                    <p className="mt-1 text-sm text-foreground">{message}</p>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
                    >
                        Entendi
                    </button>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    className="rounded-md p-1 text-muted transition hover:bg-surface hover:text-foreground"
                    aria-label="Fechar guia"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </aside>
    );
}

"use client";

import { Copy, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { MeResponse } from "@/lib/types";

type PromoModalProps = {
    me: MeResponse | null;
};

const PROMO_CODE = process.env.NEXT_PUBLIC_PROMO_CODE ?? "CARREIRA20";
const PROMO_DISCOUNT = process.env.NEXT_PUBLIC_PROMO_DISCOUNT ?? "20%";
const PROMO_EXPIRES = process.env.NEXT_PUBLIC_PROMO_EXPIRES ?? "2026-12-31";
const STORAGE_KEY = "careerademy.promoDismissedAt";

function timeLeft(expiresIso: string): string {
    const diff = new Date(expiresIso).getTime() - Date.now();
    if (diff <= 0) return "Expirado";
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    if (days > 0) return `${days}d ${hours}h restantes`;
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    return `${hours}h ${mins}min restantes`;
}

export function PromoModal({ me }: PromoModalProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [remaining, setRemaining] = useState(timeLeft(PROMO_EXPIRES));

    useEffect(() => {
        if (!me || me.has_active_subscription) return;
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
        const elapsedMs = raw ? Date.now() - Number(raw) : Infinity;
        const canShow = elapsedMs > 24 * 60 * 60 * 1_000;
        if (canShow) {
            const timer = setTimeout(() => setOpen(true), 2500);
            return () => clearTimeout(timer);
        }
    }, [me]);

    useEffect(() => {
        if (!open) return;
        const id = setInterval(() => setRemaining(timeLeft(PROMO_EXPIRES)), 60_000);
        return () => clearInterval(id);
    }, [open]);

    function dismiss() {
        setOpen(false);
        window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }

    function copyCode() {
        navigator.clipboard.writeText(PROMO_CODE).catch(() => { });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
            onClick={dismiss}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Codigo promocional"
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg rounded-2xl border border-teal-800/50 bg-background shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
            >
                <button
                    type="button"
                    onClick={dismiss}
                    className="absolute right-4 top-4 rounded-lg border border-border p-2 text-muted hover:text-foreground"
                    aria-label="Fechar"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="p-6">
                    <span className="rounded-full bg-teal-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-300">
                        PROMO CODE
                    </span>
                    <h2 className="mt-3 text-2xl font-black text-foreground">
                        {PROMO_DISCOUNT} de desconto na trilha personalizada
                    </h2>
                    <p className="mt-1 text-sm text-muted">{remaining}</p>

                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-teal-700/40 bg-teal-950/30 px-4 py-3">
                        <code className="flex-1 text-lg font-bold tracking-widest text-teal-200">{PROMO_CODE}</code>
                        <button
                            type="button"
                            onClick={copyCode}
                            className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-teal-400"
                        >
                            <Copy className="h-3.5 w-3.5" />
                            {copied ? "Copiado!" : "Copiar"}
                        </button>
                    </div>

                    <div className="mt-5 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Como funciona</p>
                        {[
                            "Clique em 'Assinar agora' abaixo para abrir o checkout.",
                            "Insira o codigo acima no campo de cupom do Stripe.",
                            "O desconto e aplicado automaticamente antes do pagamento.",
                        ].map((step, idx) => (
                            <div key={step} className="flex items-start gap-3">
                                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-300">
                                    {idx + 1}
                                </span>
                                <p className="text-sm text-muted">{step}</p>
                            </div>
                        ))}
                    </div>

                    <p className="mt-4 text-xs text-muted">
                        Valido ate {new Date(PROMO_EXPIRES).toLocaleDateString("pt-BR")}. Cobre o primeiro mes da assinatura. 1 uso por conta.
                    </p>

                    <a
                        href="/paywall"
                        className="mt-5 block rounded-xl bg-teal-500 py-3 text-center text-sm font-bold text-zinc-950 hover:bg-teal-400"
                    >
                        Assinar agora com {PROMO_DISCOUNT} de desconto
                    </a>
                </div>

                <div className="border-t border-border px-6 py-3 text-center text-xs text-muted">
                    Checkout seguro por Stripe
                </div>
            </div>
        </div>
    );
}

"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

type ActivityModalProps = {
    open: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: ReactNode;
};

export function ActivityModal({ open, title, subtitle, onClose, children }: ActivityModalProps) {
    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
            onClick={onClose}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
                className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-teal-900/50 bg-zinc-950 shadow-[0_20px_80px_rgba(0,0,0,0.5)]"
            >
                <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
                    <div>
                        {subtitle && <p className="text-xs uppercase tracking-wider text-zinc-500">{subtitle}</p>}
                        <h2 className="mt-1 text-lg font-bold text-zinc-100">{title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-zinc-700 p-2 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
                        aria-label="Fechar atividade"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-5 py-5">{children}</div>
            </div>
        </div>
    );
}

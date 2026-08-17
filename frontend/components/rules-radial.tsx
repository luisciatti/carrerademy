"use client";

import { useEffect, useMemo, useState } from "react";

import type { RulesRadialSchema } from "@/lib/types";

const POSITIONS = [
    "left-1/2 top-0 -translate-x-1/2",
    "right-0 top-1/3 translate-x-1/4",
    "right-1/4 bottom-0 translate-y-1/4",
    "left-1/4 bottom-0 translate-y-1/4",
    "left-0 top-1/3 -translate-x-1/4",
    "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
];

export function RulesRadial({ schema, onResolved }: { schema: RulesRadialSchema; onResolved: (resolved: boolean) => void }) {
    const [readIds, setReadIds] = useState<string[]>([]);
    const completed = useMemo(() => schema.rules.every((rule) => readIds.includes(rule.id)), [readIds, schema.rules]);

    useEffect(() => {
        onResolved(completed);
    }, [completed, onResolved]);

    return (
        <div className="relative mx-auto h-[28rem] max-w-3xl">
            <div className="absolute left-1/2 top-1/2 z-10 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-teal-400/60 bg-teal-500/10 text-center text-sm font-semibold text-teal-100 shadow-[0_0_30px_rgba(20,184,166,0.25)]">
                {schema.centerTitle}
            </div>
            {schema.rules.map((rule, index) => {
                const isRead = readIds.includes(rule.id);
                const position = POSITIONS[index % POSITIONS.length];
                return (
                    <div key={rule.id} className={`absolute ${position} w-48`}>
                        <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-20 -translate-x-1/2 border-t border-dashed border-teal-700/60" />
                        <button
                            type="button"
                            onClick={() => setReadIds((current) => (current.includes(rule.id) ? current : [...current, rule.id]))}
                            className={`relative z-10 rounded-2xl border p-4 text-left transition ${isRead ? "border-emerald-400 bg-emerald-500/10" : "border-zinc-800 bg-zinc-950/85 hover:border-teal-400"}`}
                        >
                            <p className="text-sm font-semibold text-zinc-100">{rule.title}</p>
                            <p className="mt-2 text-xs text-zinc-300">{rule.description}</p>
                            <p className={`mt-3 text-[11px] font-semibold ${isRead ? "text-emerald-300" : "text-teal-300"}`}>{isRead ? "Lida" : "Marcar como lida"}</p>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

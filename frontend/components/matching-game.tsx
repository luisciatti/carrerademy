"use client";

import { useEffect, useMemo, useState } from "react";

import type { MatchingSchema } from "@/lib/types";

type MatchingGameProps = {
    schema: MatchingSchema;
    onResolved: (resolved: boolean) => void;
};

export function MatchingGame({ schema, onResolved }: MatchingGameProps) {
    const rightOptions = useMemo(() => schema.pairs.map((pair) => pair.right), [schema.pairs]);
    const [selectedByLeft, setSelectedByLeft] = useState<Record<string, string>>({});
    const [checked, setChecked] = useState(false);

    const completed = schema.pairs.length > 0 && schema.pairs.every((pair) => typeof selectedByLeft[pair.left] === "string");
    const correct = completed && schema.pairs.every((pair) => selectedByLeft[pair.left] === pair.right);

    useEffect(() => {
        if (!checked) {
            onResolved(false);
            return;
        }
        onResolved(correct);
    }, [checked, correct, onResolved]);

    return (
        <div className="space-y-4">
            <p className="text-sm text-zinc-200">{schema.prompt}</p>
            <div className="space-y-3">
                {schema.pairs.map((pair) => {
                    const selected = selectedByLeft[pair.left] ?? "";
                    const isPairCorrect = checked && selected === pair.right;
                    const isPairWrong = checked && selected !== pair.right;

                    return (
                        <div key={pair.left} className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 md:grid-cols-2 md:items-center">
                            <p className="text-sm text-zinc-100">{pair.left}</p>
                            <select
                                value={selected}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setSelectedByLeft((prev) => ({ ...prev, [pair.left]: value }));
                                    setChecked(false);
                                    onResolved(false);
                                }}
                                className={`rounded-lg border bg-zinc-950 px-3 py-2 text-sm outline-none ${isPairCorrect ? "border-emerald-500 text-emerald-200" : isPairWrong ? "border-rose-500 text-rose-200" : "border-zinc-700 text-zinc-200"}`}
                            >
                                <option value="">Selecione a resposta</option>
                                {rightOptions.map((right) => (
                                    <option key={`${pair.left}-${right}`} value={right}>
                                        {right}
                                    </option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setChecked(true)}
                    disabled={!completed}
                    className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Verificar pares
                </button>
                {checked && (
                    <p className={`text-sm ${correct ? "text-emerald-300" : "text-amber-300"}`}>
                        {correct ? schema.successMessage ?? "Excelente combinacao." : schema.errorMessage ?? "Revise os pares e tente novamente."}
                    </p>
                )}
            </div>
        </div>
    );
}

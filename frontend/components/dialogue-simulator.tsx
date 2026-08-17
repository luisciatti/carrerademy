"use client";

import { useMemo, useState } from "react";

import type { DialogueOutcome, DialogueSchema } from "@/lib/types";

type DialogueSimulatorProps = {
    schema: DialogueSchema;
    onResolved: (resolved: boolean) => void;
};

export function DialogueSimulator({ schema, onResolved }: DialogueSimulatorProps) {
    const nodesById = useMemo(() => Object.fromEntries(schema.nodes.map((node) => [node.id, node])), [schema.nodes]);
    const [currentNodeId, setCurrentNodeId] = useState(schema.startNodeId);
    const [outcome, setOutcome] = useState<DialogueOutcome | null>(null);

    const currentNode = nodesById[currentNodeId];

    function choose(option: { nextNodeId?: string; outcome?: DialogueOutcome }) {
        if (option.outcome) {
            setOutcome(option.outcome);
            onResolved(true);
            return;
        }

        if (option.nextNodeId && nodesById[option.nextNodeId]) {
            setCurrentNodeId(option.nextNodeId);
        }
    }

    function restart() {
        setCurrentNodeId(schema.startNodeId);
        setOutcome(null);
        onResolved(false);
    }

    return (
        <div className="space-y-4">
            <p className="text-sm font-semibold text-zinc-100">{schema.title}</p>

            {outcome ? (
                <div className="space-y-3 rounded-2xl border border-emerald-700/50 bg-emerald-950/30 p-4">
                    <p className="text-sm font-semibold text-emerald-200">{outcome.title}</p>
                    <p className="text-sm text-zinc-200">{outcome.evaluation}</p>
                    <button
                        type="button"
                        onClick={restart}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
                    >
                        Tentar outro caminho
                    </button>
                </div>
            ) : currentNode ? (
                <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-zinc-500">{currentNode.speaker}</p>
                        <p className="mt-2 text-sm text-zinc-100">{currentNode.text}</p>
                    </div>
                    <div className="grid gap-2">
                        {currentNode.options.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => choose(option)}
                                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-200 transition hover:border-teal-400 hover:bg-teal-500/10"
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-zinc-300">Simulador indisponivel.</p>
            )}
        </div>
    );
}

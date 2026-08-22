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
            <p className="text-sm font-semibold text-foreground">{schema.title}</p>

            {outcome ? (
                <div className="space-y-3 rounded-2xl border border-accent-mint/45 bg-accent-mint/12 p-4">
                    <p className="text-sm font-semibold text-accent-mint">{outcome.title}</p>
                    <p className="text-sm text-foreground">{outcome.evaluation}</p>
                    <button
                        type="button"
                        onClick={restart}
                        className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-accent-blue/45"
                    >
                        Tentar outro caminho
                    </button>
                </div>
            ) : currentNode ? (
                <div className="space-y-4 rounded-2xl border border-border bg-surface/80 p-4">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-muted">{currentNode.speaker}</p>
                        <p className="mt-2 text-sm text-foreground">{currentNode.text}</p>
                    </div>
                    <div className="grid gap-2">
                        {currentNode.options.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => choose(option)}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition hover:border-accent-blue/45 hover:bg-accent-blue/8"
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-muted">Simulador indisponivel.</p>
            )}
        </div>
    );
}

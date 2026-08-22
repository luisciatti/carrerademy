"use client";

import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";

import type { ScenarioBuilderSchema } from "@/lib/types";

function SortablePiece({ id, label }: { id: string; label: string }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            {...attributes}
            {...listeners}
            className="cursor-grab rounded-xl border border-accent-blue/35 bg-surface px-4 py-3 text-sm text-foreground active:cursor-grabbing"
        >
            {label}
        </div>
    );
}

export function ScenarioBuilder({
    schema,
    onResolved,
}: {
    schema: ScenarioBuilderSchema;
    onResolved: (resolved: boolean) => void;
}) {
    const [orderedIds, setOrderedIds] = useState(schema.pieces.map((piece) => piece.id));
    const [categorized, setCategorized] = useState<Record<string, string>>({});
    const [checked, setChecked] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const pieceMap = useMemo(() => Object.fromEntries(schema.pieces.map((piece) => [piece.id, piece])), [schema.pieces]);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id || schema.mode !== "order") {
            return;
        }

        const oldIndex = orderedIds.indexOf(String(active.id));
        const newIndex = orderedIds.indexOf(String(over.id));
        setOrderedIds((current) => arrayMove(current, oldIndex, newIndex));
        setChecked(false);
        onResolved(false);
    }

    function verify() {
        let resolved = false;
        if (schema.mode === "order") {
            resolved = JSON.stringify(orderedIds) === JSON.stringify(schema.correctOrder ?? []);
        } else {
            resolved = Object.entries(schema.correctCategories ?? {}).every(([pieceId, category]) => categorized[pieceId] === category);
        }

        setChecked(true);
        onResolved(resolved);
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-foreground">{schema.prompt}</p>

            {schema.mode === "order" ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {orderedIds.map((pieceId) => (
                                <SortablePiece key={pieceId} id={pieceId} label={pieceMap[pieceId].label} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {(schema.categories ?? []).map((category) => (
                        <div key={category} className="rounded-2xl border border-border bg-surface/75 p-4">
                            <p className="text-sm font-semibold text-foreground">{category}</p>
                            <div className="mt-3 space-y-2">
                                {schema.pieces.map((piece) => {
                                    const selected = categorized[piece.id] === category;
                                    return (
                                        <button
                                            key={`${category}-${piece.id}`}
                                            type="button"
                                            onClick={() => {
                                                setCategorized((prev) => ({ ...prev, [piece.id]: category }));
                                                setChecked(false);
                                                onResolved(false);
                                            }}
                                            className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${selected ? "border-accent-blue/45 bg-accent-blue/12 text-accent-blue" : "border-border text-muted"}`}
                                        >
                                            {piece.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-3">
                <button type="button" onClick={verify} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover">
                    Verificar
                </button>
                {checked && <p className="text-sm text-muted">{schema.explanation}</p>}
            </div>
        </div>
    );
}

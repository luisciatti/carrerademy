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
            className="cursor-grab rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 active:cursor-grabbing"
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
            <p className="text-sm text-zinc-200">{schema.prompt}</p>

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
                        <div key={category} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                            <p className="text-sm font-semibold text-zinc-100">{category}</p>
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
                                            className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${selected ? "border-teal-400 bg-teal-500/15 text-teal-100" : "border-zinc-700 text-zinc-300"}`}
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
                <button type="button" onClick={verify} className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400">
                    Verificar
                </button>
                {checked && <p className="text-sm text-zinc-300">{schema.explanation}</p>}
            </div>
        </div>
    );
}

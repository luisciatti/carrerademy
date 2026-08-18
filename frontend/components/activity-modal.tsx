"use client";

import { NotebookPen, X } from "lucide-react";
import { ReactNode, useState } from "react";

import { NoteEditor } from "@/components/note-editor";

type ActivityModalProps = {
    open: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: ReactNode;
    /** Step ID — when provided enables the contextual note panel */
    stepId?: string | null;
    /** Initial note content for this step */
    noteContent?: string;
    /** Called on autosave with the updated content */
    onNoteSave?: (content: string) => Promise<void>;
};

export function ActivityModal({ open, title, subtitle, onClose, children, stepId, noteContent = "", onNoteSave }: ActivityModalProps) {
    const [noteOpen, setNoteOpen] = useState(false);

    if (!open) {
        return null;
    }

    const showNoteToggle = !!stepId && !!onNoteSave;

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
                className="relative flex max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-background shadow-[0_20px_80px_rgba(0,0,0,0.5)]"
            >
                {/* Activity pane */}
                <div className={`flex min-w-0 flex-1 flex-col ${noteOpen ? "border-r border-border" : ""}`}>
                    <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
                        <div>
                            {subtitle && <p className="text-xs uppercase tracking-wider text-muted">{subtitle}</p>}
                            <h2 className="mt-1 text-lg font-bold text-foreground">{title}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {showNoteToggle && (
                                <button
                                    type="button"
                                    onClick={() => setNoteOpen((v) => !v)}
                                    title={noteOpen ? "Fechar anotações" : "Abrir anotações"}
                                    className={`rounded-lg border p-2 transition ${noteOpen ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"}`}
                                    aria-pressed={noteOpen}
                                >
                                    <NotebookPen className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-border p-2 text-muted transition hover:text-foreground"
                                aria-label="Fechar atividade"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-5 py-5">{children}</div>
                </div>

                {/* Note panel — only rendered when open */}
                {noteOpen && onNoteSave && (
                    <div className="flex w-80 flex-shrink-0 flex-col bg-[hsl(var(--surface))/0.6]">
                        <div className="flex-shrink-0 border-b border-border px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Anotações</p>
                            <p className="mt-0.5 text-[11px] text-muted">Salva automaticamente</p>
                        </div>
                        <NoteEditor
                            initialContent={noteContent}
                            onSave={onNoteSave}
                            className="flex-1 p-3"
                            placeholder="Escreva enquanto faz a atividade…"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { ArrowLeft, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { NoteEditor } from "@/components/note-editor";
import { extractApiMessage, useBackendApi } from "@/lib/api";
import { useNotesQuery } from "@/lib/backend-queries";
import type { Note } from "@/lib/types";

export default function NotasPage() {
    const api = useBackendApi();
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [creating, setCreating] = useState(false);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notesQuery = useNotesQuery(debouncedQuery || undefined);
    const notes = notesQuery.data ?? [];
    const loading = notesQuery.isLoading;
    const resolvedError = error ?? (notesQuery.error ? extractApiMessage(notesQuery.error, "Não foi possível carregar as anotações.") : null);

    function handleQueryChange(value: string) {
        setQuery(value);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => setDebouncedQuery(value), 300);
    }

    async function handleCreate() {
        setCreating(true);
        try {
            const note = await api.createNote("", undefined);
            await notesQuery.mutate((prev) => [note, ...(prev ?? [])], false);
            setSelectedNote(note);
        } catch (e) {
            setError(extractApiMessage(e, "Não foi possível criar a anotação."));
        } finally {
            setCreating(false);
        }
    }

    async function handleSave(noteId: string, content: string) {
        const updated = await api.updateNote(noteId, content);
        await notesQuery.mutate((prev) => (prev ?? []).map((n) => n.id === noteId ? updated : n), false);
        setSelectedNote((prev) => prev?.id === noteId ? updated : prev);
    }

    async function handleDelete(noteId: string) {
        await api.deleteNote(noteId);
        await notesQuery.mutate((prev) => (prev ?? []).filter((n) => n.id !== noteId), false);
        if (selectedNote?.id === noteId) setSelectedNote(null);
    }

    function preview(content: string): string {
        return content.trim().slice(0, 160).replace(/\n/g, " ") || "Anotação vazia";
    }

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />)}
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-9rem)] gap-4 overflow-hidden">
            {/* List panel */}
            <aside className="flex w-72 flex-shrink-0 flex-col gap-3 overflow-hidden">
                {/* Search + new */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                        <input
                            value={query}
                            onChange={(e) => handleQueryChange(e.target.value)}
                            placeholder="Buscar anotações…"
                            className="w-full rounded-xl border border-border bg-surface py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={creating}
                        title="Nova anotação"
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-background transition hover:bg-accent-hover disabled:opacity-60"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>

                {resolvedError && (
                    <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">{resolvedError}</p>
                )}

                {/* Note list */}
                <ul className="flex-1 space-y-1 overflow-y-auto">
                    {notes.length === 0 && (
                        <li className="py-8 text-center text-sm text-muted">
                            {query ? "Nenhuma anotação encontrada." : "Ainda sem anotações. Crie uma!"}
                        </li>
                    )}
                    {notes.map((note) => (
                        <li key={note.id}>
                            <button
                                type="button"
                                onClick={() => setSelectedNote(note)}
                                className={`w-full rounded-xl border px-3 py-3 text-left transition-all duration-150 ${selectedNote?.id === note.id ? "border-accent/50 bg-accent/10" : "border-border/60 hover:border-accent/30 hover:bg-surface/80"}`}
                            >
                                <p className="truncate text-sm font-semibold text-foreground">
                                    {note.title ?? "Sem título"}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">{preview(note.content)}</p>
                                {note.step_title && (
                                    <span className="mt-1.5 inline-block rounded-full border border-accent-blue/40 bg-accent-blue/10 px-2 py-0.5 text-[10px] text-accent-blue">
                                        {note.step_title}
                                    </span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>

            {/* Editor panel */}
            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border">
                {selectedNote ? (
                    <>
                        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-foreground">
                                    {selectedNote.title ?? "Anotação sem título"}
                                </p>
                                {selectedNote.step_title && (
                                    <p className="mt-0.5 text-[11px] text-muted">
                                        Vinculada a: <span className="text-accent-blue">{selectedNote.step_title}</span>
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedNote.path_step_id && (
                                    <Link
                                        href={`/trilha`}
                                        title="Ir para a atividade"
                                        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition hover:text-foreground"
                                    >
                                        <ArrowLeft className="h-3 w-3" />
                                        Trilha
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleDelete(selectedNote.id)}
                                    title="Excluir anotação"
                                    className="rounded-lg border border-border p-1.5 text-muted transition hover:border-rose-700/50 hover:text-rose-400"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <NoteEditor
                            key={selectedNote.id}
                            initialContent={selectedNote.content}
                            onSave={(content) => handleSave(selectedNote.id, content)}
                            className="flex-1 p-4"
                        />
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted">
                        <p className="text-sm">Selecione uma anotação ou crie uma nova.</p>
                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={creating}
                            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-background hover:bg-accent-hover disabled:opacity-60"
                        >
                            <Plus className="h-4 w-4" />
                            Nova anotação
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NoteEditorProps = {
    initialContent: string;
    onSave: (content: string) => Promise<void>;
    /** Extra classes for the outer wrapper */
    className?: string;
    placeholder?: string;
};

type SaveState = "idle" | "saving" | "saved";

export function NoteEditor({ initialContent, onSave, className = "", placeholder }: NoteEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track whether content has diverged from what was last saved
    const savedContentRef = useRef(initialContent);

    // Sync when the parent provides a different initial value (e.g. note loaded async)
    useEffect(() => {
        setContent(initialContent);
        savedContentRef.current = initialContent;
    }, [initialContent]);

    function handleChange(value: string) {
        setContent(value);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (value === savedContentRef.current) {
            setSaveState("idle");
            return;
        }

        setSaveState("saving");
        debounceRef.current = setTimeout(async () => {
            try {
                await onSave(value);
                savedContentRef.current = value;
                setSaveState("saved");
                // Fade the "salvo" indicator after 2s
                setTimeout(() => setSaveState("idle"), 2000);
            } catch {
                setSaveState("idle");
            }
        }, 900);
    }

    // Flush on unmount if there's a pending save
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return (
        <div className={`flex flex-col ${className}`}>
            {/* Status indicator */}
            <div className="flex h-5 items-center justify-end px-1">
                {saveState === "saving" && (
                    <span className="flex items-center gap-1 text-[11px] text-muted">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        Salvando…
                    </span>
                )}
                {saveState === "saved" && (
                    <span className="flex items-center gap-1 text-[11px] text-accent-blue transition-opacity">
                        <Check className="h-2.5 w-2.5" />
                        Salvo
                    </span>
                )}
            </div>

            {/* Editor */}
            <textarea
                value={content}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder ?? "Escreva suas anotações aqui… (markdown suportado)"}
                className="flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                spellCheck={false}
            />
        </div>
    );
}

"use client";

import { motion } from "framer-motion";
import { Loader2, Lock, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { CareerPath } from "@/lib/types";

// ── Deterministic starfield ───────────────────────────────────────────────────
// LCG avoids Math.random() so positions are stable across renders/hydration.

function lcg(n: number): number {
    return ((n * 1664525 + 1013904223) >>> 0) / 0x100000000;
}

const STARS = Array.from({ length: 70 }, (_, i) => ({
    x: lcg(i * 3) * 100,
    y: lcg(i * 3 + 1) * 100,
    size: lcg(i * 3 + 2) < 0.55 ? 1 : lcg(i * 3 + 2) < 0.85 ? 1.5 : 2,
    opacity: 0.22 + lcg(i * 7) * 0.45,
    twinkle: i % 9 === 0,
    delay: lcg(i * 11) * 2.5,
    duration: 2.2 + lcg(i * 13) * 2,
}));

// ── Planet sizing ─────────────────────────────────────────────────────────────

const KIND_CFG: Record<string, { bodySize: number; ringGap: number; ringStroke: number }> = {
    AI_PERSONALIZED: { bodySize: 88, ringGap: 9, ringStroke: 4 },
    STANDARD_SOFT_SKILLS: { bodySize: 72, ringGap: 7, ringStroke: 3 },
};
const DEFAULT_CFG = KIND_CFG.STANDARD_SOFT_SKILLS;

function kCfg(kind: string) { return KIND_CFG[kind] ?? DEFAULT_CFG; }

// The wrapper div size equals the planet body + ring on all sides.
function wrapSize(kind: string): number {
    const c = kCfg(kind);
    return c.bodySize + 2 * (c.ringGap + c.ringStroke);
}

// ── Progress ring (SVG) ───────────────────────────────────────────────────────
// Positioned absolute inset-0 inside the wrapper div — no negative offsets.

function ProgressRing({ kind, pct, color }: { kind: string; pct: number; color: string }) {
    const { bodySize, ringGap, ringStroke } = kCfg(kind);
    const ws = wrapSize(kind);           // SVG fills the wrapper exactly
    const cx = ws / 2;                   // ring centre == wrapper centre
    const r = bodySize / 2 + ringGap;  // ring radius
    const circumference = 2 * Math.PI * r;
    const clampedPct = Math.min(100, Math.max(0, pct));
    // offset=0 → full circle; offset=circumference → empty
    const offset = circumference * (1 - clampedPct / 100);

    return (
        <svg
            width={ws}
            height={ws}
            className="pointer-events-none absolute inset-0"
            aria-hidden
        >
            {/* Track ring */}
            <circle
                cx={cx} cy={cx} r={r}
                fill="none"
                stroke="rgba(122,117,133,0.16)"
                strokeWidth={ringStroke}
            />
            {/* Progress arc — only drawn when there is actual progress */}
            {clampedPct > 0 && (
                <circle
                    cx={cx} cy={cx} r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={ringStroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    // Start from 12-o'clock
                    style={{
                        transform: "rotate(-90deg)",
                        transformOrigin: `${cx}px ${cx}px`,
                        transition: "stroke-dashoffset 0.9s ease",
                    }}
                />
            )}
        </svg>
    );
}

// ── Planet placement algorithm ────────────────────────────────────────────────

type Placed = { trail: CareerPath; cx: number; cy: number };

function placePlanets(paths: CareerPath[], w: number, h: number): Placed[] {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.5 - 110;

    const ai = paths.filter((p) => p.kind === "AI_PERSONALIZED");
    const soft = paths.filter((p) => p.kind === "STANDARD_SOFT_SKILLS");
    const other = paths.filter((p) => p.kind !== "AI_PERSONALIZED" && p.kind !== "STANDARD_SOFT_SKILLS");

    const result: Placed[] = [];

    // AI: single → dead-center; multiple → tight inner cluster
    if (ai.length === 1) {
        result.push({ trail: ai[0], cx, cy });
    } else {
        const r = 70;
        ai.forEach((t, i) => {
            const a = (i / ai.length) * Math.PI * 2 - Math.PI / 2;
            result.push({ trail: t, cx: cx + r * Math.cos(a), cy: cy + r * Math.sin(a) });
        });
    }

    // Soft skills: middle orbit
    if (soft.length > 0) {
        const r = Math.min(maxR * 0.65, 230);
        soft.forEach((t, i) => {
            const a = (i / soft.length) * Math.PI * 2 - Math.PI / 2;
            result.push({ trail: t, cx: cx + r * Math.cos(a), cy: cy + r * Math.sin(a) });
        });
    }

    // Future kinds: outer orbit
    if (other.length > 0) {
        const r = Math.min(maxR * 0.9, 320);
        other.forEach((t, i) => {
            const a = (i / other.length) * Math.PI * 2 - Math.PI / 4;
            result.push({ trail: t, cx: cx + r * Math.cos(a), cy: cy + r * Math.sin(a) });
        });
    }

    return result;
}

// ── Visual tokens (teal palette only) ────────────────────────────────────────

type Tokens = {
    bodyGradient: string;
    glow: string;
    ringColor: string;
    labelCls: string;
    dim: boolean;
    generating: boolean;
    locked: boolean;
};

function getTokens(trail: CareerPath, hasSubscription: boolean): Tokens {
    const isAI = trail.kind === "AI_PERSONALIZED";
    const isGenerating = trail.status === "GENERATING";
    const isLocked = isAI && !hasSubscription && !isGenerating;

    if (isGenerating) return {
        bodyGradient: "from-[color:var(--accent-blue)] to-[color:var(--accent-purple)]",
        glow: "0 0 24px 8px rgba(75,123,236,0.18)",
        ringColor: "#4B7BEC",
        labelCls: "text-foreground",
        dim: false, generating: true, locked: false,
    };
    if (isLocked) return {
        bodyGradient: "from-white to-[color:var(--surface-hover)]",
        glow: "0 0 0 rgba(0,0,0,0)",
        ringColor: "#D8D0E6",
        labelCls: "text-muted",
        dim: true, generating: false, locked: true,
    };
    if (isAI) return {
        // Primary / brighter teal: the centrepiece planet
        bodyGradient: "from-[color:var(--accent-purple)] to-[color:var(--accent-blue)]",
        glow: "0 0 28px 8px rgba(155,114,242,0.22)",
        ringColor: "#9B72F2",
        labelCls: "text-foreground",
        dim: false, generating: false, locked: false,
    };
    // STANDARD_SOFT_SKILLS: cooler/deeper teal — same family, distinct enough
    return {
        bodyGradient: "from-[color:var(--accent-mint)] to-[color:var(--accent-blue)]",
        glow: "0 0 24px 7px rgba(46,217,165,0.16)",
        ringColor: "#2ED9A5",
        labelCls: "text-foreground",
        dim: false, generating: false, locked: false,
    };
}

// ── Planet node ───────────────────────────────────────────────────────────────

function Planet({ placed, pct, hasSubscription, onClick }: {
    placed: Placed;
    pct: number;
    hasSubscription: boolean;
    onClick: () => void;
}) {
    const { trail, cx, cy } = placed;
    const tk = getTokens(trail, hasSubscription);
    const originLabel = trail.kind === "AI_PERSONALIZED" ? "Personalizado por IA" : "Base curada";
    const { bodySize, ringGap, ringStroke } = kCfg(trail.kind);
    const ws = wrapSize(trail.kind);

    const completed = trail.steps.filter((s) => s.status === "COMPLETED").length;
    const subtitle = tk.generating
        ? "Gerando com IA…"
        : tk.locked
            ? "Premium · Clique para desbloquear"
            : trail.steps.length > 0
                ? `${completed}/${trail.steps.length} etapas`
                : "";

    return (
        <motion.div
            className="absolute"
            style={{ left: cx - ws / 2, top: cy - ws / 2, width: ws, height: ws }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 18, delay: 0.15 }}
        >
            {/* SVG ring sits at inset-0 of the wrapper */}
            <ProgressRing kind={trail.kind} pct={tk.dim ? 0 : pct} color={tk.ringColor} />

            {/* Planet body: offset inside the wrapper by ring space */}
            <button
                type="button"
                onClick={onClick}
                className={`absolute flex items-center justify-center rounded-full bg-gradient-to-br ${tk.bodyGradient} ${tk.dim ? "opacity-50" : ""} transition-all duration-200 hover:scale-110 hover:brightness-115 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
                style={{
                    left: ringGap + ringStroke,
                    top: ringGap + ringStroke,
                    width: bodySize,
                    height: bodySize,
                    boxShadow: tk.glow,
                }}
            >
                {tk.generating && <Loader2 className="h-6 w-6 animate-spin text-white" />}
                {tk.locked && <Lock className="h-5 w-5 text-[color:var(--accent-coral)]" />}

                {/* Pulse ring on generating state */}
                {tk.generating && (
                    <motion.span
                        className="absolute inset-0 rounded-full border-2 border-[color:var(--accent-purple)]/35"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                )}
            </button>

            {/* Label below the ring */}
            <div
                className="pointer-events-none absolute w-max max-w-[180px] text-center"
                style={{ left: ws / 2, top: ws + 8, transform: "translateX(-50%)" }}
            >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{originLabel}</p>
                <p className={`text-xs font-bold leading-tight ${tk.labelCls} ${tk.dim ? "opacity-60" : ""}`}>
                    {trail.title}
                </p>
                {subtitle && (
                    <p className="mt-0.5 text-[10px] text-muted">{subtitle}</p>
                )}
            </div>
        </motion.div>
    );
}

// ── Constellation connection lines ────────────────────────────────────────────

function ConnectionLines({ placed, w, h }: { placed: Placed[]; w: number; h: number }) {
    if (placed.length < 2) return null;

    // Connect every pair of planets (fine for small N; for large N limit to nearest neighbours)
    const pairs: [Placed, Placed][] = [];
    for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
            pairs.push([placed[i], placed[j]]);
        }
    }

    return (
        <svg
            aria-hidden
            className="pointer-events-none absolute inset-0"
            width={w}
            height={h}
        >
            {pairs.map(([a, b], idx) => (
                <line
                    key={idx}
                    x1={a.cx} y1={a.cy}
                    x2={b.cx} y2={b.cy}
                    stroke="rgba(122,117,133,0.18)"
                    strokeWidth="1"
                    strokeLinecap="round"
                />
            ))}
        </svg>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────

type ConstellationViewProps = {
    paths: CareerPath[];
    hasSubscription: boolean;
    onAddTrail: () => void;
};

export function ConstellationView({ paths, hasSubscription, onAddTrail }: ConstellationViewProps) {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ w: 0, h: 0 });
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setDims({ w: width, h: height });
        });
        obs.observe(el);
        setDims({ w: el.clientWidth, h: el.clientHeight });
        return () => obs.disconnect();
    }, []);

    function handleClick(trail: CareerPath) {
        const href = trail.status === "GENERATING"
            ? `/trilha/gerando?career_path_id=${trail.id}`
            : trail.kind === "AI_PERSONALIZED" && !hasSubscription
                ? "/paywall"
                : `/trilha/${trail.id}`;
        setExiting(true);
        setTimeout(() => router.push(href), 360);
    }

    const placed = dims.w > 0 ? placePlanets(paths, dims.w, dims.h) : [];

    return (
        <motion.div
            ref={containerRef}
            className="relative h-full w-full overflow-hidden rounded-3xl border border-white/30 shadow-[0_22px_50px_rgba(99,78,117,0.08)]"
            style={{
                background: "linear-gradient(135deg, var(--background-gradient-start), var(--background-gradient-end))",
            }}
            animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.06 : 1 }}
            transition={{ duration: 0.35 }}
        >
            {/* Starfield — static divs for non-twinkling, motion.div for twinkling */}
            {STARS.map((s, i) =>
                s.twinkle ? (
                    <motion.div
                        key={i}
                        aria-hidden
                        className="absolute rounded-full bg-white/60"
                        style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
                        initial={{ opacity: s.opacity }}
                        animate={{ opacity: [s.opacity, s.opacity * 0.15, s.opacity] }}
                        transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
                    />
                ) : (
                    <div
                        key={i}
                        aria-hidden
                        className="absolute rounded-full bg-white/45"
                        style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.opacity }}
                    />
                )
            )}

            {/* Constellation connection lines — rendered below the planets */}
            {dims.w > 0 && (
                <ConnectionLines placed={placed} w={dims.w} h={dims.h} />
            )}

            {/* Planets */}
            {placed.map((p) => {
                const completed = p.trail.steps.filter((s) => s.status === "COMPLETED").length;
                const total = p.trail.steps.length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                    <Planet
                        key={p.trail.id}
                        placed={p}
                        pct={pct}
                        hasSubscription={hasSubscription}
                        onClick={() => handleClick(p.trail)}
                    />
                );
            })}

            {dims.w > 0 && (
                <motion.button
                    type="button"
                    onClick={onAddTrail}
                    className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-[color:var(--accent-purple)] shadow-[0_16px_36px_rgba(155,114,242,0.16)] transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-purple)]"
                    style={{ left: dims.w / 2 - 32, top: Math.max(18, dims.h - 92) }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.2 }}
                >
                    <Plus className="h-7 w-7" />
                    <span className="sr-only">Adicionar trilha</span>
                </motion.button>
            )}

            {placed.length === 0 && dims.w > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-muted">Nenhuma trilha encontrada.</p>
                </div>
            )}
        </motion.div>
    );
}


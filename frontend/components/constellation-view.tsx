"use client";

import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { CareerPath } from "@/lib/types";

// ── Deterministic starfield ───────────────────────────────────────────────────
// LCG avoids Math.random() so positions are stable across renders/hydration.

function lcg(n: number): number {
    return ((n * 1664525 + 1013904223) >>> 0) / 0x100000000;
}

const STARS = Array.from({ length: 120 }, (_, i) => ({
    x: lcg(i * 3) * 100,
    y: lcg(i * 3 + 1) * 100,
    size: lcg(i * 3 + 2) < 0.55 ? 1 : lcg(i * 3 + 2) < 0.85 ? 1.5 : 2,
    opacity: 0.22 + lcg(i * 7) * 0.45,
    twinkle: i % 5 === 0,
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
                stroke="rgba(255,255,255,0.08)"
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
        bodyGradient: "from-teal-600 to-cyan-950",
        glow: "0 0 22px 6px rgba(20,184,166,0.45), 0 0 44px 12px rgba(6,182,212,0.15)",
        ringColor: "#14b8a6",
        labelCls: "text-teal-200",
        dim: false, generating: true, locked: false,
    };
    if (isLocked) return {
        bodyGradient: "from-zinc-700 to-zinc-900",
        glow: "0 0 10px 2px rgba(120,120,130,0.25)",
        ringColor: "#52525b",
        labelCls: "text-zinc-400",
        dim: true, generating: false, locked: true,
    };
    if (isAI) return {
        // Primary / brighter teal: the centrepiece planet
        bodyGradient: "from-teal-400 to-teal-800",
        glow: "0 0 36px 10px rgba(20,184,166,0.6), 0 0 72px 20px rgba(20,184,166,0.22)",
        ringColor: "#2dd4bf",
        labelCls: "text-teal-100",
        dim: false, generating: false, locked: false,
    };
    // STANDARD_SOFT_SKILLS: cooler/deeper teal — same family, distinct enough
    return {
        bodyGradient: "from-teal-600 to-slate-800",
        glow: "0 0 22px 6px rgba(20,184,166,0.38), 0 0 44px 10px rgba(20,184,166,0.12)",
        ringColor: "#14b8a6",
        labelCls: "text-teal-200",
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
                {tk.generating && <Loader2 className="h-6 w-6 animate-spin text-teal-200" />}
                {tk.locked && <Lock className="h-5 w-5 text-amber-400" />}

                {/* Pulse ring on generating state */}
                {tk.generating && (
                    <motion.span
                        className="absolute inset-0 rounded-full border-2 border-teal-400/50"
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
                    stroke="rgba(255,255,255,0.13)"
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
};

export function ConstellationView({ paths, hasSubscription }: ConstellationViewProps) {
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
            ? "/trilha/gerando"
            : trail.kind === "AI_PERSONALIZED" && !hasSubscription
                ? "/paywall"
                : `/trilha?kind=${trail.kind}`;
        setExiting(true);
        setTimeout(() => router.push(href), 360);
    }

    const placed = dims.w > 0 ? placePlanets(paths, dims.w, dims.h) : [];

    return (
        <motion.div
            ref={containerRef}
            className="relative h-full w-full overflow-hidden rounded-2xl border border-border/30"
            style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, #0c1e38 0%, #030609 100%)" }}
            animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.06 : 1 }}
            transition={{ duration: 0.35 }}
        >
            {/* Starfield — static divs for non-twinkling, motion.div for twinkling */}
            {STARS.map((s, i) =>
                s.twinkle ? (
                    <motion.div
                        key={i}
                        aria-hidden
                        className="absolute rounded-full bg-white"
                        style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
                        initial={{ opacity: s.opacity }}
                        animate={{ opacity: [s.opacity, s.opacity * 0.15, s.opacity] }}
                        transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
                    />
                ) : (
                    <div
                        key={i}
                        aria-hidden
                        className="absolute rounded-full bg-white"
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

            {placed.length === 0 && dims.w > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-muted">Nenhuma trilha encontrada.</p>
                </div>
            )}
        </motion.div>
    );
}


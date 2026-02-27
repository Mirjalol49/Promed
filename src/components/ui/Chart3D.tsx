import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCompactNumber, formatCurrency } from '../../lib/formatters';
import { useLanguage } from '../../contexts/LanguageContext';

/* ─────────────────────────── Types ─────────────────────────── */
export interface Group3DData {
    label: string;
    fullLabel?: string;
    kirim: number;
    xarajat: number;
    sof: number;
}

interface Chart3DProps {
    data: Group3DData[];
    maxBarHeight?: number;
}

/* ─────────────────────── Color System ──────────────────────── */
const PALETTE = {
    green: {
        frontFrom: '#34d399',
        frontTo: '#059669',
        sideFrom: '#047857',
        sideTo: '#065f46',
        topFrom: '#6ee7b7',
        topMid: '#34d399',
        topTo: '#10b981',
        shadow: 'rgba(16, 185, 129, 0.25)',
        label: '#059669',
        dot: '#10b981',
    },
    rose: {
        frontFrom: '#fb7185',
        frontTo: '#e11d48',
        sideFrom: '#be185d',
        sideTo: '#9f1239',
        topFrom: '#fda4af',
        topMid: '#fb7185',
        topTo: '#f43f5e',
        shadow: 'rgba(225, 29, 72, 0.22)',
        label: '#e11d48',
        dot: '#f43f5e',
    },
    blue: {
        frontFrom: '#60a5fa',
        frontTo: '#2563eb',
        sideFrom: '#1d4ed8',
        sideTo: '#1e40af',
        topFrom: '#93c5fd',
        topMid: '#60a5fa',
        topTo: '#3b82f6',
        shadow: 'rgba(37, 99, 235, 0.22)',
        label: '#2563eb',
        dot: '#3b82f6',
    },
} as const;

/* ─────────────────── Motion Preferences ────────────────────── */
const getReducedMotion = () =>
    typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

const SKEW = 45;

/* ────────────────── Portal Tooltip (mobile-safe) ────────────────── */
const TOOLTIP_W = 240;
const TOOLTIP_H = 160;
const TOOLTIP_MARGIN = 12;

interface TooltipPortalProps {
    anchorRef: React.RefObject<HTMLElement>;
    visible: boolean;
    group: Group3DData;
    labels: { kirim: string; xarajat: string; sof: string };
    /** Extend the hover zone into the tooltip itself to prevent flicker */
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

const TooltipPortal: React.FC<TooltipPortalProps> = ({ anchorRef, visible, group, labels, onMouseEnter, onMouseLeave }) => {
    const [pos, setPos] = useState<{ top: number; left: number; transformOrigin: string } | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const safe = getReducedMotion();

    const updatePos = useCallback(() => {
        if (!anchorRef.current || !visible) return;
        const rect = anchorRef.current.getBoundingClientRect();
        const vpW = window.innerWidth;

        // Use viewport-relative coordinates (position: fixed)
        // Prefer above the bar group; fall back to below if not enough room
        // Center-x and above-y
        let left = rect.left + rect.width / 2;

        // Measure or estimate dynamic toolkit dimensions
        const vpH = window.innerHeight;

        // Use a more realistic dynamic width for clamping (max-w is 100vw-32px)
        const estimatedW = Math.min(320, vpW - 32);
        const estimatedH = 180;

        let top = rect.top - estimatedH - TOOLTIP_MARGIN;
        let transformOrigin: string;

        if (top < 20) {
            top = rect.bottom + TOOLTIP_MARGIN;
            transformOrigin = 'top center';
        } else {
            transformOrigin = 'bottom center';
        }

        const margin = 12;

        // Clamp left so the centered tooltip doesn't bleed off sides
        left = Math.max(estimatedW / 2 + margin, Math.min(vpW - estimatedW / 2 - margin, left));

        setPos({ top, left, transformOrigin });
    }, [anchorRef, visible]);

    useEffect(() => {
        if (visible) {
            updatePos();
            window.addEventListener('scroll', updatePos, { passive: true });
            window.addEventListener('resize', updatePos, { passive: true });
        }
        return () => {
            window.removeEventListener('scroll', updatePos);
            window.removeEventListener('resize', updatePos);
        };
    }, [visible, updatePos]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {visible && pos && (
                <motion.div
                    ref={tooltipRef as any}
                    key="chart-tooltip"
                    initial={{ opacity: 0, scale: 0.95, y: 10, x: '-50%' }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                    exit={safe ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 4 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        left: pos.left,
                        zIndex: 9999,
                        pointerEvents: 'none',
                    }}
                >
                    <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-4 shadow-2xl overflow-hidden min-w-[200px] max-w-[calc(100vw-32px)]">
                        {/* Rainbow accent bar */}
                        <div className="w-full h-1.5 bg-gradient-to-r from-emerald-400 via-blue-500 to-rose-400 rounded-full opacity-90 shadow-sm mb-3" />

                        <p className="text-slate-400 font-bold text-[10px] mb-3 uppercase tracking-[0.15em] border-b border-slate-100 pb-2.5 truncate">
                            {group.fullLabel || group.label}
                        </p>

                        <div className="flex flex-col gap-2.5">
                            {[
                                { key: labels.kirim, val: group.kirim, c: PALETTE.green },
                                { key: labels.xarajat, val: group.xarajat, c: PALETTE.rose },
                                { key: labels.sof, val: group.sof, c: PALETTE.blue },
                            ].map(item => (
                                <div key={item.key} className="flex items-center justify-between gap-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full ring-[3px] shadow-sm ring-white flex-shrink-0"
                                            style={{ backgroundColor: item.c.dot }}
                                        />
                                        <span className="text-[13px] font-bold text-slate-600">{item.key}</span>
                                    </div>
                                    <span className="text-[13px] font-black tracking-tight" style={{ color: item.c.label }}>
                                        {formatCurrency(item.val)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};


/* ─────────────────────── Single 3D Bar ─────────────────────── */
const Bar3DItem: React.FC<{
    value: number;
    color: 'green' | 'rose' | 'blue';
    pct: number;
    idx: number;
    isGroupHovered: boolean;
    barW: number;
    depth: number;
}> = ({ color, pct, idx, isGroupHovered, barW, depth }) => {
    const c = PALETTE[color];
    const safe = getReducedMotion();

    return (
        <div className="flex flex-col items-center relative h-full" style={{ zIndex: 10 - idx }}>
            <motion.div
                className="relative cursor-pointer transition-all duration-300 h-full"
                style={{
                    width: barW + depth,
                    display: 'flex',
                    alignItems: 'flex-end',
                    paddingBottom: depth,
                }}
                animate={isGroupHovered ? { y: -5, scale: 1.02 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
                <div
                    className="relative"
                    style={{ width: barW, height: `${Math.max(1, pct)}%` }}
                >
                    <motion.div
                        className="w-full absolute bottom-0 origin-bottom"
                        initial={safe ? { height: '100%' } : { height: '0%' }}
                        animate={{ height: '100%' }}
                        transition={{
                            delay: 0.1 + idx * 0.08,
                            duration: 0.65,
                            ease: [0.34, 1.2, 0.64, 1],
                        }}
                    >
                        {/* ▌ FRONT face */}
                        <div
                            className={`absolute inset-x-0 bottom-0 rounded-[2px] overflow-hidden transition-all duration-300 ${isGroupHovered ? 'brightness-110' : ''}`}
                            style={{
                                height: '100%',
                                background: `linear-gradient(180deg, ${c.frontFrom} 0%, ${c.frontTo} 100%)`,
                                boxShadow: `0 6px 20px -4px ${c.shadow}`,
                                zIndex: 3,
                            }}
                        >
                            <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 25%, transparent 60%)` }} />
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 100%)' }} />
                            <div className="absolute right-0 top-0 bottom-0 w-[2px] pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0.05) 100%)' }} />
                        </div>

                        {/* ▌ RIGHT SIDE face */}
                        <div
                            className={`absolute bottom-0 overflow-hidden transition-all duration-300 ${isGroupHovered ? 'brightness-110' : ''}`}
                            style={{
                                height: '100%',
                                width: depth,
                                left: '100%',
                                background: `linear-gradient(180deg, ${c.sideFrom} 0%, ${c.sideTo} 100%)`,
                                transformOrigin: 'bottom left',
                                transform: `skewY(-${SKEW}deg)`,
                                borderRadius: '0 2px 2px 0',
                                zIndex: 2,
                            }}
                        >
                            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.04) 100%)' }} />
                            <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-white/10 pointer-events-none" />
                        </div>

                        {/* ▌ TOP face */}
                        <div
                            className={`absolute left-0 overflow-hidden shadow-sm transition-all duration-300 ${isGroupHovered ? 'brightness-110' : ''}`}
                            style={{
                                width: '100%',
                                height: depth,
                                bottom: '100%',
                                background: `linear-gradient(135deg, ${c.topFrom} 0%, ${c.topMid} 40%, ${c.topTo} 100%)`,
                                transformOrigin: 'bottom left',
                                transform: `skewX(-${SKEW}deg)`,
                                borderRadius: '2px',
                                zIndex: 4,
                            }}
                        >
                            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 45%, transparent 70%)' }} />
                        </div>
                    </motion.div>
                </div>

                {/* ▌ Floor shadow */}
                <motion.div
                    className="absolute bottom-[2px] left-[-4px] pointer-events-none rounded-full transition-all duration-300"
                    style={{
                        width: barW + depth + 4,
                        height: depth * 0.8,
                        background: c.shadow,
                        filter: isGroupHovered ? 'blur(8px)' : 'blur(4px)',
                        opacity: isGroupHovered ? 0.7 : 1,
                        zIndex: 1,
                    }}
                    initial={safe ? {} : { opacity: 0, scale: 0.5 }}
                    animate={{ scale: isGroupHovered ? 1.15 : 1 }}
                    transition={{ delay: 0.1 + idx * 0.08, duration: 0.7 }}
                />
            </motion.div>
        </div>
    );
};

/* ────────────────────── Group Wrapper ─────────────────────── */
const Group3D: React.FC<{
    group: Group3DData;
    chartMax: number;
    maxH: number;
    barW: number;
    depth: number;
    gap: number;
    alignEdge?: 'left' | 'center' | 'right';
    isDense?: boolean;
    labels: { kirim: string; xarajat: string; sof: string };
}> = ({ group, chartMax, maxH, barW, depth, gap, alignEdge = 'center', isDense, labels }) => {
    const [isHovered, setIsHovered] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);
    // Debounce ref — prevents flicker when cursor briefly clips sub-element boundaries
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleEnter = useCallback(() => {
        if (leaveTimerRef.current) {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
        }
        setIsHovered(true);
    }, []);

    const handleLeave = useCallback(() => {
        leaveTimerRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 80);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        };
    }, []);

    // Close tooltip on outside touch/scroll
    useEffect(() => {
        if (!isHovered) return;
        const onOutside = () => setIsHovered(false);
        window.addEventListener('touchstart', onOutside, { passive: true, once: true });
        return () => window.removeEventListener('touchstart', onOutside);
    }, [isHovered]);

    return (
        <div
            ref={anchorRef as any}
            className="relative flex flex-col items-center group cursor-pointer flex-1"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onTouchStart={(e) => { e.stopPropagation(); setIsHovered(v => !v); }}
        >
            {/* Portal tooltip — escapes all overflow/clip contexts.
                onMouseEnter/Leave are passed so hovering the floating card
                cancels the leave timer — tooltip + bar = one unified hover zone. */}
            <TooltipPortal
                anchorRef={anchorRef as React.RefObject<HTMLElement>}
                visible={isHovered}
                group={group}
                labels={labels}
                onMouseEnter={handleEnter}
                onMouseLeave={handleLeave}
            />

            {/* Bars Box container */}
            <div className="flex items-end justify-center w-full" style={{ height: maxH + depth, gap: `${gap}px` }}>
                <Bar3DItem value={group.kirim} color="green" pct={chartMax > 0 ? (group.kirim / chartMax) * 100 : 0} idx={0} isGroupHovered={isHovered} barW={barW} depth={depth} />
                <Bar3DItem value={group.xarajat} color="rose" pct={chartMax > 0 ? (group.xarajat / chartMax) * 100 : 0} idx={1} isGroupHovered={isHovered} barW={barW} depth={depth} />
                <Bar3DItem value={group.sof} color="blue" pct={chartMax > 0 ? (group.sof / chartMax) * 100 : 0} idx={2} isGroupHovered={isHovered} barW={barW} depth={depth} />
            </div>

            {/* X-Axis Dynamic Label */}
            <div className="mt-4 md:mt-5 flex items-center justify-center h-10 md:h-8 w-full relative">
                <span
                    className={`absolute top-0 text-[10px] font-bold text-[#64748B] tracking-tight uppercase select-none transition-colors duration-300 group-hover:text-slate-800 break-words flex
                        ${isDense ? 'scale-90 md:scale-100 origin-top' : ''}
                        ${alignEdge === 'left' ? 'left-0 justify-start text-left w-[120%]' : alignEdge === 'right' ? 'right-0 justify-end text-right w-[120%]' : 'left-1/2 -translate-x-1/2 justify-center text-center w-[130%]'}
                    `}
                >
                    {isDense && group.label.length > 5 ? (
                        <span className="-rotate-12 translate-y-1 md:rotate-0 md:translate-y-0 inline-block">{group.label}</span>
                    ) : group.label}
                </span>
            </div>
        </div>
    );
};


/* ────────────────────── Main Component ─────────────────────── */
export const Chart3D: React.FC<Chart3DProps> = ({ data, maxBarHeight = 220 }) => {
    const { t } = useLanguage();

    const labels = {
        kirim: t('income') || 'Kirim',
        xarajat: t('expense') || 'Xarajat',
        sof: t('net_profit') || 'Sof Foyda',
    };

    const len = Math.max(1, data.length);
    let barW = 32;
    let depth = 22;
    let gap = 12;

    if (len > 8) {
        barW = 10;
        depth = 6;
        gap = 2;
    } else if (len >= 5) {
        barW = 20;
        depth = 12;
        gap = 4;
    }

    const maxValRaw = useMemo(() => {
        let currentMax = 100;
        data.forEach(group => {
            currentMax = Math.max(currentMax, group.kirim, group.xarajat, group.sof);
        });
        return currentMax;
    }, [data]);

    const chartMax = useMemo(() => {
        const magnitude = Math.pow(10, Math.floor(Math.log10(maxValRaw)));
        const normalized = maxValRaw / magnitude;
        let ceilNorm = 10;
        if (normalized <= 1.2) ceilNorm = 1.2;
        else if (normalized <= 2) ceilNorm = 2;
        else if (normalized <= 4) ceilNorm = 4;
        else if (normalized <= 5) ceilNorm = 5;
        else if (normalized <= 8) ceilNorm = 8;
        return ceilNorm * magnitude;
    }, [maxValRaw]);

    const ticks = [1, 0.75, 0.5, 0.25, 0];

    return (
        <div className="w-full flex flex-col items-center">
            {/* Global Legend — translated */}
            {/* Legend — pointer-events:none prevents this from intercepting
                mouse events when the tooltip portal overlaps it */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-1 mt-2 pointer-events-none select-none">
                {[
                    { label: labels.kirim.toUpperCase(), c: PALETTE.green },
                    { label: labels.xarajat.toUpperCase(), c: PALETTE.rose },
                    { label: labels.sof.toUpperCase(), c: PALETTE.blue },
                ].map((b) => (
                    <div key={b.label} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white" style={{ backgroundColor: b.c.dot }} />
                        <span className="text-[10px] md:text-xs font-bold text-slate-500 tracking-wider">
                            {b.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Interactive Chart & Grid Area */}
            <div className="w-full overflow-x-auto custom-scrollbar pb-3 pt-16 relative z-10 flex">

                {/* 1. Y-Axis Container */}
                <div className="sticky left-0 z-30 bg-white/95 backdrop-blur-xl w-[55px] md:w-[70px] flex-shrink-0 border-r border-slate-100">
                    <div className="absolute inset-x-0 pointer-events-none" style={{ bottom: depth + 36, height: maxBarHeight }}>
                        {ticks.map((tPct) => {
                            const tickValue = chartMax * tPct;
                            return (
                                <div key={tPct} className="absolute w-full flex items-center pr-3 md:pr-5" style={{ bottom: `${tPct * 100}%` }}>
                                    <div className="ml-auto flex shrink-0">
                                        <span className="text-[#64748B] text-[9px] md:text-[11px] font-bold tracking-wide bg-white/40 px-0.5 rounded">
                                            {tickValue === 0 ? '0' : formatCompactNumber(tickValue)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Data Scroll Area */}
                <div className="relative min-w-[500px] flex-1 flex flex-col pr-4">
                    {/* Horizontal Grid Lines */}
                    <div className="absolute inset-x-0 pointer-events-none" style={{ bottom: depth + 36, height: maxBarHeight, left: 0 }}>
                        {ticks.map((tPct) => (
                            <div key={tPct} className="absolute w-full border-t border-slate-200 opacity-40" style={{ bottom: `${tPct * 100}%`, borderTopStyle: 'dashed', borderTopWidth: 1 }} />
                        ))}
                    </div>

                    {/* Groups layout */}
                    <div className="relative z-10 flex items-end justify-between pt-4 w-full gap-2 pl-3 md:pl-4">
                        {data.map((group, idx) => (
                            <Group3D
                                key={group.label}
                                group={group}
                                chartMax={chartMax}
                                maxH={maxBarHeight}
                                barW={barW}
                                depth={depth}
                                gap={gap}
                                labels={labels}
                                alignEdge={
                                    idx === 0 || (len >= 5 && idx <= 1) ? 'left' :
                                        idx === len - 1 || (len >= 5 && idx >= len - 2) ? 'right' :
                                            'center'
                                }
                                isDense={len > 8}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

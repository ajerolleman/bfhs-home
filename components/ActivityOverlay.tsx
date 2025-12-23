import React, { useEffect, useMemo, useState } from 'react';
import { BLOCK_SCHEDULE } from '../constants';
import { UserProfile } from '../types';

interface ActivityOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile?: UserProfile | null;
    spotifySlotRef?: React.Ref<HTMLDivElement>;
}

function toTodayDate(timeHHMM: string) {
    const [h, m] = timeHHMM.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

function getCurrentBlock(now = new Date()) {
    for (const block of BLOCK_SCHEDULE) {
        const start = toTodayDate(block.start);
        const end = toTodayDate(block.end);
        if (now >= start && now < end) return { ...block, start, end, type: 'active' as const };
    }

    const firstStart = toTodayDate(BLOCK_SCHEDULE[0].start);
    const lastEnd = toTodayDate(BLOCK_SCHEDULE[BLOCK_SCHEDULE.length - 1].end);

    if (now < firstStart) return { name: 'Before school', start: now, end: firstStart, type: 'idle' as const };
    if (now >= lastEnd) return { name: 'School is out!', start: lastEnd, end: lastEnd, type: 'idle' as const };

    return { name: 'Schedule', start: now, end: null, type: 'idle' as const };
}

function formatCountdown(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');

    if (h > 0) {
        return `${h}h ${mm}m ${ss}s`;
    }
    return `${m}m ${ss}s`;
}

function getWeekNumber(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getDayType(date: Date): "A" | "B" | "Weekend" {
    const day = date.getDay();
    if (day === 0 || day === 6) return "Weekend";
    if (day === 1) return "A";
    if (day === 2) return "B";
    if (day === 3) return "A";
    if (day === 4) return "B";
    if (day === 5) {
        const weekNum = getWeekNumber(date);
        return (weekNum % 2 !== 0) ? "B" : "A";
    }
    return "A";
}

function getTimeParts(date: Date, includeSeconds = true) {
    const parts = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds ? { second: '2-digit' } : {}),
        hour12: true
    }).formatToParts(date);
    const time = parts
        .filter((part) => part.type !== 'dayPeriod')
        .map((part) => part.value)
        .join('')
        .trim();
    const period = parts.find((part) => part.type === 'dayPeriod')?.value ?? '';
    return { time, period };
}

const ActivityOverlay: React.FC<ActivityOverlayProps> = ({ isOpen, onClose, userProfile, spotifySlotRef }) => {
    const [now, setNow] = useState(new Date());
    const { time: timeString, period } = useMemo(() => getTimeParts(now, true), [now]);
    const { time: timeStringNoSeconds } = useMemo(() => getTimeParts(now, false), [now]);

    useEffect(() => {
        if (!isOpen) return;
        const tick = () => setNow(new Date());
        const id = window.setInterval(tick, 1000);
        tick();
        return () => window.clearInterval(id);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const originalBodyOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.documentElement.style.overflow = originalHtmlOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const blockInfo = useMemo(() => {
        const dayType = getDayType(now);
        if (dayType === "Weekend") {
            return { label: "Time until next period", detail: "No school today.", isFinalMinute: false, finalCountdown: "", isSchoolOut: false, isActive: false };
        }
        const block = getCurrentBlock(now);
        if (!block.end) {
            return { label: "Time until next period", detail: "Schedule loading...", isFinalMinute: false, finalCountdown: "", isSchoolOut: false, isActive: false };
        }

        const remaining = block.end.getTime() - now.getTime();
        const isFinalMinute = block.type === 'active' && remaining > 0 && remaining < 60 * 1000;
        const lastBlockEnd = toTodayDate(BLOCK_SCHEDULE[BLOCK_SCHEDULE.length - 1].end).getTime();
        const isLastBlock = block.type === 'active' && block.end.getTime() >= lastBlockEnd;
        let label = "Time until next period";
        const isSchoolOut = block.name === "School is out!";
        if (block.name === "School is out!") {
            label = "School is out";
        } else if (block.name === "Before school") {
            label = "Time until next period";
        } else if (block.end.getTime() >= lastBlockEnd) {
            label = "School ends in";
        }
        const detail =
            block.name === "School is out!"
                ? ""
                : formatCountdown(remaining);

        return {
            label,
            detail,
            isFinalMinute,
            finalCountdown: String(Math.max(0, Math.ceil(remaining / 1000))),
            isSchoolOut,
            isActive: block.type === 'active',
            isLastBlock,
        };
    }, [now, userProfile]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex min-h-screen flex-col overflow-hidden bg-[#0B1310] text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.22),_transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(16,185,129,0.28),_transparent_58%)]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B1310] via-[#11261E] to-[#0D1C17]" />
            <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
            <div className="relative z-10 flex min-h-screen flex-col px-6 py-8 md:px-10 md:py-10">
                <button
                    onClick={onClose}
                    className="absolute top-6 left-6 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.4em] font-semibold text-white/80 backdrop-blur hover:text-white hover:border-white/40 transition-colors"
                >
                    Back to Dashboard
                </button>
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.4em] font-semibold text-white/80 backdrop-blur hover:text-white hover:border-white/40 transition-colors"
                    title="Exit (Esc)"
                >
                    Esc
                </button>
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-6xl text-center">
                    {blockInfo.isSchoolOut ? (
                        <div className="flex flex-col items-center justify-center gap-6 min-h-[70vh]">
                            <div
                                className="font-black tabular-nums tracking-tight text-transparent bg-clip-text"
                                style={{
                                    fontSize: 'clamp(120px, 22vw, 280px)',
                                    lineHeight: 0.9,
                                    backgroundImage: 'linear-gradient(120deg, #FACC15, #FFFFFF)',
                                    textShadow: '0 24px 70px rgba(250, 204, 21, 0.18)',
                                }}
                            >
                                <span>{timeString}</span>
                                <span className="ml-4 align-top text-[0.25em] tracking-[0.25em] text-white/70">
                                    {period}
                                </span>
                            </div>
                            <div className="text-sm md:text-base uppercase tracking-[0.5em] text-white/70">
                                School is out
                            </div>
                        </div>
                    ) : blockInfo.isFinalMinute ? (
                            <div className="flex flex-col items-center gap-6">
                                <div className="text-[11px] uppercase tracking-[0.6em] text-falcon-gold/90">
                                    Final minute
                                </div>
                                <div
                                    className="font-black tabular-nums tracking-tight text-transparent bg-clip-text"
                                    style={{
                                        fontSize: 'clamp(160px, 28vw, 360px)',
                                        lineHeight: 0.86,
                                        backgroundImage: 'linear-gradient(120deg, #FACC15, #10B981)',
                                        textShadow: '0 30px 80px rgba(15, 118, 110, 0.25)',
                                    }}
                                >
                                    {blockInfo.finalCountdown}
                                </div>
                                <div className="text-sm md:text-base uppercase tracking-[0.45em] text-white/70">
                                    {blockInfo.isLastBlock ? 'Seconds until school ends' : 'Seconds to next class'}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-8">
                                <div className="text-[11px] uppercase tracking-[0.6em] text-white/60">
                                    Current time
                                </div>
                                <div
                                    className="font-black tabular-nums tracking-tight text-transparent bg-clip-text"
                                    style={{
                                        fontSize: 'clamp(120px, 20vw, 260px)',
                                        lineHeight: 0.9,
                                        backgroundImage: 'linear-gradient(120deg, #FACC15, #FFFFFF)',
                                        textShadow: '0 24px 70px rgba(250, 204, 21, 0.15)',
                                    }}
                                >
                                    <span>{blockInfo.isActive ? timeStringNoSeconds : timeString}</span>
                                    <span className="ml-3 align-top text-[0.28em] tracking-[0.25em] text-white/70">
                                        {period}
                                    </span>
                                </div>
                                <div className="text-[11px] uppercase tracking-[0.6em] text-white/60">
                                    {blockInfo.label}
                                </div>
                                {blockInfo.isActive && (
                                    <div
                                        className="font-black tabular-nums tracking-tight text-transparent bg-clip-text"
                                        style={{
                                            fontSize: 'clamp(44px, 9vw, 120px)',
                                            lineHeight: 0.98,
                                            backgroundImage: 'linear-gradient(120deg, #10B981, #FACC15)',
                                            textShadow: '0 20px 60px rgba(16, 185, 129, 0.16)',
                                        }}
                                    >
                                        {blockInfo.detail}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityOverlay;

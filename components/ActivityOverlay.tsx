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

const ActivityOverlay: React.FC<ActivityOverlayProps> = ({ isOpen, onClose, userProfile, spotifySlotRef }) => {
    const [now, setNow] = useState(new Date());

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
            return { label: "Time until next period", detail: "No school today." };
        }
        const block = getCurrentBlock(now);
        if (!block.end) {
            return { label: "Time until next period", detail: "Schedule loading..." };
        }

        const remaining = block.end.getTime() - now.getTime();
        const lastBlockEnd = toTodayDate(BLOCK_SCHEDULE[BLOCK_SCHEDULE.length - 1].end).getTime();
        let label = "Time until next period";
        if (block.name === "School is out!") {
            label = "School is out";
        } else if (block.name === "Before school") {
            label = "Time until next period";
        } else if (block.end.getTime() >= lastBlockEnd) {
            label = "School ends in";
        }
        const detail =
            block.name === "School is out!"
                ? "Enjoy your afternoon."
                : formatCountdown(remaining);

        return { label, detail };
    }, [now, userProfile]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-start px-6"
            style={{ backgroundColor: '#ffffff', color: '#111827' }}
        >
            <button
                onClick={onClose}
                className="absolute top-6 left-6 px-4 py-2 rounded-full border border-gray-200 text-xs uppercase tracking-[0.2em] font-bold text-gray-600 hover:text-black hover:border-gray-300 transition-colors"
            >
                Back to Dashboard
            </button>
            <button
                onClick={onClose}
                className="absolute top-6 right-6 px-4 py-2 rounded-full border border-gray-200 text-xs uppercase tracking-[0.2em] font-bold text-gray-600 hover:text-black hover:border-gray-300 transition-colors"
                title="Exit (Esc)"
            >
                Esc
            </button>
            <div
                className="pt-10 md:pt-16 font-black tracking-tight"
                style={{ fontSize: 'clamp(64px, 10vw, 160px)', lineHeight: 1 }}
            >
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="mt-6 text-xl md:text-2xl font-semibold text-gray-700 text-center">
                {blockInfo.label}
            </div>
            <div className="mt-2 text-lg md:text-xl text-gray-500 text-center">
                {blockInfo.detail}
            </div>
            <div className="mt-auto w-full max-w-4xl pb-10">
                <div ref={spotifySlotRef} className="w-full" />
            </div>
        </div>
    );
};

export default ActivityOverlay;

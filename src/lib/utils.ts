import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, startOfHour } from 'date-fns';
import {
    STALE_THRESHOLD_MS,
    FilterType,
    TIMEZONE,
} from '@/config/constants';
import { useLanguageStore } from '@/store/useLanguageStore';

function getLocale() {
    if (typeof window === 'undefined') return 'vi-VN';
    return useLanguageStore.getState().language === 'en' ? 'en-US' : 'vi-VN';
}

/** Merge Tailwind classes */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Format power value: 1 decimal (spec 5.2) */
export function formatPower(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString(getLocale(), {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
}

/** Format energy value: 2 decimals (spec 5.2) */
export function formatEnergy(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString(getLocale(), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/** Format currency VNĐ: thousands sep, no decimals (spec 5.2) */
export function formatCurrency(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString(getLocale(), {
        maximumFractionDigits: 0,
    });
}

/** Format revenue in KVNĐ (data is already divided by backend): thousands sep, 1 decimal */
export function formatRevenueKVND(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString(getLocale(), {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
}

/**
 * Check if realtime data is stale (spec 5.3):
 * - Prefer source_ts
 * - Fallback to updated_at
 * - Stale if older than 30s vs client time
 */
export function isStale(
    sourceTs: string | null | undefined,
    updatedAt: string | null | undefined,
): boolean {
    const ts = sourceTs || updatedAt;
    if (!ts) return true;
    const age = Date.now() - new Date(ts).getTime();
    return age > STALE_THRESHOLD_MS;
}

/**
 * Get date range [from, to] as ISO strings based on filterType and selectedDate.
 */
export function getDateRange(
    filterType: FilterType,
    selectedDate: Date,
): { from: string; to: string } {
    const d = new Date(selectedDate);

    switch (filterType) {
        case FilterType.DAY: {
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            return { from: start.toISOString(), to: end.toISOString() };
        }
        case FilterType.WEEK: {
            const dayOfWeek = d.getDay();
            // Nếu là Chủ Nhật (0), lùi về thứ Hai (-6 ngày). Nếu không, lấy ngày hiện tại trừ đi (dayOfWeek - 1)
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

            const start = new Date(d);
            start.setDate(d.getDate() + diffToMonday);
            start.setHours(0, 0, 0, 0);

            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            return { from: start.toISOString(), to: end.toISOString() };
        }
        case FilterType.MONTH: {
            const start = new Date(d.getFullYear(), d.getMonth(), 1);
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
            return { from: start.toISOString(), to: end.toISOString() };
        }
        case FilterType.QUARTER: {
            const quarterMonth = Math.floor(d.getMonth() / 3) * 3;
            const start = new Date(d.getFullYear(), quarterMonth, 1);
            const end = new Date(d.getFullYear(), quarterMonth + 3, 1);
            return { from: start.toISOString(), to: end.toISOString() };
        }
        case FilterType.YEAR: {
            const start = new Date(d.getFullYear(), 0, 1);
            const end = new Date(d.getFullYear() + 1, 0, 1);
            return { from: start.toISOString(), to: end.toISOString() };
        }
    }
}

/** Format chart label based on filter type */
export function formatChartLabel(ts: string, filterType: FilterType): string {
    const d = new Date(ts);
    switch (filterType) {
        case FilterType.DAY:
            return format(startOfHour(d), 'HH:mm');
        case FilterType.WEEK:
        case FilterType.MONTH:
            return format(d, 'dd/MM');
        case FilterType.QUARTER:
            return format(d, 'MM/yyyy');
        case FilterType.YEAR:
            return format(d, 'MM/yyyy');
    }
}

/** Format system time display */
export function formatSystemTime(date: Date): string {
    return format(date, 'HH:mm:ss dd/MM/yyyy');
}

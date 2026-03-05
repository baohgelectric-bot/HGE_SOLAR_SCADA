'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { COMPARISON_SCOPES, SCOPE_LABELS, CHART_COLORS, FilterType, FILTER_TO_REPORT_TYPE, FILTER_LABELS } from '@/config/constants';
import { useFilterStore } from '@/store/useFilterStore';
import { useQuery } from '@tanstack/react-query';
import { fetchBillingReportsMultiScope } from '@/services/billing.service';
import { getDateRange, formatChartLabel } from '@/lib/utils';
import { BarChartWidget } from './BarChartWidget';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import {
    format,
    addDays,
    addWeeks,
    addMonths,
    addQuarters,
    addYears,
    startOfDay,
    startOfWeek,
    startOfMonth,
    startOfQuarter,
    startOfYear,
    isAfter,
    eachHourOfInterval,
    eachDayOfInterval,
    eachMonthOfInterval,
    subMilliseconds,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ChartDataPoint } from '@/types/scada.types';
import type { BillingReport } from '@/types/database.types';

/* ── Date navigation helpers (same as ChartRow) ── */

function stepDate(date: Date, filterType: FilterType, direction: 1 | -1): Date {
    switch (filterType) {
        case FilterType.DAY:
            return addDays(date, direction);
        case FilterType.WEEK:
            return addWeeks(date, direction);
        case FilterType.MONTH:
            return addMonths(date, direction);
        case FilterType.QUARTER:
            return addQuarters(date, direction);
        case FilterType.YEAR:
            return addYears(date, direction);
        default:
            return date;
    }
}

function getStartOfPeriod(date: Date, filterType: FilterType): Date {
    switch (filterType) {
        case FilterType.DAY:
            return startOfDay(date);
        case FilterType.WEEK:
            return startOfWeek(date, { weekStartsOn: 1 });
        case FilterType.MONTH:
            return startOfMonth(date);
        case FilterType.QUARTER:
            return startOfQuarter(date);
        case FilterType.YEAR:
            return startOfYear(date);
        default:
            return date;
    }
}

function formatPeriodLabel(date: Date, filterType: FilterType): string {
    switch (filterType) {
        case FilterType.DAY:
            return format(date, 'dd/MM/yyyy', { locale: vi });
        case FilterType.WEEK: {
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });
            const weekEnd = addDays(weekStart, 6);
            return `${format(weekStart, 'dd/MM')} — ${format(weekEnd, 'dd/MM/yyyy')}`;
        }
        case FilterType.MONTH:
            return format(date, 'MM/yyyy', { locale: vi });
        case FilterType.QUARTER: {
            const q = Math.floor(date.getMonth() / 3) + 1;
            return `Quý ${q}/${date.getFullYear()}`;
        }
        case FilterType.YEAR:
            return `${date.getFullYear()}`;
        default:
            return format(date, 'dd/MM/yyyy');
    }
}

/* ── Chart data helpers ── */

function generateChartScaffold(filterType: FilterType, from: string, to: string): ChartDataPoint[] {
    const startDate = new Date(from);
    const endDate = subMilliseconds(new Date(to), 1);

    let dates: Date[] = [];
    switch (filterType) {
        case FilterType.DAY:
            dates = eachHourOfInterval({ start: startDate, end: endDate });
            break;
        case FilterType.WEEK:
            dates = eachDayOfInterval({ start: startDate, end: endDate });
            break;
        case FilterType.MONTH:
            dates = Array.from({ length: 31 }, (_, i) => {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                return d;
            });
            break;
        case FilterType.QUARTER:
            dates = eachMonthOfInterval({ start: startDate, end: endDate });
            break;
        case FilterType.YEAR:
            dates = eachMonthOfInterval({ start: startDate, end: endDate });
            break;
    }

    return dates.map((d) => ({
        label: formatChartLabel(d.toISOString(), filterType),
        logical_ts: d.toISOString(),
        yield_kwh: null,
        revenue_vnd: null,
    }));
}

function toChartData(
    reports: BillingReport[],
    filterType: FilterType,
    from: string,
    to: string
): ChartDataPoint[] {
    const scaffold = generateChartScaffold(filterType, from, to);

    const map = new Map<string, ChartDataPoint>();
    scaffold.forEach((pt) => map.set(pt.label, pt));

    reports.forEach((r) => {
        const label = formatChartLabel(r.logical_ts, filterType);
        if (map.has(label)) {
            const existing = map.get(label)!;
            if (existing.yield_kwh === null) {
                existing.yield_kwh = r.yield_kwh;
            } else {
                existing.yield_kwh = Math.max(existing.yield_kwh, r.yield_kwh);
            }
            if (existing.revenue_vnd === null) {
                existing.revenue_vnd = r.revenue_vnd;
            } else {
                existing.revenue_vnd = Math.max(existing.revenue_vnd, r.revenue_vnd);
            }
        }
    });

    return Array.from(map.values());
}

/* ── Component ── */

interface ComparisonPanelProps {
    className?: string;
}

export function ComparisonPanel({ className }: ComparisonPanelProps) {
    const { filterType } = useFilterStore();
    const [localDate, setLocalDate] = useState<Date>(new Date());

    // Navigation logic
    const isAtPresent = useMemo(() => {
        const nowPeriod = getStartOfPeriod(new Date(), filterType);
        const localPeriod = getStartOfPeriod(localDate, filterType);
        return localPeriod.getTime() >= nowPeriod.getTime();
    }, [localDate, filterType]);

    const handleBack = useCallback(() => {
        setLocalDate((prev) => stepDate(prev, filterType, -1));
    }, [filterType]);

    const handleForward = useCallback(() => {
        setLocalDate((prev) => {
            const next = stepDate(prev, filterType, 1);
            const nowPeriod = getStartOfPeriod(new Date(), filterType);
            if (isAfter(getStartOfPeriod(next, filterType), nowPeriod)) {
                return prev;
            }
            return next;
        });
    }, [filterType]);

    const handleReset = useCallback(() => {
        setLocalDate(new Date());
    }, []);

    // Fetch data using localDate
    const reportType = FILTER_TO_REPORT_TYPE[filterType];
    const { from, to } = getDateRange(filterType, localDate);

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['comparison-data', 'v2', filterType, reportType, from, to],
        queryFn: async () => {
            const raw = await fetchBillingReportsMultiScope(
                COMPARISON_SCOPES.map((s) => s),
                reportType,
                from,
                to,
            );
            const result: Record<string, ChartDataPoint[]> = {};
            for (const [scope, reports] of Object.entries(raw)) {
                result[scope] = toChartData(reports, filterType, from, to);
            }
            return result;
        },
        staleTime: 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });

    const colors = [
        CHART_COLORS.primary,
        CHART_COLORS.secondary,
        CHART_COLORS.tertiary,
        CHART_COLORS.quaternary,
        CHART_COLORS.quinary,
        CHART_COLORS.senary,
    ];

    return (
        <div className={className}>
            {/* Header with navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold border-l-4 border-primary pl-3">
                    Thống Kê Theo {FILTER_LABELS[filterType]} — So sánh 6 khu vực
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Back button */}
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-colors"
                        title="Lùi"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Lùi</span>
                    </button>

                    {/* Default / Reset button */}
                    <button
                        onClick={handleReset}
                        disabled={isAtPresent}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Mặc định (hiện tại)"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Mặc định</span>
                    </button>

                    {/* Forward button */}
                    <button
                        onClick={handleForward}
                        disabled={isAtPresent}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Tiến"
                    >
                        <span className="hidden sm:inline">Tiến</span>
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Period label */}
                    <span className="ml-2 text-sm font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                        {formatPeriodLabel(localDate, filterType)}
                    </span>
                </div>
            </div>

            {/* Charts grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-border bg-card p-4">
                            <LoadingSkeleton height={250} />
                        </div>
                    ))}
                </div>
            ) : isError ? (
                <ErrorState
                    message={error?.message || 'Lỗi tải dữ liệu so sánh'}
                    onRetry={() => refetch()}
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {COMPARISON_SCOPES.map((scope, index) => (
                        <div
                            key={scope}
                            className="rounded-xl border border-border bg-card p-4"
                        >
                            <BarChartWidget
                                data={data?.[scope]}
                                title={SCOPE_LABELS[scope]}
                                barColor={colors[index]}
                                height={250}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

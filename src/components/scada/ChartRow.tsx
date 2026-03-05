'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Scope, FilterType, SCOPE_LABELS, FILTER_LABELS } from '@/config/constants';
import { useBillingReports } from '@/hooks/useBillingQueries';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { format, addDays, addWeeks, addMonths, addQuarters, addYears, startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear, isAfter } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ChartRowProps {
    scope: Scope;
    filterType: FilterType;
}

/**
 * Get the step function and label format for each filter type.
 */
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

/**
 * Get the "start of period" for a given filter type to compare against today.
 */
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

/**
 * Format the currently displayed period for the label.
 */
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

export function ChartRow({ scope, filterType }: ChartRowProps) {
    const [localDate, setLocalDate] = useState<Date>(new Date());

    // Is the current period already at "today"? If yes, disable Forward
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
            // Don't go beyond the current period
            if (isAfter(getStartOfPeriod(next, filterType), nowPeriod)) {
                return prev;
            }
            return next;
        });
    }, [filterType]);

    const handleReset = useCallback(() => {
        setLocalDate(new Date());
    }, []);

    const {
        data: chartData,
        isLoading: chartLoading,
        isError: chartError,
        error: chartErr,
        refetch: chartRefetch,
    } = useBillingReports(scope, filterType, localDate);

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-8 mb-4">
                <h2 className="text-xl font-bold border-l-4 border-primary pl-3">
                    Thống Kê Theo {FILTER_LABELS[filterType]}
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
            <div className="rounded-xl border border-border bg-card p-4">
                <BarChartWidget
                    data={chartData}
                    title={`Sản lượng ${SCOPE_LABELS[scope]}`}
                    isLoading={chartLoading}
                    isError={chartError}
                    error={chartErr as Error}
                    onRetry={() => chartRefetch()}
                />
            </div>
        </div>
    );
}

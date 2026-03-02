'use client';

import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '@/store/useFilterStore';
import {
    FILTER_TO_REPORT_TYPE,
    COMPARISON_SCOPES,
    type Scope,
    FilterType,
} from '@/config/constants';
import { getDateRange, formatChartLabel } from '@/lib/utils';
import { eachHourOfInterval, eachDayOfInterval, eachMonthOfInterval, eachQuarterOfInterval, subMilliseconds } from 'date-fns';
import {
    fetchBillingReports,
    fetchBillingReportsMultiScope,
    fetchBillingScopes,
} from '@/services/billing.service';
import { fetchScadaPoints } from '@/services/scada.service';
import type { ChartDataPoint } from '@/types/scada.types';
import type { BillingReport } from '@/types/database.types';

/** Generate empty chart data points for the entire interval */
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
            // Force 31 days regardless of the actual month length
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

/** Transform billing reports to chart data points, padding empty dates */
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

/**
 * Hook: Fetch billing reports for a single scope.
 * Uses specificFilter if provided, else falls back to Zustand store.
 */
export function useBillingReports(scope: Scope, specificFilter?: FilterType, overrideDate?: Date) {
    const { filterType: storeFilterType, selectedDate } = useFilterStore();
    const filterType = specificFilter ?? storeFilterType;
    const reportType = FILTER_TO_REPORT_TYPE[filterType];
    const dateToUse = overrideDate ?? selectedDate;
    const { from, to } = getDateRange(filterType, dateToUse);

    return useQuery({
        queryKey: ['billing-reports', scope, filterType, reportType, from, to],
        queryFn: async () => {
            const reports = await fetchBillingReports(scope, reportType, from, to);
            return toChartData(reports, filterType, from, to);
        },
        staleTime: 60 * 1000,
        refetchInterval: 5 * 60 * 1000, // 5 minutes auto-refresh
    });
}

/**
 * Hook: Fetch billing reports for all comparison scopes.
 * Returns data keyed by scope name.
 */
export function useComparisonData() {
    const { filterType, selectedDate } = useFilterStore();
    const reportType = FILTER_TO_REPORT_TYPE[filterType];
    const { from, to } = getDateRange(filterType, selectedDate);

    return useQuery({
        queryKey: ['comparison-data', filterType, reportType, from, to],
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
        refetchInterval: 5 * 60 * 1000, // 5 minutes auto-refresh
    });
}

/**
 * Hook: Fetch billing scopes metadata.
 */
export function useBillingScopes() {
    return useQuery({
        queryKey: ['billing-scopes'],
        queryFn: fetchBillingScopes,
        staleTime: 5 * 60 * 1000, // metadata rarely changes
    });
}

/**
 * Hook: Fetch pie chart data for a scope.
 * Gets children scope data for proper decomposition.
 */
export function usePieChartData(scope: Scope, childScopes: Scope[], specificFilter?: FilterType) {
    const { filterType: storeFilterType, selectedDate } = useFilterStore();
    const filterType = specificFilter ?? storeFilterType;
    const reportType = FILTER_TO_REPORT_TYPE[filterType];
    const { from, to } = getDateRange(filterType, selectedDate);

    return useQuery({
        queryKey: ['pie-chart', scope, childScopes, reportType, from, to],
        queryFn: async () => {
            const results = await fetchBillingReportsMultiScope(
                childScopes,
                reportType,
                from,
                to,
            );
            // Sum yield_kwh for each child scope
            return Object.entries(results).map(([childScope, reports]) => ({
                scope: childScope,
                total_kwh: reports.reduce((sum, r) => sum + r.yield_kwh, 0),
            }));
        },
        staleTime: 60 * 1000,
    });
}

/**
 * Hook: Fetch SCADA points metadata (display names).
 */
export function useScadaMetadata() {
    return useQuery({
        queryKey: ['scada-metadata'],
        queryFn: () => fetchScadaPoints(),
        staleTime: 5 * 60 * 1000, // metadata rarely changes
    });
}



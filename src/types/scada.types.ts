import { Quality, ConnectionStatus, type Scope, type FilterType } from '@/config/constants';

/* ─── KPI ──────────────────────────────────────────────────────────────── */

export interface KpiData {
    label: string;
    value: number | null;
    unit: string;
    icon?: string;
    trend?: 'up' | 'down' | 'flat';
}

/* ─── Chart Data ───────────────────────────────────────────────────────── */

export interface ChartDataPoint {
    label: string;        // formatted timestamp for x-axis
    logical_ts: string;   // raw ISO timestamp
    yield_kwh: number | null;
    revenue_vnd: number | null;
}

export interface PieSlice {
    name: string;        // scope display name
    scope: string;       // scope key
    value: number;       // yield_kwh
    color: string;
}

/* ─── Realtime Inverter Card ───────────────────────────────────────────── */

export interface InverterCardData {
    var_name: string;
    display_name: string;
    value: number | null;
    unit: string;
    quality: Quality;
    isStale: boolean;
    source_ts: string | null;
    updated_at: string;
}

/* ─── Realtime Connection State ────────────────────────────────────────── */

export interface RealtimeConnectionInfo {
    status: ConnectionStatus;
    lastSyncTime: Date | null;
}

/* ─── Filter State ─────────────────────────────────────────────────────── */

export interface FilterState {
    filterType: FilterType;
    selectedDate: Date;
    compareMode: boolean;
    setFilterType: (type: FilterType) => void;
    setSelectedDate: (date: Date) => void;
    toggleCompareMode: () => void;
}

/* ─── Billing Query Params ─────────────────────────────────────────────── */

export interface BillingQueryParams {
    scope: Scope;
    reportType: string;
    from: string;
    to: string;
}

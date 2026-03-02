/**
 * PLACEHOLDER database types.
 * Replace with Supabase-generated types when available.
 * These match the frontend-facing schema in the spec (section 10).
 */

/* ─── billing_scopes (10.1) ────────────────────────────────────────────── */

export interface BillingScope {
    id?: string;
    scope_name: string;
    display_name: string;
    capacity_kw: number;
    created_at?: string;
}

/* ─── scada_points (10.2) ──────────────────────────────────────────────── */

export interface ScadaPoint {
    id?: string;
    var_name: string;
    display_name: string;
    unit: string;
    data_type: string;
    group_name: string;
    created_at?: string;
}

/* ─── realtime_states (10.3) ───────────────────────────────────────────── */

export interface RealtimeState {
    var_name: string;
    value: number | null;
    source_ts: string | null;
    quality: 'GOOD' | 'BAD' | 'OFFLINE';
    is_stale: boolean | null;
    updated_at: string;
}

/* ─── billing_reports (10.4) ───────────────────────────────────────────── */

export interface BillingReport {
    id?: string;
    scope: string;
    report_type: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    logical_ts: string;
    yield_kwh: number;
    revenue_vnd: number;
    price_applied: number | null;
    created_at?: string;
}

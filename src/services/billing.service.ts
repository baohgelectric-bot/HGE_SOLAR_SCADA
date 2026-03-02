import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toDbScope } from '@/config/constants';
import type { BillingReport, BillingScope } from '@/types/database.types';

/**
 * Fetch aggregated billing reports.
 * Query luôn dùng DB scope thật trong billing_reports.scope.
 */
export async function fetchBillingReports(
    scope: string,
    reportType: string,
    from: string,
    to: string,
): Promise<BillingReport[]> {
    const supabase = getSupabaseBrowserClient();
    const dbScope = toDbScope(scope);

    const { data, error } = await supabase
        .from('billing_reports')
        .select('*')
        .eq('scope', dbScope)
        .eq('report_type', reportType)
        .gte('logical_ts', from)
        .lt('logical_ts', to)
        .order('logical_ts', { ascending: true });

    if (error) throw error;
    return (data as BillingReport[]) ?? [];
}

/**
 * Fetch billing reports for multiple scopes.
 * results vẫn giữ key theo scope UI gốc để component hiện tại không phải sửa.
 */
export async function fetchBillingReportsMultiScope(
    scopes: string[],
    reportType: string,
    from: string,
    to: string,
): Promise<Record<string, BillingReport[]>> {
    const results: Record<string, BillingReport[]> = {};

    await Promise.all(
        scopes.map(async (scope) => {
            results[scope] = await fetchBillingReports(scope, reportType, from, to);
        }),
    );

    return results;
}

/**
 * Fetch all billing scopes metadata.
 */
export async function fetchBillingScopes(): Promise<BillingScope[]> {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
        .from('billing_scopes')
        .select('*')
        .order('scope_name');

    if (error) throw error;
    return (data as BillingScope[]) ?? [];
}



/**
 * Server-side fetch for SSR initial data.
 */
export async function fetchBillingReportsServer(
    scope: string,
    reportType: string,
    from: string,
    to: string,
): Promise<BillingReport[]> {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = getSupabaseServerClient();
    const dbScope = toDbScope(scope);

    const { data, error } = await supabase
        .from('billing_reports')
        .select('*')
        .eq('scope', dbScope)
        .eq('report_type', reportType)
        .gte('logical_ts', from)
        .lt('logical_ts', to)
        .order('logical_ts', { ascending: true });

    if (error) throw error;
    return (data as BillingReport[]) ?? [];
}

/**
 * Fetch data for CSV Export
 */
export async function exportBillingData(
    scope: string,
    from: string,
    to: string,
): Promise<BillingReport[]> {
    const supabase = getSupabaseBrowserClient();

    let query = supabase
        .from('billing_reports')
        .select('*')
        .eq('report_type', 'HOURLY')
        .gte('logical_ts', from)
        .lt('logical_ts', to)
        .order('logical_ts', { ascending: true });

    if (scope !== 'ALL') {
        query = query.eq('scope', toDbScope(scope));
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data as BillingReport[]) ?? [];
}
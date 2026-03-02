import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ScadaPoint, RealtimeState } from '@/types/database.types';

/**
 * Fetch SCADA points metadata (for display names, units, grouping).
 */
export async function fetchScadaPoints(
    groupName?: string,
): Promise<ScadaPoint[]> {
    const supabase = getSupabaseBrowserClient();
    let query = supabase.from('scada_points').select('*');

    if (groupName) {
        query = query.eq('group_name', groupName);
    }

    const { data, error } = await query.order('var_name');
    if (error) throw error;
    return (data as ScadaPoint[]) ?? [];
}

/**
 * Fetch current realtime states for specific var_names.
 */
export async function fetchRealtimeStates(
    varNames: string[],
): Promise<RealtimeState[]> {
    if (varNames.length === 0) return [];

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
        .from('realtime_states')
        .select('*')
        .in('var_name', varNames);

    if (error) throw error;
    return (data as RealtimeState[]) ?? [];
}

/**
 * Server-side fetch for SSR initial realtime data.
 */
export async function fetchRealtimeStatesServer(
    varNames: string[],
): Promise<RealtimeState[]> {
    if (varNames.length === 0) return [];

    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from('realtime_states')
        .select('*')
        .in('var_name', varNames);

    if (error) throw error;
    return (data as RealtimeState[]) ?? [];
}

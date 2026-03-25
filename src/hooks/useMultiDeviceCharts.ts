'use client';

import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { OVERVIEW_INVERTER_VARS, OVERVIEW_DM_VARS } from '@/config/constants';

/* ─── Types ─── */
export interface MultiDevicePoint {
    time: string;
    [key: string]: string | number | null;
}

const REFETCH_INTERVAL_MS = 60_000; // 1 minute

/* ─── fetchHourlyPowerProfile ─── */
async function fetchHourlyPowerProfile(): Promise<MultiDevicePoint[]> {
    const supabase = getSupabaseBrowserClient();
    const now = new Date();
    const currentHour = now.getHours();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, 0, 0, 0);

    // Pre-populate 13 slots: every 5 minutes (HH:00, HH:05, ..., HH:55, next HH:00)
    const timeSlots: string[] = [];
    for (let m = 0; m <= 60; m += 5) {
        const slotDate = new Date(hourStart);
        slotDate.setMinutes(m);
        timeSlots.push(slotDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    }

    const timeMap = new Map<string, MultiDevicePoint>();
    timeSlots.forEach(slot => timeMap.set(slot, { time: slot }));

    const trackedVars = [...OVERVIEW_INVERTER_VARS, ...OVERVIEW_DM_VARS];

    const { data, error } = await supabase
        .from('power_profile')
        .select('var_name, value, recorded_at')
        .in('var_name', trackedVars)
        .gte('recorded_at', hourStart.toISOString())
        .order('recorded_at', { ascending: true });

    if (error) throw error;

    data?.forEach((row: any) => {
        const d = new Date(row.recorded_at);
        // Round to nearest 5-minute slot
        const roundedMin = Math.round(d.getMinutes() / 5) * 5;
        const slotDate = new Date(hourStart);
        slotDate.setMinutes(roundedMin);
        const timeKey = slotDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        if (timeMap.has(timeKey)) {
            const pt = timeMap.get(timeKey)!;
            pt[row.var_name] = Math.round(row.value * 100) / 100;
        }
    });

    return Array.from(timeMap.values());
}

export function useHourlyPowerProfile() {
    return useQuery({
        queryKey: ['multi-device', 'hourly-power'],
        queryFn: fetchHourlyPowerProfile,
        refetchInterval: REFETCH_INTERVAL_MS,
    });
}

/* ─── fetchDailyYieldProfile ─── */
async function fetchDailyYieldProfile(): Promise<MultiDevicePoint[]> {
    const supabase = getSupabaseBrowserClient();
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Pre-populate 24 slots: 00:00, 01:00, ..., 23:00
    // Dữ liệu DB lưu HH:59 (vd: 08:59 UTC = 15:59 VN), +1 phút → HH:00
    const timeSlots: string[] = [];
    for (let h = 0; h < 24; h++) {
        const slotDate = new Date(dayStart);
        slotDate.setHours(h);
        slotDate.setMinutes(0);
        timeSlots.push(slotDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    }

    const timeMap = new Map<string, MultiDevicePoint>();
    timeSlots.forEach(slot => timeMap.set(slot, { time: slot }));

    const trackedScopes = [
        'TOTAL',
        'TOTAL_A',
        'TOTAL_B',
        'DM1_Total_Yield',
        'DM2_Total_Yield',
        'DM3_Total_Yield'
    ];

    const { data, error } = await supabase
        .from('billing_reports')
        .select('scope, yield_kwh, logical_ts')
        .eq('report_type', 'HOURLY')
        .in('scope', trackedScopes)
        .gte('logical_ts', dayStart.toISOString())
        .order('logical_ts', { ascending: true });

    if (error) throw error;

    data?.forEach((row: any) => {
        // logical_ts 2026-03-25T14:00:00Z → cộng thêm 1 phút → 14:01
        const d = new Date(row.logical_ts);
        d.setMinutes(d.getMinutes() - 59);
        const timeKey = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        if (timeMap.has(timeKey)) {
            const pt = timeMap.get(timeKey)!;
            pt[row.scope] = Math.round(row.yield_kwh * 100) / 100;
        }
    });

    return Array.from(timeMap.values());
}

export function useDailyYieldProfile() {
    return useQuery({
        queryKey: ['multi-device', 'daily-yield'],
        queryFn: fetchDailyYieldProfile,
        refetchInterval: REFETCH_INTERVAL_MS,
    });
}

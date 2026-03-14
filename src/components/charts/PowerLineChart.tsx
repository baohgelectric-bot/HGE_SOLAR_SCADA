'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SCOPE_POWER_VAR, SCOPE_CAPACITY, type Scope } from '@/config/constants';
import { Activity } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

/* ─── Constants ─── */
const MAX_POINTS = 13;
const REFETCH_INTERVAL_MS = 30_000; // 30 seconds

/* ─── Types ─── */
interface PowerPoint {
    time: string;       // HH:mm
    value: number;      // kW
}

/* ─── Fetch power_profile for current hour ─── */
async function fetchPowerProfile(varName: string): Promise<PowerPoint[]> {
    const supabase = getSupabaseBrowserClient();

    // Start of the current hour  (local time)
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

    const { data, error } = await supabase
        .from('power_profile')
        .select('value, recorded_at')
        .eq('var_name', varName)
        .gte('recorded_at', hourStart.toISOString())
        .order('recorded_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Map to chart-friendly format
    const points: PowerPoint[] = data.map((row: { value: number; recorded_at: string }) => ({
        time: new Date(row.recorded_at).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        }),
        value: Math.round(row.value * 100) / 100,
    }));

    // Limit to last MAX_POINTS
    const result = points.slice(-MAX_POINTS);

    // Pad to exactly MAX_POINTS so the chart has fixed 14 points along the X axis.
    // We use unique strings (spaces) for the empty time labels so Recharts treats them as distinct points.
    while (result.length < MAX_POINTS) {
        result.push({
            time: ' '.repeat(result.length + 1),
            value: null as unknown as number
        });
    }

    return result;
}

/* ─── Hook ─── */
function usePowerProfile(scope: Scope) {
    const varName = SCOPE_POWER_VAR[scope];

    return useQuery({
        queryKey: ['power-profile', varName],
        queryFn: () => fetchPowerProfile(varName),
        refetchInterval: REFETCH_INTERVAL_MS,
        staleTime: 10_000,
    });
}

/* ─── Mobile hook ─── */
function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, [breakpoint]);
    return isMobile;
}

/* ─── Custom Tooltip ─── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
    if (!active || !payload?.length || payload[0].value == null) return null;
    return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-sm font-bold">
                {payload[0].value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kW
            </p>
        </div>
    );
}

/* ─── Custom Label ─── */
const CustomizedLabel = (props: any) => {
    const { x, y, value } = props;
    if (value == null) return null;
    return (
        <text
            x={x}
            y={y}
            dy={-10}
            fill="currentColor"
            textAnchor="middle"
            className="text-[10px] sm:text-xs font-semibold text-foreground"
        >
            {Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
        </text>
    );
};

/* ─── Main Component ─── */
interface PowerLineChartProps {
    scope: Scope;
}

export function PowerLineChart({ scope }: PowerLineChartProps) {
    const isMobile = useIsMobile();
    const { data: points, isLoading, isError } = usePowerProfile(scope);
    const capacity = SCOPE_CAPACITY[scope];
    const { t } = useTranslation();

    // Current hour label
    const hourLabel = useMemo(() => {
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const hNext = ((now.getHours() + 1) % 24).toString().padStart(2, '0');
        return `${h}:00 – ${hNext}:00`;
    }, []);

    const hasData = points && points.some(p => p.value != null);

    return (
        <div className="rounded-xl border border-border bg-card p-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-lg font-bold text-muted-foreground">
                        {t('charts.powerPerHour' as any)}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {hourLabel}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                    {t('charts.live' as any)}
                </div>
            </div>

            {/* Chart */}
            {isLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : isError ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                    {t('charts.errorLoading' as any)}
                </div>
            ) : !hasData ? (
                <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                    <Activity className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">{t('charts.noDataHour' as any)}</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={200} className="text-muted-foreground">
                    <LineChart
                        data={points}
                        margin={{
                            top: 25,
                            right: isMobile ? 10 : 20,
                            left: isMobile ? -15 : 10,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="currentColor"
                            className="text-border"
                            opacity={0.5}
                        />
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: isMobile ? 10 : 12, fill: 'currentColor' }}
                            tickLine={false}
                            axisLine={false}
                            padding={{ left: 20, right: 20 }}
                        />
                        <YAxis
                            tick={{ fontSize: isMobile ? 10 : 12, fill: 'currentColor' }}
                            tickLine={false}
                            axisLine={false}
                            width={isMobile ? 35 : 60}
                            domain={[0, Math.ceil(capacity * 1.1)]}
                            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            name={t('charts.powerKW' as any)}
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                            animationDuration={500}
                            label={<CustomizedLabel />}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

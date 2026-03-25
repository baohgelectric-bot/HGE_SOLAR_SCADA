'use client';

import { useState, useEffect } from 'react';
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
import { Activity } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

/* ─── Types ─── */
export interface LineConfig {
    key: string;
    name: string;
    color: string;
}

interface MultiDeviceLineChartProps {
    data?: any[];
    lines: LineConfig[];
    title: string;
    subtitle: string;
    yAxisFormatter?: (value: number) => string;
    yAxisDomain?: [number, number];
    isLoading?: boolean;
    isError?: boolean;
    unit?: string;
}

/* ─── Custom Hooks ─── */
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
function CustomTooltip({ active, payload, label, unit }: any) {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl z-50 text-sm max-w-[320px]">
            <p className="text-xs text-muted-foreground mb-2 font-semibold border-b border-border pb-1">
                {label}
            </p>
            <div className="flex flex-col gap-1">
                {payload.map((entry: any, index: number) => {
                    if (entry.value == null) return null;
                    return (
                        <div key={index} className="flex justify-between gap-4">
                            <span style={{ color: entry.color }} className="font-medium truncate max-w-[150px]">
                                {entry.name}:
                            </span>
                            <span className="font-bold text-foreground">
                                {Number(entry.value).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} {unit}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─── Custom Legend ─── */
function CustomLegend({ payload, isMobile, hiddenKeys, onToggle }: any) {
    if (!payload?.length) return null;

    let row1 = [], row2 = [], row3 = [];

    // Nếu biểu đồ theo Giờ có 11 biến (3 DM + 8 INV)
    if (payload.length === 11) {
        row1 = payload.slice(0, 3);
        row2 = payload.slice(3, 7);
        row3 = payload.slice(7, 11);
    } else {
        const half = Math.ceil(payload.length / 2);
        row1 = payload.slice(0, half);
        row2 = payload.slice(half);
    }

    const renderItem = (entry: any, index: number) => {
        const isHidden = hiddenKeys?.has(entry.dataKey);
        return (
            <div
                key={`item-${index}`}
                className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none transition-opacity"
                style={{ opacity: isHidden ? 0.35 : 1 }}
                onClick={() => onToggle?.(entry.dataKey)}
            >
                <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: isHidden ? '#9ca3af' : entry.color }}
                />
                <span
                    className="text-muted-foreground truncate"
                    style={{ maxWidth: '200px', textDecoration: isHidden ? 'line-through' : 'none' }}
                >
                    {entry.value}
                </span>
            </div>
        );
    };

    return (
        <div className="pt-4 w-full" style={{ fontSize: isMobile ? '9px' : '14px' }}>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-1.5">
                {row1.map(renderItem)}
            </div>
            {row2.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-1.5">
                    {row2.map(renderItem)}
                </div>
            )}
            {row3.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                    {row3.map(renderItem)}
                </div>
            )}
        </div>
    );
}

/* ─── Main Component ─── */
export function MultiDeviceLineChart({
    data,
    lines,
    title,
    subtitle,
    yAxisFormatter,
    yAxisDomain,
    isLoading,
    isError,
    unit = 'kW'
}: MultiDeviceLineChartProps) {
    const isMobile = useIsMobile();
    const { t } = useTranslation();
    const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

    const handleToggle = (dataKey: string) => {
        setHiddenKeys(prev => {
            const next = new Set(prev);
            if (next.has(dataKey)) {
                next.delete(dataKey);
            } else {
                next.add(dataKey);
            }
            return next;
        });
    };

    const hasData = data && data.some(p => {
        return lines.some(line => p[line.key] != null);
    });

    return (
        <div className="rounded-xl border border-border bg-card p-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-lg font-bold text-muted-foreground">
                        {title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {subtitle}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                    {t('charts.live' as any)}
                </div>
            </div>

            {/* Chart */}
            {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : isError ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    {t('charts.errorLoading' as any)}
                </div>
            ) : !hasData ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                    <Activity className="h-6 w-6 mb-2 opacity-30" />
                    <p className="text-sm">{t('charts.noDataBar' as any)}</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={380} className="text-muted-foreground">
                    <LineChart
                        data={data}
                        margin={{
                            top: 15,
                            right: isMobile ? 10 : 20,
                            left: isMobile ? -15 : 10,
                            bottom: 10,
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
                            tick={{ fontSize: isMobile ? 10 : 15, fill: 'currentColor' }}
                            tickLine={false}
                            axisLine={false}
                            padding={{ left: 20, right: 20 }}
                        />
                        <YAxis
                            tick={{ fontSize: isMobile ? 10 : 15, fill: 'currentColor' }}
                            tickLine={false}
                            axisLine={false}
                            width={isMobile ? 35 : 45}
                            domain={yAxisDomain || [0, 'auto']}
                            tickFormatter={yAxisFormatter || ((v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                        />
                        <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.2 }} />
                        <Legend
                            content={<CustomLegend isMobile={isMobile} hiddenKeys={hiddenKeys} onToggle={handleToggle} />}
                            verticalAlign="bottom"
                            height={70}
                        />
                        {lines.map((lineConfig) => (
                            <Line
                                key={lineConfig.key}
                                type="monotone"
                                dataKey={lineConfig.key}
                                name={lineConfig.name}
                                stroke={lineConfig.color}
                                strokeWidth={3}
                                dot={{ r: 2, fill: lineConfig.color, strokeWidth: 0 }}
                                activeDot={{ r: 4, fill: lineConfig.color, stroke: '#fff', strokeWidth: 2 }}
                                animationDuration={500}
                                connectNulls={true}
                                hide={hiddenKeys.has(lineConfig.key)}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

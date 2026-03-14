'use client';

import { useState, useEffect } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { CHART_COLORS } from '@/config/constants';
import type { ChartDataPoint } from '@/types/scada.types';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { useTranslation } from '@/hooks/useTranslation';

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

interface BarChartWidgetProps {
    data: ChartDataPoint[] | undefined;
    title: string;
    isLoading?: boolean;
    isError?: boolean;
    error?: Error | null;
    onRetry?: () => void;
    dataKey?: 'yield_kwh' | 'revenue_vnd';
    barColor?: string;
    className?: string;
    height?: number;
}

export function BarChartWidget({
    data,
    title,
    isLoading = false,
    isError = false,
    error,
    onRetry,
    dataKey = 'yield_kwh',
    barColor = CHART_COLORS.primary,
    className,
    height = 320,
}: BarChartWidgetProps) {
    const isMobile = useIsMobile();
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className={className}>
                <h3 className="text-sm font-semibold mb-3">{title}</h3>
                <LoadingSkeleton height={height} />
            </div>
        );
    }

    if (isError) {
        return (
            <div className={className}>
                <h3 className="text-sm font-semibold mb-3">{title}</h3>
                <ErrorState
                    message={error?.message || (t('charts.errorLoading' as any))}
                    onRetry={onRetry}
                />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={className}>
                <h3 className="text-sm font-semibold mb-3">{title}</h3>
                <EmptyState message={t('charts.noDataBar' as any)} />
            </div>
        );
    }


    const yAxisWidth = isMobile ? 30 : 60;
    const tickFontSize = isMobile ? 9 : 12;
    const tickGap = isMobile ? 2 : 8;
    const chartMargin = isMobile
        ? { top: 5, right: 2, left: 0, bottom: 5 }
        : { top: 5, right: 10, left: 10, bottom: 5 };

    const formatLeftTick = (v: number) => {
        if (isMobile) {
            if (v >= 1000) return Math.round(v / 1000) + 'k';
            return Math.round(v).toString();
        }
        return v.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
    };

    const formatRightTick = (v: number) => {
        if (isMobile) {
            if (v >= 1000000000) return (v / 1000000000).toFixed(0) + 'tỷ';
            if (v >= 1000000) return (v / 1000000).toFixed(0) + 'tr';
            if (v >= 1000) return Math.round(v / 1000) + 'N';
            return Math.round(v).toString();
        }
        if (v >= 1000000000) return (v / 1000000000).toFixed(1) + ' tỷ';
        if (v >= 1000000) return (v / 1000000).toFixed(1) + ' tr';
        if (v >= 1000) return (v / 1000).toFixed(1) + ' N';
        return v.toLocaleString('vi-VN');
    };

    return (
        <div className={className}>
            <h3 className="text-sm font-semibold mb-3">{title}</h3>
            <ResponsiveContainer width="100%" height={height}>
                <ComposedChart data={data} margin={chartMargin}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        opacity={0.3}
                    />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: tickFontSize, fill: 'var(--foreground)', fontWeight: 600 }}
                        tickMargin={tickGap}
                    />
                    <YAxis
                        yAxisId="left"
                        tick={{ fontSize: tickFontSize, fill: 'var(--foreground)', fontWeight: 600 }}
                        tickFormatter={formatLeftTick}
                        tickMargin={tickGap}
                        width={yAxisWidth}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: tickFontSize, fill: 'var(--foreground)', fontWeight: 600 }}
                        tickFormatter={formatRightTick}
                        tickMargin={tickGap}
                        width={yAxisWidth}
                    />
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--accent))', opacity: 0.2 }}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: 'hsl(var(--foreground))',
                            fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        itemStyle={{
                            color: 'hsl(var(--foreground))',
                            fontWeight: 'bold',
                        }}
                        labelStyle={{
                            color: 'hsl(var(--muted-foreground))',
                            fontWeight: '600',
                            marginBottom: '4px',
                        }}
                        formatter={(value: any, name: any) => {
                            const safeName = String(name || '');
                            const locale = typeof window !== 'undefined' && window.localStorage.getItem('language-storage')?.includes('"language":"en"') ? 'en-US' : 'vi-VN';
                            if (safeName.includes(t('charts.yield' as any))) {
                                return [`${Number(value ?? 0).toLocaleString(locale, { maximumFractionDigits: 2 })} kWh`, safeName];
                            }
                            return [`${Number(value ?? 0).toLocaleString(locale, { maximumFractionDigits: 0 })} ${t('dashboard.unitKvnd' as any)}`, safeName];
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                        yAxisId="left"
                        dataKey="yield_kwh"
                        fill={barColor}
                        radius={[4, 4, 0, 0]}
                        name={t('charts.yieldKwh' as any)}
                        maxBarSize={30}
                        activeBar={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, fillOpacity: 0.8 }}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="revenue_vnd"
                        stroke="#2dd4bf"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#2dd4bf', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        name={t('charts.revenueKVND' as any)}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

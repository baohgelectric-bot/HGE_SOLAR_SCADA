'use client';

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
                    message={error?.message || 'Lỗi tải dữ liệu'}
                    onRetry={onRetry}
                />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={className}>
                <h3 className="text-sm font-semibold mb-3">{title}</h3>
                <EmptyState message="Chưa có dữ liệu trong khoảng thời gian này" />
            </div>
        );
    }

    return (
        <div className={className}>
            <h3 className="text-sm font-semibold mb-3">{title}</h3>
            <ResponsiveContainer width="100%" height={height}>
                <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        opacity={0.3}
                    />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: 'var(--foreground)', fontWeight: 600 }}
                        tickMargin={8}
                    />
                    <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 12, fill: 'var(--foreground)', fontWeight: 600 }}
                        tickFormatter={(v) => v.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}
                        tickMargin={8}
                        width={60}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12, fill: 'var(--foreground)', fontWeight: 600 }}
                        tickFormatter={(v) => {
                            if (v >= 1000000000) return (v / 1000000000).toFixed(1) + ' tỷ';
                            if (v >= 1000000) return (v / 1000000).toFixed(1) + ' tr';
                            if (v >= 1000) return (v / 1000).toFixed(1) + ' N';
                            return v.toLocaleString('vi-VN');
                        }}
                        tickMargin={8}
                        width={60}
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
                            if (safeName.includes('Sản lượng')) {
                                return [`${Number(value ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kWh`, safeName];
                            }
                            return [`${Number(value ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ`, safeName];
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                        yAxisId="left"
                        dataKey="yield_kwh"
                        fill={barColor}
                        radius={[4, 4, 0, 0]}
                        name="Sản lượng (kWh)"
                        maxBarSize={45}
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
                        name="Doanh thu (VNĐ)"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

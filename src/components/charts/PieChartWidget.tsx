'use client';

import { useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { CHART_COLORS, SCOPE_LABELS, Scope } from '@/config/constants';
import { formatEnergy, formatPower } from '@/lib/utils';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

interface PieSliceData {
    scope: string;
    total_kwh: number;
}

interface PieChartWidgetProps {
    data: PieSliceData[] | undefined;
    title: string;
    unit?: string;
    valueLabel?: string;
    isLoading?: boolean;
    isError?: boolean;
    error?: Error | null;
    onRetry?: () => void;
    className?: string;
    height?: number;
    description?: string;
    legendPosition?: 'bottom' | 'right';
    colors?: string[];
}

export function PieChartWidget({
    data,
    title,
    unit = 'kWh',
    valueLabel = 'Sản lượng',
    isLoading = false,
    isError = false,
    error,
    onRetry,
    className,
    height = 320,
    description,
    legendPosition = 'bottom',
    colors,
}: PieChartWidgetProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    if (isLoading) {
        return (
            <div className={className}>
                <h3 className="mb-3 text-sm font-semibold">{title}</h3>
                <LoadingSkeleton height={height} />
            </div>
        );
    }

    if (isError) {
        return (
            <div className={className}>
                <h3 className="mb-3 text-sm font-semibold">{title}</h3>
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
                <h3 className="mb-3 text-sm font-semibold">{title}</h3>
                <EmptyState message="Chưa có dữ liệu để hiển thị biểu đồ" />
            </div>
        );
    }

    const chartData = data.map((d) => ({
        name: SCOPE_LABELS[d.scope as Scope] || d.scope,
        value: d.total_kwh,
        scope: d.scope,
    }));

    const total = chartData.reduce((sum, d) => sum + d.value, 0);

    const focusIndex = activeIndex ?? 0;
    const focusItem = chartData[focusIndex];
    const focusValue = focusItem?.value ?? 0;
    const focusPercent = total > 0 ? ((focusValue / total) * 100).toFixed(1) : '0';
    const formattedFocusValue =
        unit === 'kW' ? formatPower(focusValue) : formatEnergy(focusValue);

    const isRightLegend = legendPosition === 'right';

    return (
        <div className={className}>
            <div className="mb-2">
                <h3 className="text-lg font-bold">{title}</h3>
                {description && (
                    <p className="mt-0.5 text-base font-semibold text-muted-foreground">{description}</p>
                )}
            </div>

            <div
                className={`flex ${isRightLegend
                    ? 'flex-row items-center gap-4'
                    : 'flex-col items-center gap-2'
                    }`}
            >
                <div
                    className="relative"
                    style={{ width: isRightLegend ? '55%' : '100%', height: height - 40 }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius="55%"
                                outerRadius="85%"
                                paddingAngle={3}
                                dataKey="value"
                                label={false}
                                labelLine={false}
                                strokeWidth={0}
                                onMouseEnter={(_, index) => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                            >
                                {chartData.map((entry, index) => {
                                    const isActive = activeIndex === null ? index === 0 : index === activeIndex;

                                    return (
                                        <Cell
                                            key={`cell-${entry.scope}-${index}`}
                                            fill={(colors ?? CHART_COLORS.pieSlices)[index % (colors ?? CHART_COLORS.pieSlices).length]}
                                            style={{
                                                cursor: 'pointer',
                                                transition: 'opacity 0.2s ease, transform 0.2s ease',
                                            }}
                                            opacity={isActive ? 1 : 0.55}
                                        />
                                    );
                                })}
                            </Pie>

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    padding: '8px 14px',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                    color: 'hsl(var(--foreground))',
                                }}
                                itemStyle={{
                                    color: 'hsl(var(--foreground))',
                                }}
                                formatter={(value, name) => {
                                    const numValue = Number(value ?? 0);
                                    const percent = total > 0 ? ((numValue / total) * 100).toFixed(1) : '0';
                                    const formatted =
                                        unit === 'kW' ? formatPower(numValue) : formatEnergy(numValue);

                                    return [`${formatted} ${unit} (${percent}%)`, name ?? valueLabel];
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold leading-none text-foreground">
                            {formattedFocusValue}
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground">{unit}</span>
                        <span className="mt-0.5 text-xs font-medium text-primary">
                            {focusPercent}%
                        </span>
                    </div>
                </div>

                <div
                    className={`flex ${isRightLegend ? 'flex-col gap-3' : 'flex-row justify-center gap-6'
                        }`}
                    style={{ width: isRightLegend ? '45%' : '100%' }}
                >
                    {chartData.map((entry, index) => {
                        const color = (colors ?? CHART_COLORS.pieSlices)[index % (colors ?? CHART_COLORS.pieSlices).length];
                        const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                        const formatted =
                            unit === 'kW' ? formatPower(entry.value) : formatEnergy(entry.value);
                        const isActive = activeIndex === null ? index === 0 : activeIndex === index;

                        return (
                            <div
                                key={entry.scope}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all duration-200 ${isActive ? 'scale-[1.02] bg-accent/50' : 'hover:bg-accent/30'
                                    }`}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                            >
                                <div
                                    className="h-3 w-3 flex-shrink-0 rounded-full"
                                    style={{
                                        backgroundColor: color,
                                        boxShadow: isActive ? `0 0 8px ${color}60` : 'none',
                                    }}
                                />
                                <div className="flex flex-col">
                                    <span className="text-base font-medium leading-tight text-foreground">
                                        {entry.name}
                                    </span>
                                    <span className="text-base leading-tight text-muted-foreground">
                                        {formatted} {unit} · {percent}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
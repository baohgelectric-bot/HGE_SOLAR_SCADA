'use client';

import { COMPARISON_SCOPES, SCOPE_LABELS, CHART_COLORS } from '@/config/constants';
import { useComparisonData } from '@/hooks/useBillingQueries';
import { BarChartWidget } from './BarChartWidget';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

interface ComparisonPanelProps {
    className?: string;
}

export function ComparisonPanel({ className }: ComparisonPanelProps) {
    const { data, isLoading, isError, error, refetch } = useComparisonData();

    if (isLoading) {
        return (
            <div className={className}>
                <h2 className="text-lg font-bold mb-4">Chế độ so sánh</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-border bg-card p-4">
                            <LoadingSkeleton height={250} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className={className}>
                <h2 className="text-lg font-bold mb-4">Chế độ so sánh</h2>
                <ErrorState
                    message={error?.message || 'Lỗi tải dữ liệu so sánh'}
                    onRetry={() => refetch()}
                />
            </div>
        );
    }

    const colors = [
        CHART_COLORS.primary,
        CHART_COLORS.secondary,
        CHART_COLORS.tertiary,
        CHART_COLORS.quaternary,
        CHART_COLORS.quinary,
    ];

    return (
        <div className={className}>
            <h2 className="text-lg font-bold mb-4">
                Chế độ so sánh — 5 biểu đồ đồng bộ
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {COMPARISON_SCOPES.map((scope, index) => (
                    <div
                        key={scope}
                        className="rounded-xl border border-border bg-card p-4"
                    >
                        <BarChartWidget
                            data={data?.[scope]}
                            title={SCOPE_LABELS[scope]}
                            barColor={colors[index]}
                            height={250}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

interface KpiCardProps {
    label: string;
    value: string;
    unit: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'flat';
    loading?: boolean;
    className?: string;
}

export function KpiCard({
    label,
    value,
    unit,
    icon: Icon,
    trend,
    loading = false,
    className,
}: KpiCardProps) {
    if (loading) {
        return (
            <div
                className={cn(
                    'rounded-xl border border-border bg-card p-5 shadow-sm',
                    className,
                )}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
                </div>
                <div className="h-8 w-32 bg-muted rounded animate-pulse mb-1" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
        );
    }

    const TrendIcon =
        trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor =
        trend === 'up'
            ? 'text-emerald-500'
            : trend === 'down'
                ? 'text-red-500'
                : 'text-muted-foreground';

    return (
        <div
            className={cn(
                'rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow',
                className,
            )}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-muted-foreground">{label}</span>
                <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold tracking-tight">{value}</span>
                <span className="text-xl font-semibold text-primary">{unit}</span>
            </div>
            {trend && (
                <div className={cn('flex items-center gap-1 mt-2', trendColor)}>
                    <TrendIcon className="h-3 w-3" />
                    <span className="text-xs font-medium">
                        {trend === 'up' ? 'Tăng' : trend === 'down' ? 'Giảm' : 'Ổn định'}
                    </span>
                </div>
            )}
        </div>
    );
}

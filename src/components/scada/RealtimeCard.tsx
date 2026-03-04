import { cn } from '@/lib/utils';
import { formatPower } from '@/lib/utils';
import { Quality, QUALITY_COLORS, STALE_COLORS } from '@/config/constants';
import { WifiOff, Zap } from 'lucide-react';

interface RealtimeCardProps {
    displayName: string;
    value: number | null;
    unit: string;
    quality: Quality;
    isStale: boolean;
    loading?: boolean;
    className?: string;
}

export function RealtimeCard({
    displayName,
    value,
    unit,
    quality,
    isStale,
    loading = false,
    className,
}: RealtimeCardProps) {
    if (loading) {
        return (
            <div
                className={cn(
                    'rounded-xl border border-border bg-card p-4 shadow-sm',
                    className,
                )}
            >
                <div className="h-4 w-20 bg-muted rounded animate-pulse mb-3" />
                <div className="h-7 w-16 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-12 bg-muted rounded animate-pulse" />
            </div>
        );
    }

    const baseColors = QUALITY_COLORS[quality];
    const cardBg = isStale ? STALE_COLORS.bg : baseColors.bg;
    const cardBorder = isStale ? STALE_COLORS.border : baseColors.border;
    const textColor = isStale ? STALE_COLORS.text : baseColors.text;
    const dotColor = isStale ? 'bg-amber-500' : baseColors.dot;

    const getIcon = () => {
        switch (quality) {
            case Quality.GOOD:
                return <Zap className="h-4 w-4" />;
            case Quality.OFFLINE:
                return <WifiOff className="h-4 w-4" />;
        }
    };

    return (
        <div
            className={cn(
                'rounded-xl border p-4 shadow-sm transition-all hover:shadow-md relative overflow-hidden',
                cardBg,
                cardBorder,
                className,
            )}
        >
            {/* Stale badge (spec 8.2) */}
            {isStale && (
                <span
                    className={cn(
                        'absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full',
                        STALE_COLORS.badge,
                    )}
                >
                    STALE
                </span>
            )}

            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <span className={cn('flex-shrink-0', textColor)}>{getIcon()}</span>
                <span className="text-base font-bold text-muted-foreground truncate" title={displayName}>
                    {displayName}
                </span>
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-1.5">
                <span className={cn('text-xl font-bold', textColor)}>
                    {quality === Quality.OFFLINE ? '—' : formatPower(value)}
                </span>
                <span className="text-sm font-bold text-muted-foreground">{unit}</span>
            </div>

            {/* Quality label */}
            <div className="mt-2 flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', dotColor)} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {isStale ? 'STALE' : quality}
                </span>
            </div>
        </div>
    );
}

import { useTranslation } from '@/hooks/useTranslation';

export function LoadingSkeleton({
    height = 200,
    className = '',
}: {
    height?: number;
    className?: string;
}) {
    const { t } = useTranslation();
    return (
        <div
            className={`animate-pulse bg-muted/50 rounded-lg border border-border flex items-center justify-center ${className}`}
            style={{ height }}
        >
            <div className="flex flex-col items-center gap-2">
                <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">{t('common.loading')}</span>
            </div>
        </div>
    );
}

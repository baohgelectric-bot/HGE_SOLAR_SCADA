import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { ConnectionStatus } from '@/config/constants';
import { cn } from '@/lib/utils';

interface ConnectionIndicatorProps {
    status: ConnectionStatus;
    className?: string;
}

export function ConnectionIndicator({
    status,
    className,
}: ConnectionIndicatorProps) {
    const config = {
        [ConnectionStatus.CONNECTED]: {
            icon: Cloud,
            label: 'Đã kết nối',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            dotColor: 'bg-emerald-500',
            animate: false,
        },
        [ConnectionStatus.RECONNECTING]: {
            icon: RefreshCw,
            label: 'Đang kết nối lại...',
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            dotColor: 'bg-amber-500',
            animate: true,
        },
        [ConnectionStatus.DISCONNECTED]: {
            icon: CloudOff,
            label: 'Mất kết nối',
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            dotColor: 'bg-red-500',
            animate: false,
        },
    };

    const cfg = config[status];
    const Icon = cfg.icon;

    return (
        <div
            className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full border border-border',
                cfg.bg,
                className,
            )}
        >
            <span className={cn('h-2 w-2 rounded-full', cfg.dotColor, cfg.animate && 'animate-pulse')} />
            <Icon className={cn('h-3.5 w-3.5', cfg.color, cfg.animate && 'animate-spin')} />
            <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
        </div>
    );
}

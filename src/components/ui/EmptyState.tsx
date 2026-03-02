import { Inbox } from 'lucide-react';

interface EmptyStateProps {
    message?: string;
    className?: string;
}

export function EmptyState({
    message = 'Chưa có dữ liệu trong khoảng thời gian này',
    className = '',
}: EmptyStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
        >
            <div className="p-3 rounded-full bg-muted/50 mb-3">
                <Inbox className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
        </div>
    );
}

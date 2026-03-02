import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorState({
    message = 'Đã xảy ra lỗi khi tải dữ liệu',
    onRetry,
    className = '',
}: ErrorStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
        >
            <div className="p-3 rounded-full bg-red-500/10 mb-3">
                <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mb-3 max-w-xs">
                {message}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                >
                    <RefreshCw className="h-3 w-3" />
                    Thử lại
                </button>
            )}
        </div>
    );
}

'use client';

import { FilterType, FILTER_LABELS } from '@/config/constants';
import { useFilterStore } from '@/store/useFilterStore';
import { cn } from '@/lib/utils';
import { BarChart3, GitCompare } from 'lucide-react';

interface TimeFilterProps {
    hideCompare?: boolean;
}

export function TimeFilter({ hideCompare = false }: TimeFilterProps) {
    const { filterType, setFilterType, compareMode, toggleCompareMode } =
        useFilterStore();

    const filters = Object.values(FilterType);

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border">
                {filters.map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={cn(
                            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                            filterType === type
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                        )}
                    >
                        {FILTER_LABELS[type]}
                    </button>
                ))}
            </div>

            {/* Compare Mode Toggle */}
            {!hideCompare && (
                <button
                    onClick={toggleCompareMode}
                    className={cn(
                        'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                        compareMode
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'text-muted-foreground border-border hover:bg-muted',
                    )}
                >
                    {compareMode ? (
                        <GitCompare className="h-3.5 w-3.5" />
                    ) : (
                        <BarChart3 className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">
                        {compareMode ? 'Tắt so sánh' : 'So sánh'}
                    </span>
                </button>
            )}
        </div>
    );
}

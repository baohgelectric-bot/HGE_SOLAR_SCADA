'use client';

import { Header } from '@/components/layout/Header';
import { ComparisonPanel } from '@/components/charts/ComparisonPanel';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { TimeFilter } from '@/components/charts/TimeFilter';
import { WeatherWidget } from '@/components/widgets/WeatherWidget';

export default function ComparePage() {
    const { connection } = useRealtimeData({ varNames: [] });

    return (
        <div className="flex flex-col min-h-screen">
            <Header connection={connection} />

            <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-auto">
                {/* Page Title */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Đánh giá hiệu suất trạm
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            So sánh sản lượng và doanh thu giữa các khu vực
                        </p>
                    </div>
                    <WeatherWidget />
                </div>

                <TimeFilter hideCompare />

                <ComparisonPanel />
            </main>
        </div>
    );
}

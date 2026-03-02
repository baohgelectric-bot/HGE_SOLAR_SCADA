'use client';

import { Header } from '@/components/layout/Header';
import { ComparisonPanel } from '@/components/charts/ComparisonPanel';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { TimeFilter } from '@/components/charts/TimeFilter';

export default function ComparePage() {
    const { connection } = useRealtimeData({ varNames: [] });

    return (
        <div className="flex flex-col min-h-screen">
            <Header connection={connection} />

            <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-auto">
                {/* Page Title */}
                <div>
                    <h1 className="text-2xl font-bold">
                        Đánh giá hiệu suất trạm
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        So sánh sản lượng và doanh thu giữa các khu vực
                    </p>
                </div>

                {/* Keep Time Filter only for Comparison Panel if user wants it, or remove it and show all 5? User just said "so sánh đưa ra một trang riêng" and "Mỗi trang hiển thị cả 5 biểu đồ". We can just show the existing TimeFilter for Comparison, or build 5 Comparison Panels? Let's just keep TimeFilter but default compareMode to true, or update comparison panel later. Wait, spec says "phần so sánh đưa ra trang riêng". Let's show the standard ComparisonPanel component. */}
                <TimeFilter />

                <ComparisonPanel />
            </main>
        </div>
    );
}

'use client';

import { useMemo } from 'react';
import { Zap, BarChart3, DollarSign } from 'lucide-react';
import {
    Scope,
    SCOPE_LABELS,
    SCOPE_INVERTER_VARS,
    SCOPE_POWER_VAR,
    SCOPE_DAILY_YIELD_VAR,
    SCOPE_DAILY_REVENUE_VAR,
    SCOPE_CUMULATIVE_YIELD_VAR,
    SCOPE_CUMULATIVE_REVENUE_VAR,
    SCOPE_TOTAL_YIELD_VAR,
    SCOPE_METER_W_IN,
    SCOPE_METER_W_OUT,
    SCOPE_KW_LOAD,
    Quality,
    ConnectionStatus,
    FilterType,
    SCOPE_CAPACITY,
} from '@/config/constants';
import { useScadaMetadata } from '@/hooks/useBillingQueries';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { formatPower, formatEnergy, formatCurrency, formatRevenueKVND } from '@/lib/utils';
import { KpiCard } from '@/components/scada/KpiCard';
import { RealtimeCard } from '@/components/scada/RealtimeCard';
import { ChartRow } from '@/components/scada/ChartRow';
import { PowerLineChart } from '@/components/charts/PowerLineChart';
import { PieChartWidget } from '@/components/charts/PieChartWidget';
import { Header } from '@/components/layout/Header';

interface ScopeDashboardProps {
    scope: Scope;
}

export function ScopeDashboard({ scope }: ScopeDashboardProps) {
    // Get inverter var_names for this scope
    const inverterVars = useMemo(
        () => SCOPE_INVERTER_VARS[scope] || [],
        [scope],
    );
    const powerVar = SCOPE_POWER_VAR[scope];

    // Subscribe to realtime for inverters + power + KPIs
    const allVars = useMemo(
        () => [
            ...inverterVars,
            powerVar,
            SCOPE_DAILY_YIELD_VAR[scope],
            SCOPE_DAILY_REVENUE_VAR[scope],
            SCOPE_CUMULATIVE_YIELD_VAR[scope],
            SCOPE_CUMULATIVE_REVENUE_VAR[scope],
            SCOPE_TOTAL_YIELD_VAR[scope],
            'Current_Price',
        ].filter(Boolean),
        [inverterVars, powerVar, scope],
    );
    const { data: realtimeData, connection } = useRealtimeData({
        varNames: allVars,
    });

    // Fetch SCADA metadata for friendly names
    const { data: scadaPoints } = useScadaMetadata();

    // Current power from realtime
    const powerState = realtimeData.get(powerVar);
    const currentPower = powerState?.value ?? null;

    // Realtime KPIs
    const dailyYield = realtimeData.get(SCOPE_DAILY_YIELD_VAR[scope])?.value ?? null;
    const dailyRevenue = realtimeData.get(SCOPE_DAILY_REVENUE_VAR[scope])?.value ?? null;
    const totalYield = realtimeData.get(SCOPE_CUMULATIVE_YIELD_VAR[scope])?.value ?? null;
    const totalRevenue = realtimeData.get(SCOPE_CUMULATIVE_REVENUE_VAR[scope])?.value ?? null;
    const lifetimeYield = realtimeData.get(SCOPE_TOTAL_YIELD_VAR[scope])?.value ?? null;
    const currentPrice = realtimeData.get('Current_Price')?.value ?? null;
    const gridWIn = realtimeData.get(SCOPE_METER_W_IN[scope])?.value ?? null;
    const gridWOut = realtimeData.get(SCOPE_METER_W_OUT[scope])?.value ?? null;
    const plantConsumption = realtimeData.get(SCOPE_KW_LOAD[scope])?.value ?? null;

    const isKpiLoading = connection.status === ConnectionStatus.DISCONNECTED && dailyYield === null;

    // Helper for rendering RealtimeCard to avoid duplicate code
    const renderCard = (varName: string) => {
        const state = realtimeData.get(varName);
        const metadata = scadaPoints?.find((p) => p.var_name === varName);
        const friendlyName = metadata?.display_name ?? state?.var_name ?? varName;
        const isStaleVal = state?.isStaleComputed ?? true;
        const hour = new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
        const isDaytime = Number(hour) >= 4 && Number(hour) < 19;
        const computedQuality = (!state || state.value == null || isStaleVal || (isDaytime && state.value === 0))
            ? Quality.OFFLINE
            : Quality.GOOD;
        return (
            <RealtimeCard
                key={varName}
                displayName={friendlyName}
                value={state?.value ?? null}
                unit={metadata?.unit ?? 'kW'}
                quality={computedQuality}
                isStale={isStaleVal}
                loading={
                    connection.status === ConnectionStatus.DISCONNECTED &&
                    !state
                }
            />
        );
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Header connection={connection} />

            <main className="flex-1 p-4 lg:p-6 overflow-auto">
                <div className="max-w-[1600px] mx-auto w-full space-y-6">
                    {/* Page Title */}
                    <div>
                        <h1 className="text-2xl font-bold">
                            {SCOPE_LABELS[scope]}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Giám sát và phân tích sản lượng điện mặt trời
                        </p>
                    </div>

                    {/* KPI Cards (5 metrics + Capacity Pie Chart) */}
                    <div className="space-y-4">
                        {/* Row 1: Capacity Pie and Current Power */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-1 rounded-xl border border-border bg-card p-4">
                                <PieChartWidget
                                    data={[
                                        { scope: 'Đang phát (kW)', total_kwh: currentPower ?? 0 },
                                        { scope: 'Dự phòng (kW)', total_kwh: Math.max(0, SCOPE_CAPACITY[scope] - (currentPower ?? 0)) }
                                    ]}
                                    title="Công suất phát từ hệ SOLAR"
                                    description={`Tổng công suất thiết kế: ${formatPower(SCOPE_CAPACITY[scope])} kW`}
                                    unit="kW"
                                    valueLabel="Công suất"
                                    height={240}
                                    legendPosition="right"
                                    isLoading={connection.status === ConnectionStatus.DISCONNECTED && !powerState}
                                />
                            </div>
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Row 1, Col 1 */}
                                <KpiCard
                                    label="Công suất hiện tại / Thiết kế"
                                    value={`${formatPower(currentPower)} / ${formatPower(SCOPE_CAPACITY[scope])}`}
                                    unit="kW"
                                    icon={Zap}
                                    loading={connection.status === ConnectionStatus.DISCONNECTED && !powerState}
                                    className="w-full"
                                />
                                {/* Row 1, Col 2 */}
                                <KpiCard
                                    label="Công suất từ ngày lắp đặt"
                                    value={formatEnergy(lifetimeYield != null ? lifetimeYield / 1000 : null)}
                                    unit="MWh"
                                    icon={BarChart3}
                                    loading={isKpiLoading}
                                    className="w-full"
                                />
                                {/* Row 2, Col 1 */}
                                <KpiCard
                                    label="Giá điện thời điểm hiện tại"
                                    value={formatCurrency(currentPrice)}
                                    unit="VNĐ/KWH"
                                    icon={DollarSign}
                                    loading={isKpiLoading}
                                    className="w-full"
                                />
                                {/* Row 2, Col 2 */}
                                <div className="rounded-xl border border-border bg-card p-4 w-full overflow-hidden">
                                    <div className="flex items-center justify-between mb-3 min-w-0">
                                        <span className="text-sm sm:text-lg font-bold text-muted-foreground truncate mr-2">CO₂ Avoidance</span>
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500"><path d="M17 8c.7-1 1-2.2 1-3.5A5.5 5.5 0 0 0 12.5 0 5.5 5.5 0 0 0 7 4.5c0 1.3.3 2.5 1 3.5" /><path d="M12 22V10" /><path d="m4.5 13.5 3-3L12 15l4.5-4.5 3 3" /></svg>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today</span>
                                            <div className="flex items-baseline gap-1 mt-1 flex-wrap min-w-0">
                                                <span className="text-lg sm:text-2xl font-bold tracking-tight break-all">
                                                    {dailyYield != null ? (dailyYield * 0.7221).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : '—'}
                                                </span>
                                                <span className="text-base sm:text-xl font-semibold text-emerald-500">kg</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</span>
                                            <div className="flex items-baseline gap-1 mt-1 flex-wrap min-w-0">
                                                <span className="text-lg sm:text-2xl font-bold tracking-tight break-all">
                                                    {lifetimeYield != null ? (lifetimeYield * 0.7221 / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : '—'}
                                                </span>
                                                <span className="text-base sm:text-xl font-semibold text-emerald-500">ton</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Grid Power */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 gap-4">
                            <KpiCard
                                label="Công suất lấy từ lưới"
                                value={formatPower(gridWIn)}
                                unit="kW"
                                icon={Zap}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label="Công suất phát ngược lên lưới"
                                value={formatPower(gridWOut)}
                                unit="kW"
                                icon={Zap}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label="Công suất nhà máy đang dùng"
                                value={formatPower(plantConsumption)}
                                unit="kW"
                                icon={Zap}
                                loading={isKpiLoading}
                            />
                        </div>

                        {/* Row 3: Production and Revenue */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard
                                label="Sản lượng ngày"
                                value={formatEnergy(dailyYield)}
                                unit="kWh"
                                icon={BarChart3}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label="Doanh thu ngày"
                                value={formatRevenueKVND(dailyRevenue)}
                                unit="KVNĐ"
                                icon={DollarSign}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label="Sản lượng năm"
                                value={formatEnergy(totalYield)}
                                unit="kWh"
                                icon={BarChart3}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label="Doanh thu năm"
                                value={formatRevenueKVND(totalRevenue)}
                                unit="KVNĐ"
                                icon={DollarSign}
                                loading={isKpiLoading}
                            />
                        </div>
                    </div>

                    {/* Power Profile LineChart */}
                    <PowerLineChart scope={scope} />

                    {/* Realtime Inverter Cards */}
                    {inverterVars.length > 0 && (
                        <div>
                            <h2 className="text-lg font-bold mb-3">
                                Thiết bị trong hệ thống
                            </h2>
                            {scope === Scope.TOTAL ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {inverterVars.filter(v => v.startsWith('INVT1') || v.startsWith('INVT2')).map(renderCard)}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {inverterVars.filter(v => v.startsWith('INVT3')).map(renderCard)}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {inverterVars.filter(v => v.startsWith('INVT')).map(renderCard)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Independent Charts per Filter Type */}
                    <div className="flex flex-col gap-6 lg:gap-10">
                        <ChartRow scope={scope} filterType={FilterType.DAY} />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <ChartRow scope={scope} filterType={FilterType.WEEK} />
                            <ChartRow scope={scope} filterType={FilterType.QUARTER} />
                        </div>

                        <ChartRow scope={scope} filterType={FilterType.MONTH} />
                        <ChartRow scope={scope} filterType={FilterType.YEAR} />
                    </div>
                </div>
            </main>
        </div>
    );
}

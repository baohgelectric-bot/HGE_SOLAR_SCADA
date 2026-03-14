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
    SCOPE_HOURLY_YIELD_VAR,
    SCOPE_HOURLY_REVENUE_VAR,
    SCOPE_MONTHLY_YIELD_VAR,
    SCOPE_MONTHLY_REVENUE_VAR,
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
import { WeatherWidget } from '@/components/widgets/WeatherWidget';
import { useTranslation } from '@/hooks/useTranslation';

interface ScopeDashboardProps {
    scope: Scope;
}

export function ScopeDashboard({ scope }: ScopeDashboardProps) {
    const { t } = useTranslation();

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
            SCOPE_HOURLY_YIELD_VAR[scope],
            SCOPE_HOURLY_REVENUE_VAR[scope],
            SCOPE_DAILY_YIELD_VAR[scope],
            SCOPE_DAILY_REVENUE_VAR[scope],
            SCOPE_MONTHLY_YIELD_VAR[scope],
            SCOPE_MONTHLY_REVENUE_VAR[scope],
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
    const hourlyYield = realtimeData.get(SCOPE_HOURLY_YIELD_VAR[scope])?.value ?? null;
    const hourlyRevenue = realtimeData.get(SCOPE_HOURLY_REVENUE_VAR[scope])?.value ?? null;
    const dailyYield = realtimeData.get(SCOPE_DAILY_YIELD_VAR[scope])?.value ?? null;
    const dailyRevenue = realtimeData.get(SCOPE_DAILY_REVENUE_VAR[scope])?.value ?? null;
    const monthlyYield = realtimeData.get(SCOPE_MONTHLY_YIELD_VAR[scope])?.value ?? null;
    const monthlyRevenue = realtimeData.get(SCOPE_MONTHLY_REVENUE_VAR[scope])?.value ?? null;
    const totalYield = realtimeData.get(SCOPE_CUMULATIVE_YIELD_VAR[scope])?.value ?? null;
    const totalRevenue = realtimeData.get(SCOPE_CUMULATIVE_REVENUE_VAR[scope])?.value ?? null;
    const lifetimeYield = realtimeData.get(SCOPE_TOTAL_YIELD_VAR[scope])?.value ?? null;
    const currentPrice = realtimeData.get('Current_Price')?.value ?? null;
    const gridWInState = realtimeData.get(SCOPE_METER_W_IN[scope]);
    const gridWIn = (!gridWInState || gridWInState.isStaleComputed) ? null : gridWInState.value;
    const gridWOutState = realtimeData.get(SCOPE_METER_W_OUT[scope]);
    const gridWOut = (!gridWOutState || gridWOutState.isStaleComputed) ? null : gridWOutState.value;
    const plantConsumptionState = realtimeData.get(SCOPE_KW_LOAD[scope]);
    const plantConsumption = (!plantConsumptionState || plantConsumptionState.isStaleComputed) ? null : plantConsumptionState.value;

    const isKpiLoading = connection.status === ConnectionStatus.DISCONNECTED && dailyYield === null;

    // Helper for rendering RealtimeCard to avoid duplicate code
    const renderCard = (varName: string) => {
        const state = realtimeData.get(varName);
        const metadata = scadaPoints?.find((p) => p.var_name === varName);
        const friendlyName = metadata?.display_name ?? state?.var_name ?? varName;
        const isStaleVal = state?.isStaleComputed ?? true;

        const computedQuality = (!state || state.value == null || isStaleVal)
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
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">
                                {t(`dashboard.title_${scope.toLowerCase().replace('_', '')}` as any) || SCOPE_LABELS[scope]}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('dashboard.subtitle' as any)}
                            </p>
                        </div>
                        <WeatherWidget />
                    </div>

                    {/* KPI Cards (5 metrics + Capacity Pie Chart) */}
                    <div className="space-y-4">
                        {/* Row 1: Capacity Pie and Current Power */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-1 rounded-xl border border-border bg-card p-4">
                                <PieChartWidget
                                    data={[
                                        { scope: t('dashboard.activePower' as any), total_kwh: (powerState?.isStaleComputed || currentPower == null) ? 0 : currentPower },
                                        { scope: t('dashboard.reservePower' as any), total_kwh: Math.max(0, SCOPE_CAPACITY[scope] - ((powerState?.isStaleComputed || currentPower == null) ? 0 : currentPower)) }
                                    ]}
                                    title={t('dashboard.solarPowerTitle' as any)}
                                    description={`${t('dashboard.totalDesignPower' as any)}: ${formatPower(SCOPE_CAPACITY[scope])} kW`}
                                    unit="kW"
                                    valueLabel={t('dashboard.powerLabel' as any)}
                                    height={240}
                                    legendPosition="right"
                                    colors={['#3b82f6', '#6b7280']}
                                    isLoading={connection.status === ConnectionStatus.DISCONNECTED && !powerState}
                                />
                            </div>
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Row 1, Col 1 */}
                                <KpiCard
                                    label={t('dashboard.currentVsDesignPower' as any)}
                                    value={`${formatPower(currentPower)} / ${formatPower(SCOPE_CAPACITY[scope])}`}
                                    unit="kW"
                                    icon={Zap}
                                    loading={connection.status === ConnectionStatus.DISCONNECTED && !powerState}
                                    className="w-full"
                                />
                                {/* Row 1, Col 2 */}
                                <KpiCard
                                    label={t('dashboard.lifetimeYield' as any)}
                                    value={formatEnergy(lifetimeYield != null ? lifetimeYield / 1000 : null)}
                                    unit="MWh"
                                    icon={BarChart3}
                                    loading={isKpiLoading}
                                    className="w-full"
                                />
                                {/* Row 2, Col 1 */}
                                <KpiCard
                                    label={t('dashboard.currentPrice' as any)}
                                    value={formatCurrency(currentPrice)}
                                    unit={t('dashboard.unitVndKwh' as any)}
                                    icon={DollarSign}
                                    loading={isKpiLoading}
                                    className="w-full"
                                    valueSuffix={
                                        <span className="ml-[10px] text-sm lg:text-base font-bold text-green-500 whitespace-nowrap">
                                            {currentPrice === 3398 ? t('dashboard.peakHour' as any) :
                                                currentPrice === 1190 ? t('dashboard.offPeakHour' as any) :
                                                    currentPrice === 1833 ? t('dashboard.normalHour' as any) :
                                                        t('dashboard.unknown' as any)}
                                        </span>
                                    }
                                />
                                {/* Row 2, Col 2 */}
                                <div className="rounded-xl border border-border bg-card p-4 w-full overflow-hidden">
                                    <div className="flex items-center justify-between mb-3 min-w-0">
                                        <span className="text-sm sm:text-lg font-bold text-muted-foreground truncate mr-2">{t('dashboard.co2Avoidance' as any)}</span>
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500"><path d="M17 8c.7-1 1-2.2 1-3.5A5.5 5.5 0 0 0 12.5 0 5.5 5.5 0 0 0 7 4.5c0 1.3.3 2.5 1 3.5" /><path d="M12 22V10" /><path d="m4.5 13.5 3-3L12 15l4.5-4.5 3 3" /></svg>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.today' as any)}</span>
                                            <div className="flex items-baseline gap-1 mt-1 flex-wrap min-w-0">
                                                <span className="text-lg sm:text-2xl font-bold tracking-tight break-all">
                                                    {dailyYield != null ? (dailyYield * 0.7221).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : '—'}
                                                </span>
                                                <span className="text-base sm:text-xl font-semibold text-emerald-500">kg</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.total' as any)}</span>
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
                                label={t('dashboard.gridImport' as any)}
                                value={formatPower(gridWIn)}
                                unit="kW"
                                icon={Zap}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label={t('dashboard.gridExport' as any)}
                                value={formatPower(gridWOut)}
                                unit="kW"
                                icon={Zap}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label={t('dashboard.totalConsumption' as any)}
                                value={formatPower(plantConsumption)}
                                unit="kW"
                                icon={Zap}
                                loading={isKpiLoading}
                            />
                        </div>
                    </div>

                    {/* Power Profile LineChart */}
                    <PowerLineChart scope={scope} />

                    {/* Doanh thu và Sản lượng */}
                    <div>
                        <h2 className="text-lg font-bold mb-3">
                            {t('dashboard.revenueAndYield' as any)}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard
                                label={t('dashboard.hourlyYield' as any)}
                                value={formatEnergy(hourlyYield)}
                                unit="kWh"
                                icon={BarChart3}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label={t('dashboard.hourlyRevenue' as any)}
                                value={formatRevenueKVND(hourlyRevenue)}
                                unit={t('dashboard.unitKvnd' as any)}
                                icon={DollarSign}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label={t('dashboard.dailyYield' as any)}
                                value={formatEnergy(dailyYield)}
                                unit="kWh"
                                icon={BarChart3}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label={t('dashboard.dailyRevenue' as any)}
                                value={formatRevenueKVND(dailyRevenue)}
                                unit={t('dashboard.unitKvnd' as any)}
                                icon={DollarSign}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label={t('dashboard.monthlyYield' as any)}
                                value={formatEnergy(monthlyYield)}
                                unit="kWh"
                                icon={BarChart3}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label={t('dashboard.monthlyRevenue' as any)}
                                value={formatRevenueKVND(monthlyRevenue)}
                                unit={t('dashboard.unitKvnd' as any)}
                                icon={DollarSign}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label={t('dashboard.yearlyYield' as any)}
                                value={formatEnergy(totalYield)}
                                unit="kWh"
                                icon={BarChart3}
                                loading={isKpiLoading}
                            />
                            <KpiCard
                                label={t('dashboard.yearlyRevenue' as any)}
                                value={formatRevenueKVND(totalRevenue)}
                                unit={t('dashboard.unitKvnd' as any)}
                                icon={DollarSign}
                                loading={isKpiLoading}
                            />
                        </div>
                    </div>

                    {/* Realtime Inverter Cards */}
                    {inverterVars.length > 0 && (
                        <div>
                            <h2 className="text-lg font-bold mb-3">
                                {t('dashboard.systemDevices' as any)}
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

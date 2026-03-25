'use client';

import { useMemo } from 'react';
import {
    Scope,
    SCOPE_LABELS,
    SCOPE_POWER_VAR,
    SCOPE_CAPACITY,
    SCOPE_INVERTER_VARS,
    ConnectionStatus,
    Quality,
} from '@/config/constants';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { useScadaMetadata } from '@/hooks/useBillingQueries';
import { formatPower } from '@/lib/utils';
import { PieChartWidget } from '@/components/charts/PieChartWidget';
import { RealtimeCard } from '@/components/scada/RealtimeCard';
import { Header } from '@/components/layout/Header';
import { WeatherWidget } from '@/components/widgets/WeatherWidget';
import { useTranslation } from '@/hooks/useTranslation';
import { MultiDeviceLineChart, type LineConfig } from '@/components/charts/MultiDeviceLineChart';
import { useHourlyPowerProfile, useDailyYieldProfile } from '@/hooks/useMultiDeviceCharts';

const OVERVIEW_SCOPES = [
    Scope.TOTAL,
    Scope.TOTAL_A,
    Scope.TOTAL_B,
    Scope.DM1,
    Scope.DM2,
    Scope.DM3,
];

export default function PlantOverviewPage() {
    const { t } = useTranslation();
    const inverterVars = useMemo(
        () => SCOPE_INVERTER_VARS[Scope.TOTAL].filter(v => v.startsWith('INVT')),
        []
    );

    // Realtime data for all power vars + inverter vars
    const allVars = useMemo(
        () => [
            ...OVERVIEW_SCOPES.map(scope => SCOPE_POWER_VAR[scope]),
            ...inverterVars,
        ],
        [inverterVars]
    );

    const { data: realtimeData, connection } = useRealtimeData({
        varNames: allVars,
    });

    const { data: scadaPoints } = useScadaMetadata();

    const { data: hourlyData, isLoading: isHourlyLoading, isError: isHourlyError } = useHourlyPowerProfile();
    const { data: dailyData, isLoading: isDailyLoading, isError: isDailyError } = useDailyYieldProfile();

    const hourlyLines: LineConfig[] = useMemo(() => [
        { key: 'METER1_1_Active_Power', name: 'DM1 (kW)', color: '#ef4444' },
        { key: 'METER2_1_Active_Power', name: 'DM2 (kW)', color: '#ebdf38ff' },
        { key: 'METER3_1_Active_Power', name: 'DM3 (kW)', color: '#29e71fff' },
        { key: 'INVT1_1_Active_Power', name: 'INVT 1 (kW)', color: '#ef4444' },
        { key: 'INVT1_2_Active_Power', name: 'INVT 2 (kW)', color: '#ebdf38ff' },
        { key: 'INVT2_1_Active_Power', name: 'INVT 3 (kW)', color: '#3b14eaff' },
        { key: 'INVT2_2_Active_Power', name: 'INVT 4 (kW)', color: '#34d399' },
        { key: 'INVT3_1_Active_Power', name: 'INVT 5 (kW)', color: '#ef4444' },
        { key: 'INVT3_2_Active_Power', name: 'INVT 6 (kW)', color: '#ebdf38ff' },
        { key: 'INVT3_3_Active_Power', name: 'INVT 7 (kW)', color: '#3b14eaff' },
        { key: 'INVT3_4_Active_Power', name: 'INVT 8 (kW)', color: '#34d399' },
    ], []);

    const dailyLines: LineConfig[] = useMemo(() => [
        { key: 'TOTAL', name: 'TOTAL PLANT (kWh)', color: '#3b82f6' },
        { key: 'TOTAL_A', name: 'UMC4A (kWh)', color: '#10b981' },
        { key: 'TOTAL_B', name: 'UMC4B (kWh)', color: '#ec28bbff' },
        { key: 'DM1_Total_Yield', name: 'DM1 (kWh)', color: '#ef4444' },
        { key: 'DM2_Total_Yield', name: 'DM2 (kWh)', color: '#ebdf38ff' },
        { key: 'DM3_Total_Yield', name: 'DM3 (kWh)', color: '#29e71fff' },
    ], []);

    const hourLabel = useMemo(() => {
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const hNext = ((now.getHours() + 1) % 24).toString().padStart(2, '0');
        return `${h}:00 – ${hNext}:00`;
    }, []);

    const todayLabel = useMemo(() => {
        const now = new Date();
        return now.toLocaleDateString('vi-VN');
    }, []);

    // Helper: trả về 0 nếu dữ liệu stale hoặc không có, tránh hiển thị giá trị cũ trên PieChart
    const getSafePower = (varName: string): number => {
        const state = realtimeData.get(varName);
        if (!state || state.value == null || state.isStaleComputed) return 0;
        return state.value;
    };

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
                    {/* Title */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">{t('dashboard.title_overview' as any)}</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('dashboard.overviewSubtitle')}
                            </p>
                        </div>
                        <WeatherWidget />
                    </div>

                    {/* Contribution Pie Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tỷ lệ đóng góp theo phân xưởng */}
                        {(() => {
                            const umc4aPower = getSafePower(SCOPE_POWER_VAR[Scope.TOTAL_A]);
                            const umc4bPower = getSafePower(SCOPE_POWER_VAR[Scope.TOTAL_B]);
                            const totalCapacity = 880;
                            const reserve = Math.max(0, totalCapacity - umc4aPower - umc4bPower);
                            const isLoading = connection.status === ConnectionStatus.DISCONNECTED
                                && !realtimeData.get(SCOPE_POWER_VAR[Scope.TOTAL_A]);
                            return (
                                <div className="rounded-xl border border-border bg-card p-4">
                                    <PieChartWidget
                                        data={[
                                            { scope: 'UMC4A (kW)', total_kwh: umc4aPower },
                                            { scope: 'UMC4B (kW)', total_kwh: umc4bPower },
                                            { scope: t('dashboard.reservePower'), total_kwh: reserve },
                                        ]}
                                        title={t('dashboard.contributionByWorkshop')}
                                        description={`${t('dashboard.totalDesignPower')}: ${formatPower(totalCapacity)} kW`}
                                        unit="kW"
                                        valueLabel={t('dashboard.powerLabel')}
                                        height={280}
                                        legendPosition="right"
                                        colors={['#3b82f6', '#10b981', '#6b7280']}
                                        isLoading={isLoading}
                                    />
                                </div>
                            );
                        })()}

                        {/* Tỷ lệ đóng góp theo DM */}
                        {(() => {
                            const dm1Power = getSafePower(SCOPE_POWER_VAR[Scope.DM1]);
                            const dm2Power = getSafePower(SCOPE_POWER_VAR[Scope.DM2]);
                            const dm3Power = getSafePower(SCOPE_POWER_VAR[Scope.DM3]);
                            const totalCapacity = 880;
                            const reserve = Math.max(0, totalCapacity - dm1Power - dm2Power - dm3Power);
                            const isLoading = connection.status === ConnectionStatus.DISCONNECTED
                                && !realtimeData.get(SCOPE_POWER_VAR[Scope.DM1]);
                            return (
                                <div className="rounded-xl border border-border bg-card p-4">
                                    <PieChartWidget
                                        data={[
                                            { scope: 'DM1 (kW)', total_kwh: dm1Power },
                                            { scope: 'DM2 (kW)', total_kwh: dm2Power },
                                            { scope: 'DM3 (kW)', total_kwh: dm3Power },
                                            { scope: t('dashboard.reservePower'), total_kwh: reserve },
                                        ]}
                                        title={t('dashboard.contributionByDM')}
                                        description={`${t('dashboard.totalDesignPower')}: ${formatPower(totalCapacity)} kW`}
                                        unit="kW"
                                        valueLabel={t('dashboard.powerLabel')}
                                        height={280}
                                        legendPosition="right"
                                        colors={['#3b82f6', '#10b981', '#f59e0b', '#6b7280']}
                                        isLoading={isLoading}
                                    />
                                </div>
                            );
                        })()}
                    </div>

                    {/* 6 Pie Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {OVERVIEW_SCOPES.map(scope => {
                            const powerState = realtimeData.get(SCOPE_POWER_VAR[scope]);
                            const capacity = SCOPE_CAPACITY[scope];
                            const currentPower = getSafePower(SCOPE_POWER_VAR[scope]);
                            const reservePower = Math.max(0, capacity - currentPower);
                            const isLoading = connection.status === ConnectionStatus.DISCONNECTED && !powerState;

                            return (
                                <div key={scope} className="rounded-xl border border-border bg-card p-4">
                                    <h2 className="text-lg font-bold mb-4 text-center">
                                        {t(`sidebar.${scope.toLowerCase().replace('_', '')}` as any) || SCOPE_LABELS[scope]}
                                    </h2>
                                    <PieChartWidget
                                        data={[
                                            { scope: t('dashboard.activePower'), total_kwh: currentPower },
                                            { scope: t('dashboard.reservePower'), total_kwh: reservePower }
                                        ]}
                                        title={t('dashboard.solarPowerTitle')}
                                        description={`${t('dashboard.totalDesignPower')}: ${formatPower(capacity)} kW`}
                                        unit="kW"
                                        valueLabel={t('dashboard.powerLabel')}
                                        height={240}
                                        legendPosition="bottom"
                                        colors={['#3b82f6', '#6b7280']}
                                        isLoading={isLoading}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Multi-Device Line Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <MultiDeviceLineChart
                            title={t('dashboard.hourlyPowerProfile' as any)}
                            subtitle={hourLabel}
                            data={hourlyData}
                            lines={hourlyLines}
                            isLoading={isHourlyLoading}
                            isError={isHourlyError}
                            unit="kW"
                        />
                        <MultiDeviceLineChart
                            title={t('dashboard.dailyYieldProfile' as any)}
                            subtitle={todayLabel}
                            data={dailyData}
                            lines={dailyLines}
                            isLoading={isDailyLoading}
                            isError={isDailyError}
                            unit="kWh"
                            yAxisDomain={[0, 900]}
                        />
                    </div>

                    {/* Realtime Inverter Cards from TOTAL scope */}
                    {inverterVars.length > 0 && (
                        <div>
                            <h2 className="text-lg font-bold mb-3">
                                {t('dashboard.systemDevices')}
                            </h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {inverterVars.filter(v => v.startsWith('INVT1') || v.startsWith('INVT2')).map(renderCard)}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {inverterVars.filter(v => v.startsWith('INVT3')).map(renderCard)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

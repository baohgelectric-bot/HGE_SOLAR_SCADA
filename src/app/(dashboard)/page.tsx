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

const OVERVIEW_SCOPES = [
    Scope.TOTAL,
    Scope.TOTAL_A,
    Scope.TOTAL_B,
    Scope.DM1,
    Scope.DM2,
    Scope.DM3,
];

export default function PlantOverviewPage() {
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

    const renderCard = (varName: string) => {
        const state = realtimeData.get(varName);
        const metadata = scadaPoints?.find((p) => p.var_name === varName);
        const friendlyName = metadata?.display_name ?? state?.var_name ?? varName;
        const isStaleVal = state?.isStaleComputed ?? true;
        const hour = new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
        const isDaytime = Number(hour) >= 5 && Number(hour) < 18;
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
                    {/* Title */}
                    <div>
                        <h1 className="text-2xl font-bold">Plant Overview</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Tổng quan công suất phát từ hệ SOLAR của các phân khu
                        </p>
                    </div>

                    {/* Contribution Pie Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tỷ lệ đóng góp theo phân xưởng */}
                        {(() => {
                            const umc4aPower = realtimeData.get(SCOPE_POWER_VAR[Scope.TOTAL_A])?.value ?? 0;
                            const umc4bPower = realtimeData.get(SCOPE_POWER_VAR[Scope.TOTAL_B])?.value ?? 0;
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
                                            { scope: 'Dự phòng (kW)', total_kwh: reserve },
                                        ]}
                                        title="Tỷ lệ đóng góp theo phân xưởng"
                                        description={`Tổng công suất thiết kế: ${formatPower(totalCapacity)} kW`}
                                        unit="kW"
                                        valueLabel="Công suất"
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
                            const dm1Power = realtimeData.get(SCOPE_POWER_VAR[Scope.DM1])?.value ?? 0;
                            const dm2Power = realtimeData.get(SCOPE_POWER_VAR[Scope.DM2])?.value ?? 0;
                            const dm3Power = realtimeData.get(SCOPE_POWER_VAR[Scope.DM3])?.value ?? 0;
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
                                            { scope: 'Dự phòng (kW)', total_kwh: reserve },
                                        ]}
                                        title="Tỷ lệ đóng góp theo DM"
                                        description={`Tổng công suất thiết kế: ${formatPower(totalCapacity)} kW`}
                                        unit="kW"
                                        valueLabel="Công suất"
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
                            const powerValue = powerState?.value ?? null;
                            const capacity = SCOPE_CAPACITY[scope];
                            const currentPower = powerValue ?? 0;
                            const reservePower = Math.max(0, capacity - currentPower);
                            const isLoading = connection.status === ConnectionStatus.DISCONNECTED && !powerState;

                            return (
                                <div key={scope} className="rounded-xl border border-border bg-card p-4">
                                    <h2 className="text-lg font-bold mb-4 text-center">{SCOPE_LABELS[scope]}</h2>
                                    <PieChartWidget
                                        data={[
                                            { scope: 'Đang phát (kW)', total_kwh: currentPower },
                                            { scope: 'Dự phòng (kW)', total_kwh: reservePower }
                                        ]}
                                        title="Công suất phát từ hệ SOLAR"
                                        description={`Tổng công suất thiết kế: ${formatPower(capacity)} kW`}
                                        unit="kW"
                                        valueLabel="Công suất"
                                        height={240}
                                        legendPosition="bottom"
                                        colors={['#3b82f6', '#6b7280']}
                                        isLoading={isLoading}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Realtime Inverter Cards from TOTAL scope */}
                    {inverterVars.length > 0 && (
                        <div>
                            <h2 className="text-lg font-bold mb-3">
                                Thiết bị trong hệ thống
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

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Cpu,
    HardDrive,
    MemoryStick,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Clock,
    Server,
    ScrollText,
    Activity,
    Wifi,
    WifiOff,
    Zap,
    Cpu as CpuIcon,
    GaugeCircle,
    Info
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/Header';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { WeatherWidget } from '@/components/widgets/WeatherWidget';
import { useTranslation } from '@/hooks/useTranslation';

/* ─── Types ─── */
type BackendStatus = 'online' | 'offline' | 'restarted';

interface BackendEvent {
    id: number;
    event_type: BackendStatus;
    message: string;
    recorded_at: string;
}

interface DeviceEvent {
    id: number;
    device_name: string;
    event_type: 'online' | 'offline';
    message: string;
    recorded_at: string;
}

/* ─── Constants ─── */
const SYS_VARS = ['sys_ram', 'sys_disk_free', 'sys_uptime_seconds'];

const COM_STATUS_VARS = [
    'DM1_Com_Status', 'DM2_Com_Status', 'DM3_Com_Status',
    'INVT1_1_Com_Status', 'INVT1_2_Com_Status', 'INVT2_1_Com_Status', 'INVT2_2_Com_Status',
    'INVT3_1_Com_Status', 'INVT3_2_Com_Status', 'INVT3_3_Com_Status', 'INVT3_4_Com_Status',
    'METER1_2_Com_Status', 'METER2_2_Com_Status', 'METER3_2_Com_Status'
];

const EVENTS_REFETCH_MS = 30_000; // 30 seconds

/* ─── Helpers ─── */
function formatUptime(seconds: number | null, t: any): string {
    if (seconds == null || seconds < 0) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
}

function getMetricColor(varName: string, value: number | null): string {
    if (value == null) return 'text-muted-foreground';
    switch (varName) {
        case 'sys_ram':
            if (value >= 90) return 'text-red-500';
            if (value >= 70) return 'text-amber-500';
            return 'text-sky-500';
        case 'sys_disk_free':
            if (value <= 1) return 'text-red-500';
            if (value <= 3) return 'text-amber-500';
            return 'text-emerald-500';
        default:
            return 'text-sky-500';
    }
}

function getMetricBgColor(varName: string, value: number | null): string {
    if (value == null) return 'bg-muted/50';
    switch (varName) {
        case 'sys_ram':
            if (value >= 90) return 'bg-red-500/10';
            if (value >= 70) return 'bg-amber-500/10';
            return 'bg-sky-500/10';
        case 'sys_disk_free':
            if (value <= 1) return 'bg-red-500/10';
            if (value <= 3) return 'bg-amber-500/10';
            return 'bg-emerald-500/10';
        default:
            return 'bg-sky-500/10';
    }
}

function getProgressPercent(varName: string, value: number | null): number {
    if (value == null) return 0;
    switch (varName) {
        case 'sys_ram':
            return Math.min(100, value);
        case 'sys_disk_free':
            // Assuming 16GB total eMMC on IOT2050
            return Math.min(100, (value / 16) * 100);
        default:
            return 0;
    }
}

const METRIC_CONFIG_KEYS = {
    sys_ram: { labelKey: 'ram', unit: '%' },
    sys_disk_free: { labelKey: 'freeDisk', unit: 'GB' },
};

/* ─── Circular Progress Ring ─── */
function CircularProgress({ percent, color, size = 64, strokeWidth = 5 }: {
    percent: number;
    color: string;
    size?: number;
    strokeWidth?: number;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/30"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`${color} transition-all duration-700 ease-out`}
            />
        </svg>
    );
}

/* ─── MetricCard ─── */
function MetricCard({ varName, value, t }: { varName: string; value: number | null; t: any }) {
    const configKey = METRIC_CONFIG_KEYS[varName as keyof typeof METRIC_CONFIG_KEYS];
    if (!configKey) return null;

    const Icon = varName === 'sys_ram' ? MemoryStick : HardDrive;
    const color = getMetricColor(varName, value);
    const bgColor = getMetricBgColor(varName, value);
    const percent = getProgressPercent(varName, value);

    return (
        <div className="relative rounded-xl border border-border bg-card p-5 flex flex-col items-center gap-3 overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            {/* Subtle gradient overlay */}
            <div className={`absolute inset-0 opacity-[0.03] ${bgColor}`} />

            <div className="relative">
                <CircularProgress percent={percent} color={color} size={80} strokeWidth={6} />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className={`h-6 w-6 ${color} transition-colors`} />
                </div>
            </div>

            <div className="text-center z-10">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    {t(`monitor.${configKey.labelKey}` as any)}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-3xl font-bold tracking-tight ${color} transition-colors`}>
                        {value != null ? (varName === 'sys_disk_free' ? value.toFixed(1) : Math.round(value)) : '—'}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">{configKey.unit}</span>
                </div>
            </div>
        </div>
    );
}

/* ─── StatusBadge ─── */
function StatusBadge({ status, t }: { status: BackendStatus; t: any }) {
    const config = {
        online: {
            icon: CheckCircle2,
            label: t('monitor.online' as any) || 'Online',
            desc: t('monitor.backendActive' as any),
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            ring: 'ring-emerald-500/20',
            pulse: 'bg-emerald-500',
        },
        offline: {
            icon: XCircle,
            label: t('monitor.offline' as any) || 'Offline',
            desc: t('monitor.backendOffline' as any),
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            ring: 'ring-red-500/20',
            pulse: 'bg-red-500',
        },
        restarted: {
            icon: RotateCcw,
            label: t('monitor.restarted' as any) || 'Restarted',
            desc: t('monitor.sysRestarted' as any),
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            ring: 'ring-amber-500/20',
            pulse: 'bg-amber-500',
        },
    }[status];

    const Icon = config.icon;

    return (
        <div className={`rounded-xl border ${config.border} ${config.bg} p-5 ring-1 ${config.ring} transition-all duration-500`}>
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className={`absolute inset-0 rounded-full ${config.pulse} animate-ping opacity-20`} />
                    <div className={`relative p-3 rounded-full ${config.bg}`}>
                        <Icon className={`h-7 w-7 ${config.color}`} />
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className={`text-xl font-bold ${config.color}`}>{config.label}</h3>
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.pulse} ${status === 'online' ? 'animate-pulse' : ''}`} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{config.desc}</p>
                </div>
            </div>
        </div>
    );
}

/* ─── DeviceStatusCard ─── */
function DeviceStatusCard({ name, statusValue, t }: { name: string; statusValue: number | null; t: any }) {
    const isOnline = statusValue === 1.0;
    const isUnknown = statusValue === null || statusValue === undefined;

    // Xác định nội dung thông báo online riêng biệt cho từng nhóm để dễ tuỳ chỉnh sau này
    let onlineDesc = t('monitor.dmConnected' as any) || 'Đang kết nối bình thường';
    if (name.startsWith('DM')) {
        onlineDesc = t('monitor.dmConnected' as any);
    } else if (name.startsWith('INVT')) {
        onlineDesc = t('monitor.invtConnected' as any);
    } else if (name.startsWith('METER')) {
        onlineDesc = t('monitor.meterConnected' as any);
    }

    // Xác định nội dung thông báo offline riêng biệt cho từng nhóm
    let offlineDesc = 'Mất kết nối thiết bị!';
    if (name.startsWith('DM')) {
        offlineDesc = t('monitor.dmDisconnected' as any);
    } else if (name.startsWith('INVT')) {
        offlineDesc = t('monitor.invtDisconnected' as any);
    } else if (name.startsWith('METER')) {
        offlineDesc = t('monitor.meterDisconnected' as any);
    }

    const config = isOnline ? {
        icon: CheckCircle2,
        label: t('monitor.online' as any) || 'Online',
        desc: onlineDesc,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        ring: 'ring-emerald-500/20',
        pulse: 'bg-emerald-500',
    } : isUnknown ? {
        icon: Wifi,
        label: 'N/A',
        desc: 'Chưa có thông tin kết nối',
        color: 'text-muted-foreground',
        bg: 'bg-muted/30',
        border: 'border-border/50',
        ring: 'ring-border/10',
        pulse: 'bg-muted-foreground',
    } : {
        icon: XCircle,
        label: 'Offline',
        desc: offlineDesc,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        ring: 'ring-red-500/20',
        pulse: 'bg-red-500',
    };

    const Icon = config.icon;

    // Tự định nghĩa một từ điển các tên gọi
    const DEVICE_NAMES: Record<string, string> = {
        'DM1_Com_Status': 'Datamanager 1',
        'DM2_Com_Status': 'Datamanager 2',
        'DM3_Com_Status': 'Datamanager 3',
        'INVT1_1_Com_Status': 'INVERTER 1',
        'INVT1_2_Com_Status': 'INVERTER 2',
        'INVT2_1_Com_Status': 'INVERTER 3',
        'INVT2_2_Com_Status': 'INVERTER 4',
        'INVT3_1_Com_Status': 'INVERTER 5',
        'INVT3_2_Com_Status': 'INVERTER 6',
        'INVT3_3_Com_Status': 'INVERTER 7',
        'INVT3_4_Com_Status': 'INVERTER 8',
        'METER1_2_Com_Status': 'Meter MSB1',
        'METER2_2_Com_Status': 'Meter MSB2',
        'METER3_2_Com_Status': 'Meter MSB3',
    };

    const deviceName = DEVICE_NAMES[name] || name.replace('_Com_Status', '');

    return (
        <div className={`rounded-xl border ${config.border} ${config.bg} p-4 ring-1 ${config.ring} transition-all duration-500`}>
            <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                    {!isUnknown && (
                        <div className={`absolute inset-0 rounded-full ${config.pulse} animate-ping opacity-20`} />
                    )}
                    <div className={`relative p-2.5 rounded-full ${config.bg}`}>
                        <Icon className={`h-6 w-6 ${config.color}`} />
                    </div>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className={`text-base font-bold ${config.color} truncate`} title={deviceName}>
                            {deviceName}
                        </h3>
                        {!isUnknown && (
                            <span className={`inline-block shrink-0 h-2 w-2 rounded-full ${config.pulse} ${isOnline ? 'animate-pulse' : ''}`} />
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate" title={config.desc}>{config.desc}</p>
                </div>
            </div>
        </div>
    );
}


function translateEventMessage(msg: string, eventType: string, deviceName?: string, t?: any) {
    if (!msg) return msg;

    // For original text-based fallback
    if (msg.includes('Backend có kết nối trở lại')) return t('monitor.backendActive' as any);
    if (msg.includes('Backend mất kết nối')) return t('monitor.backendOffline' as any);
    if (msg.includes('Hệ thống vừa khởi động lại') || msg.includes('Hệ thống khởi động lại (uptime reset)')) return t('monitor.sysRestarted' as any);
    if (msg.includes('Có kết nối từ DM tới IOT2050')) return t('monitor.dmConnected' as any);
    if (msg.includes('Mất kết nối từ DM tới IOT2050')) return t('monitor.dmDisconnected' as any);
    if (msg.includes('Có kết nối từ Inverter tới bộ DM')) return t('monitor.invtConnected' as any);
    if (msg.includes('Mất kết nối từ Inverter tới bộ DM')) return t('monitor.invtDisconnected' as any);
    if (msg.includes('Có kết nối từ Energy Meter tới bộ DM')) return t('monitor.meterConnected' as any);
    if (msg.includes('Mất kết nối từ Energy Meter tới bộ DM')) return t('monitor.meterDisconnected' as any);

    // New logic based on status codes '0', '1', '2'
    if (msg === '1') {
        if (!deviceName) return t('monitor.backendActive' as any); // Backend event
        if (deviceName.startsWith('DM')) return t('monitor.dmConnected' as any);
        if (deviceName.startsWith('INVT')) return t('monitor.invtConnected' as any);
        if (deviceName.startsWith('METER')) return t('monitor.meterConnected' as any);
        return t('monitor.online' as any) || 'Đang kết nối bình thường';
    }
    if (msg === '0') {
        if (!deviceName) return t('monitor.backendOffline' as any); // Backend event
        if (deviceName.startsWith('DM')) return t('monitor.dmDisconnected' as any);
        if (deviceName.startsWith('INVT')) return t('monitor.invtDisconnected' as any);
        if (deviceName.startsWith('METER')) return t('monitor.meterDisconnected' as any);
        return t('monitor.offline' as any) || 'Mất kết nối thiết bị!';
    }
    if (msg === '2') {
        if (!deviceName) return t('monitor.sysRestarted' as any); // Backend event
        return t('monitor.unknown' as any) || 'Chưa biết trạng thái hiện tại';
    }

    return msg;
}

/* ─── EventRow ─── */
function EventRow({ event, t }: { event: BackendEvent; t: any }) {
    const timeStr = new Date(event.recorded_at).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    const typeConfig = {
        online: { color: 'text-sky-400', bg: 'bg-sky-500/10', icon: Wifi, label: t('monitor.online' as any) || 'ONLINE' },
        restarted: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: RotateCcw, label: t('monitor.restarted' as any) || 'RESTART' },
        offline: { color: 'text-red-400', bg: 'bg-red-500/10', icon: WifiOff, label: t('monitor.offline' as any) || 'OFFLINE' },
    }[event.event_type] || { color: 'text-gray-400', bg: 'bg-gray-500/10', icon: Info, label: event.event_type };

    const Icon = typeConfig.icon;

    return (
        <div className="flex items-start gap-3 px-4 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
            <div className={`mt-0.5 p-1 rounded ${typeConfig.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${typeConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{translateEventMessage(event.message, event.event_type, undefined, t)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{timeStr}</p>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeConfig.bg} ${typeConfig.color} opacity-60 group-hover:opacity-100 transition-opacity`}>
                {typeConfig.label}
            </span>
        </div>
    );
}

/* ─── DeviceEventRow ─── */
function DeviceEventRow({ event, t }: { event: DeviceEvent; t: any }) {
    const timeStr = new Date(event.recorded_at).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    const typeConfig = {
        online: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: Wifi, label: t('monitor.online' as any) || 'ONLINE' },
        offline: { color: 'text-red-400', bg: 'bg-red-500/10', icon: WifiOff, label: t('monitor.offline' as any) || 'OFFLINE' },
    }[event.event_type] || { color: 'text-gray-400', bg: 'bg-gray-500/10', icon: Info, label: event.event_type };

    const Icon = typeConfig.icon;

    const DEVICE_NAMES: Record<string, string> = {
        'DM1_Com_Status': 'Datamanager 1',
        'DM2_Com_Status': 'Datamanager 2',
        'DM3_Com_Status': 'Datamanager 3',
        'INVT1_1_Com_Status': 'INVERTER 1',
        'INVT1_2_Com_Status': 'INVERTER 2',
        'INVT2_1_Com_Status': 'INVERTER 3',
        'INVT2_2_Com_Status': 'INVERTER 4',
        'INVT3_1_Com_Status': 'INVERTER 5',
        'INVT3_2_Com_Status': 'INVERTER 6',
        'INVT3_3_Com_Status': 'INVERTER 7',
        'INVT3_4_Com_Status': 'INVERTER 8',
        'METER1_2_Com_Status': 'Meter MSB1',
        'METER2_2_Com_Status': 'Meter MSB2',
        'METER3_2_Com_Status': 'Meter MSB3',
    };
    const deviceName = DEVICE_NAMES[event.device_name] || event.device_name.replace('_Com_Status', '');

    return (
        <div className="flex items-start gap-3 px-4 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
            <div className={`mt-0.5 p-1 rounded ${typeConfig.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${typeConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug font-medium">{deviceName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {translateEventMessage(event.message, event.event_type, event.device_name, t)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{timeStr}</p>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeConfig.bg} ${typeConfig.color} opacity-60 group-hover:opacity-100 transition-opacity`}>
                {typeConfig.label}
            </span>
        </div>
    );
}

/* ─── Main Component ─── */
export default function MonitorBackendPage() {
    const varNames = useMemo(() => [...SYS_VARS, ...COM_STATUS_VARS], []);

    const { data: realtimeData, connection } = useRealtimeData({
        varNames,
    });

    const { t } = useTranslation();

    const [events, setEvents] = useState<BackendEvent[]>([]);
    const [deviceEvents, setDeviceEvents] = useState<DeviceEvent[]>([]);
    const [backendStatus, setBackendStatus] = useState<BackendStatus>('online');

    // Fetch events from backend_events and device_events tables
    const fetchEvents = useCallback(async () => {
        try {
            const supabase = getSupabaseBrowserClient();

            // Fetch backend events
            const { data: backendData, error: backendError } = await supabase
                .from('backend_events')
                .select('*')
                .order('recorded_at', { ascending: false })
                .limit(20);

            if (backendError) {
                console.error('Failed to fetch backend events:', backendError);
            } else {
                const rows = (backendData ?? []) as BackendEvent[];
                setEvents(rows);

                // Derive current status from the latest event
                if (rows.length > 0) {
                    setBackendStatus(rows[0].event_type);
                }
            }

            // Fetch device events
            const { data: deviceData, error: deviceError } = await supabase
                .from('device_events')
                .select('*')
                .in('device_name', COM_STATUS_VARS)
                .order('recorded_at', { ascending: false })
                .limit(30);

            if (deviceError) {
                console.error('Failed to fetch device events:', deviceError);
            } else {
                setDeviceEvents((deviceData ?? []) as DeviceEvent[]);
            }

        } catch (err) {
            console.error('Failed to fetch events:', err);
        }
    }, []);

    // Initial load + periodic refresh
    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, EVENTS_REFETCH_MS);
        return () => clearInterval(interval);
    }, [fetchEvents]);

    // Extract metric values
    const sysRam = realtimeData.get('sys_ram')?.value ?? null;
    const sysDiskFree = realtimeData.get('sys_disk_free')?.value ?? null;
    const sysUptime = realtimeData.get('sys_uptime_seconds')?.value ?? null;

    // Filter statuses by group
    const inverterVars = COM_STATUS_VARS.filter(v => v.startsWith('INVT'));
    const dmVars = COM_STATUS_VARS.filter(v => v.startsWith('DM'));
    const meterVars = COM_STATUS_VARS.filter(v => v.startsWith('METER'));

    return (
        <div className="flex flex-col min-h-screen">
            <Header connection={connection} />

            <main className="flex-1 p-4 lg:p-6 overflow-auto">
                <div className="max-w-[1600px] mx-auto w-full space-y-6">
                    {/* Title */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">{t('monitor.title' as any)}</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('monitor.desc' as any)}
                            </p>
                        </div>
                        <WeatherWidget />
                    </div>

                    {/* Backend Status + Uptime */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <StatusBadge status={backendStatus} t={t} />

                        <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-violet-500/10">
                                <Clock className="h-7 w-7 text-violet-500" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {t('monitor.uptime' as any)}
                                </p>
                                <p className="text-2xl font-bold tracking-tight text-violet-500 mt-0.5">
                                    {formatUptime(sysUptime, t)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {sysUptime != null ? `${Math.floor(sysUptime).toLocaleString('vi-VN')} ${t('monitor.seconds' as any)}` : '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Device Status Grid */}
                    <div className="space-y-6 mt-8">
                        {/* DM Group */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <CpuIcon className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-bold">{t('monitor.dm' as any)}</h2>
                                <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{dmVars.length} {t('monitor.devices' as any)}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {dmVars.map(varName => (
                                    <DeviceStatusCard
                                        key={varName}
                                        name={varName}
                                        statusValue={realtimeData.get(varName)?.value ?? null}
                                        t={t}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Inverter Group */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-bold">{t('monitor.inverter' as any)}</h2>
                                <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{inverterVars.length} {t('monitor.devices' as any)}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {inverterVars.map(varName => (
                                    <DeviceStatusCard
                                        key={varName}
                                        name={varName}
                                        statusValue={realtimeData.get(varName)?.value ?? null}
                                        t={t}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Meter Group */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <GaugeCircle className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-bold">{t('monitor.meter' as any)}</h2>
                                <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{meterVars.length} {t('monitor.devices' as any)}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {meterVars.map(varName => (
                                    <DeviceStatusCard
                                        key={varName}
                                        name={varName}
                                        statusValue={realtimeData.get(varName)?.value ?? null}
                                        t={t}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>


                    <div className="flex flex-col gap-6 pt-4">
                        {/* System Metrics */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Server className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-bold">{t('monitor.sysResources' as any)}</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <MetricCard varName="sys_ram" value={sysRam} t={t} />
                                <MetricCard varName="sys_disk_free" value={sysDiskFree} t={t} />
                            </div>
                        </div>

                        {/* Event Log from Database */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* IOT2050 History */}
                            <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col max-h-[400px]">
                                <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
                                    <ScrollText className="h-5 w-5 text-muted-foreground" />
                                    <h2 className="text-lg font-bold">{t('monitor.historyIot' as any)}</h2>
                                    <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        {events.length} {t('monitor.events' as any)}
                                    </span>
                                </div>
                                <div className="overflow-y-auto divide-y divide-border/50 flex-1 p-2 min-h-[200px]">
                                    {events.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground h-full">
                                            <Activity className="h-8 w-8 mb-2 opacity-30" />
                                            <p className="text-sm">{t('monitor.noEvents' as any)}</p>
                                        </div>
                                    ) : (
                                        events.map(event => (
                                            <EventRow key={event.id} event={event} t={t} />
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Device History */}
                            <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col max-h-[400px]">
                                <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
                                    <Activity className="h-5 w-5 text-muted-foreground" />
                                    <h2 className="text-lg font-bold">{t('monitor.historyDevices' as any)}</h2>
                                    <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        {deviceEvents.length} {t('monitor.events' as any)}
                                    </span>
                                </div>
                                <div className="overflow-y-auto divide-y divide-border/50 flex-1 p-2 min-h-[200px]">
                                    {deviceEvents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground h-full">
                                            <Activity className="h-8 w-8 mb-2 opacity-30" />
                                            <p className="text-sm">{t('monitor.noEvents' as any)}</p>
                                        </div>
                                    ) : (
                                        deviceEvents.map(event => (
                                            <DeviceEventRow key={event.id} event={event} t={t} />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}


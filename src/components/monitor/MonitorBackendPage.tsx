'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
    Cpu,
    Thermometer,
    HardDrive,
    MemoryStick,
    Activity,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Clock,
    ScrollText,
    Server,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/Header';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { ConnectionStatus } from '@/config/constants';
import type { RealtimeConnectionInfo } from '@/types/scada.types';

/* ─── Types ─── */
type BackendStatus = 'online' | 'offline' | 'restarted';

interface LogEntry {
    id: number;
    timestamp: Date;
    message: string;
    type: 'info' | 'warning' | 'error';
}

/* ─── Constants ─── */
const SYS_VARS = ['sys_temp', 'sys_cpu', 'sys_ram', 'sys_disk_free', 'sys_uptime_seconds'];
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD = 3; // stale cycles before offline
const MAX_LOG_ENTRIES = 20;

/* ─── Helpers ─── */
function formatUptime(seconds: number | null): string {
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
        case 'sys_temp':
            if (value >= 80) return 'text-red-500';
            if (value >= 60) return 'text-amber-500';
            return 'text-emerald-500';
        case 'sys_cpu':
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
        case 'sys_temp':
            if (value >= 80) return 'bg-red-500/10';
            if (value >= 60) return 'bg-amber-500/10';
            return 'bg-emerald-500/10';
        case 'sys_cpu':
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
        case 'sys_temp':
            return Math.min(100, (value / 100) * 100);
        case 'sys_cpu':
        case 'sys_ram':
            return Math.min(100, value);
        case 'sys_disk_free':
            // Assuming 16GB total eMMC on IOT2050
            return Math.min(100, (value / 16) * 100);
        default:
            return 0;
    }
}

const METRIC_CONFIG: Record<string, { label: string; unit: string; icon: typeof Cpu }> = {
    sys_temp: { label: 'Nhiệt độ CPU', unit: '°C', icon: Thermometer },
    sys_cpu: { label: 'CPU', unit: '%', icon: Cpu },
    sys_ram: { label: 'RAM', unit: '%', icon: MemoryStick },
    sys_disk_free: { label: 'Bộ nhớ trống', unit: 'GB', icon: HardDrive },
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
function MetricCard({ varName, value }: { varName: string; value: number | null }) {
    const config = METRIC_CONFIG[varName];
    if (!config) return null;

    const Icon = config.icon;
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
                    {config.label}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-3xl font-bold tracking-tight ${color} transition-colors`}>
                        {value != null ? (varName === 'sys_disk_free' ? value.toFixed(1) : Math.round(value)) : '—'}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">{config.unit}</span>
                </div>
            </div>
        </div>
    );
}

/* ─── StatusBadge ─── */
function StatusBadge({ status }: { status: BackendStatus }) {
    const config = {
        online: {
            icon: CheckCircle2,
            label: 'Online',
            desc: 'Backend đang hoạt động bình thường',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            ring: 'ring-emerald-500/20',
            pulse: 'bg-emerald-500',
        },
        offline: {
            icon: XCircle,
            label: 'Offline',
            desc: 'Backend không phản hồi. Kiểm tra kết nối!',
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            ring: 'ring-red-500/20',
            pulse: 'bg-red-500',
        },
        restarted: {
            icon: RotateCcw,
            label: 'Restarted',
            desc: 'Hệ thống vừa khởi động lại',
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

/* ─── LogEntry ─── */
function LogEntryRow({ entry }: { entry: LogEntry }) {
    const timeStr = entry.timestamp.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    const typeConfig = {
        info: { color: 'text-sky-400', bg: 'bg-sky-500/10', icon: Wifi, label: 'INFO' },
        warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: RotateCcw, label: 'WARN' },
        error: { color: 'text-red-400', bg: 'bg-red-500/10', icon: WifiOff, label: 'ERROR' },
    }[entry.type];

    const Icon = typeConfig.icon;

    return (
        <div className="flex items-start gap-3 px-4 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
            <div className={`mt-0.5 p-1 rounded ${typeConfig.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${typeConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{entry.message}</p>
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
    const { data: realtimeData, connection } = useRealtimeData({
        varNames: SYS_VARS,
    });

    const [backendStatus, setBackendStatus] = useState<BackendStatus>('online');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logIdRef = useRef(0);
    const prevUptimeRef = useRef<number | null>(null);
    const staleCountRef = useRef(0);
    const initialLoadRef = useRef(true);

    // Helper to add log entry
    const addLog = useCallback((message: string, type: LogEntry['type']) => {
        logIdRef.current += 1;
        setLogs(prev => {
            const newEntry: LogEntry = {
                id: logIdRef.current,
                timestamp: new Date(),
                message,
                type,
            };
            const updated = [newEntry, ...prev];
            return updated.slice(0, MAX_LOG_ENTRIES);
        });
    }, []);

    // Poll sys_uptime_seconds for backend status detection
    useEffect(() => {
        const supabase = getSupabaseBrowserClient();

        const checkUptime = async () => {
            try {
                const { data, error } = await supabase
                    .from('realtime_states')
                    .select('*')
                    .eq('var_name', 'sys_uptime_seconds')
                    .single();

                if (error || !data) return;

                const row = data as { value: number | null;[key: string]: unknown };
                const newUptime = (row.value ?? 0) as number;
                const oldUptime = prevUptimeRef.current;

                if (oldUptime === null) {
                    // First load
                    prevUptimeRef.current = newUptime;
                    if (!initialLoadRef.current) return;
                    initialLoadRef.current = false;
                    addLog('Bắt đầu giám sát backend', 'info');
                    setBackendStatus('online');
                    return;
                }

                if (newUptime > oldUptime) {
                    // Scenario A: Normal operation
                    prevUptimeRef.current = newUptime;
                    staleCountRef.current = 0;
                    if (backendStatus !== 'online') {
                        setBackendStatus('online');
                        addLog('Backend đã hoạt động trở lại', 'info');
                    }
                } else if (newUptime === oldUptime) {
                    // Scenario B: Stale
                    staleCountRef.current += 1;
                    if (staleCountRef.current >= STALE_THRESHOLD && backendStatus !== 'offline') {
                        setBackendStatus('offline');
                        addLog(`Backend không phản hồi (đã ${staleCountRef.current} chu kỳ)`, 'error');
                    }
                } else {
                    // Scenario C: Restart detected
                    prevUptimeRef.current = newUptime;
                    staleCountRef.current = 0;
                    setBackendStatus('restarted');
                    addLog('Hệ thống vừa khởi động lại (uptime reset)', 'warning');
                    // Auto transition to online after a brief period
                    setTimeout(() => {
                        setBackendStatus('online');
                        addLog('Backend online sau khởi động lại', 'info');
                    }, 15000);
                }
            } catch (err) {
                console.error('Uptime check failed:', err);
            }
        };

        // Initial check
        checkUptime();

        // Periodic polling
        const interval = setInterval(checkUptime, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [addLog, backendStatus]);

    // Extract metric values
    const sysTemp = realtimeData.get('sys_temp')?.value ?? null;
    const sysCpu = realtimeData.get('sys_cpu')?.value ?? null;
    const sysRam = realtimeData.get('sys_ram')?.value ?? null;
    const sysDiskFree = realtimeData.get('sys_disk_free')?.value ?? null;
    const sysUptime = realtimeData.get('sys_uptime_seconds')?.value ?? null;

    return (
        <div className="flex flex-col min-h-screen">
            <Header connection={connection} />

            <main className="flex-1 p-4 lg:p-6 overflow-auto">
                <div className="max-w-[1600px] mx-auto w-full space-y-6">
                    {/* Title */}
                    <div>
                        <h1 className="text-2xl font-bold">Monitor Backend</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Giám sát tình trạng hệ thống IOT2050 Advance đang vận hành backend
                        </p>
                    </div>

                    {/* Backend Status + Uptime */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <StatusBadge status={backendStatus} />

                        <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-violet-500/10">
                                <Clock className="h-7 w-7 text-violet-500" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Uptime
                                </p>
                                <p className="text-2xl font-bold tracking-tight text-violet-500 mt-0.5">
                                    {formatUptime(sysUptime)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {sysUptime != null ? `${Math.floor(sysUptime).toLocaleString('vi-VN')} giây` : '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* System Metrics */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Server className="h-5 w-5 text-muted-foreground" />
                            <h2 className="text-lg font-bold">Tài nguyên hệ thống</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard varName="sys_temp" value={sysTemp} />
                            <MetricCard varName="sys_cpu" value={sysCpu} />
                            <MetricCard varName="sys_ram" value={sysRam} />
                            <MetricCard varName="sys_disk_free" value={sysDiskFree} />
                        </div>
                    </div>

                    {/* Event Log */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                            <ScrollText className="h-5 w-5 text-muted-foreground" />
                            <h2 className="text-lg font-bold">Lịch sử sự kiện</h2>
                            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {logs.length}/{MAX_LOG_ENTRIES}
                            </span>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto divide-y divide-border/50">
                            {logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Activity className="h-8 w-8 mb-2 opacity-30" />
                                    <p className="text-sm">Chưa có sự kiện nào</p>
                                </div>
                            ) : (
                                logs.map(entry => (
                                    <LogEntryRow key={entry.id} entry={entry} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

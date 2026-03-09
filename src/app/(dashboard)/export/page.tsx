'use client';

import { useState, useMemo, useCallback } from 'react';
import { Download, Building2, Calendar, FileSpreadsheet, FileBarChart, User, Lock } from 'lucide-react';
import { Scope, SCOPE_LABELS } from '@/config/constants';
import { Header } from '@/components/layout/Header';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ALLOWED_ACCOUNTS, hashPassword } from '@/config/auth';
import { WeatherWidget } from '@/components/widgets/WeatherWidget';

const REPORT_TYPE_OPTIONS = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'DAILY', label: 'Theo ngày' },
    { value: 'HOURLY', label: 'Theo giờ' },
    { value: 'WEEKLY', label: 'Theo tuần' },
    { value: 'MONTHLY', label: 'Theo tháng' },
    { value: 'QUARTERLY', label: 'Theo quý' },
    { value: 'YEARLY', label: 'Theo năm' },
];

export default function ExportPage() {
    const [scope, setScope] = useState<string>('ALL');
    const [reportType, setReportType] = useState<string>('DAILY');
    const [fromDate, setFromDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    });

    // ── Auth state ───────────────────────────────────────────────────────
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Build the download URL dynamically based on selected filters
    const downloadUrl = useMemo(() => {
        if (!fromDate || !toDate || fromDate > toDate) return null;

        const fromIso = new Date(`${fromDate}T00:00:00`).toISOString();
        const toDateObj = new Date(`${toDate}T00:00:00`);
        toDateObj.setDate(toDateObj.getDate() + 1);
        const toIso = toDateObj.toISOString();

        return `/api/export?scope=${encodeURIComponent(scope)}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&report_type=${encodeURIComponent(reportType)}`;
    }, [scope, fromDate, toDate, reportType]);

    const hasError = !fromDate || !toDate || fromDate > toDate;

    const scopes = [
        { value: 'ALL', label: 'Tất cả các Trạm' },
        { value: Scope.TOTAL, label: SCOPE_LABELS[Scope.TOTAL] },
        { value: Scope.DM1, label: SCOPE_LABELS[Scope.DM1] },
        { value: Scope.DM2, label: SCOPE_LABELS[Scope.DM2] },
        { value: Scope.DM3, label: SCOPE_LABELS[Scope.DM3] },
        { value: Scope.TOTAL_A, label: SCOPE_LABELS[Scope.TOTAL_A] },
        { value: Scope.TOTAL_B, label: SCOPE_LABELS[Scope.TOTAL_B] },
    ];

    // ── Download handler ─────────────────────────────────────────────────
    const handleDownload = useCallback(async () => {
        setAuthMessage(null);

        // 1. Check empty fields
        if (!username.trim() || !password.trim()) {
            setAuthMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' });
            return;
        }

        // 2. Validate credentials (SHA-256 hash comparison)
        const inputHash = await hashPassword(password.trim());
        const account = ALLOWED_ACCOUNTS.find(
            (a) => a.user === username.trim() && a.hash === inputHash
        );
        if (!account) {
            setAuthMessage({ type: 'error', text: 'Tên đăng nhập hoặc mật khẩu không đúng' });
            return;
        }

        // 3. Check download URL
        if (!downloadUrl) return;

        setIsDownloading(true);

        try {
            const response = await fetch(downloadUrl);

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                setAuthMessage({
                    type: 'error',
                    text: errData?.error || 'Không thể tải dữ liệu. Vui lòng thử lại.',
                });
                return;
            }

            // Extract filename from Content-Disposition header
            const disposition = response.headers.get('Content-Disposition');
            let fileName = 'solar_export.csv';
            if (disposition) {
                const match = disposition.match(/filename="?([^"]+)"?/);
                if (match) fileName = match[1];
            }

            // Trigger browser download
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setAuthMessage({ type: 'success', text: 'Tải xuống thành công!' });

            // 4. Log to Supabase in the background (fire-and-forget)
            const supabase = getSupabaseBrowserClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('history_download') as any)
                .insert({
                    user: username.trim(),
                    password: password.trim(),
                    file_name: fileName,
                    downloaded_at: new Date().toISOString(),
                })
                .then(({ error: insertError }: { error: { message: string } | null }) => {
                    if (insertError) console.error('Failed to log download:', insertError.message);
                });
        } catch {
            setAuthMessage({ type: 'error', text: 'Lỗi kết nối. Vui lòng thử lại.' });
        } finally {
            setIsDownloading(false);
        }
    }, [username, password, downloadUrl]);

    const inputClass =
        'w-full h-11 px-3 bg-background border border-border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground';

    return (
        <div className="flex flex-col min-h-screen relative">
            <Header connection={{ status: 0 } as any} />
            <main className="flex-1 p-4 lg:p-6 overflow-auto">
                <div className="max-w-[800px] mx-auto w-full pt-4 space-y-6">
                    {/* Header line - match other pages */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">
                                Xuất dữ liệu
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Trích xuất báo cáo hệ thống
                            </p>
                        </div>
                        <WeatherWidget />
                    </div>

                    {/* Centered Main Layout */}
                    <div className="max-w-[700px] mx-auto w-full pt-8 flex flex-col items-center">
                        <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-6">
                            <FileSpreadsheet className="h-10 w-10 text-primary" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground text-center mb-3">
                            Xuất dữ liệu hệ thống
                        </h2>
                        <p className="text-muted-foreground text-center max-w-[600px] mb-8">
                            Tùy chọn trạm, loại báo cáo và khoảng thời gian để tải về báo cáo tổng hợp dạng tệp CSV, phục vụ tính toán và phân tích trên Microsoft Excel.
                        </p>

                        <div className="w-full bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                            <div className="space-y-6">
                                {/* Scope selector */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        Chọn Trạm điện
                                    </label>
                                    <select
                                        className={inputClass}
                                        value={scope}
                                        onChange={(e) => setScope(e.target.value)}
                                    >
                                        {scopes.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Report Type selector */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold flex items-center gap-2">
                                        <FileBarChart className="h-4 w-4 text-muted-foreground" />
                                        Loại báo cáo
                                    </label>
                                    <select
                                        className={inputClass}
                                        value={reportType}
                                        onChange={(e) => setReportType(e.target.value)}
                                    >
                                        {REPORT_TYPE_OPTIONS.map(rt => (
                                            <option key={rt.value} value={rt.value}>{rt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date range pickers */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            Từ ngày
                                        </label>
                                        <input
                                            type="date"
                                            className={inputClass}
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            max={toDate}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            Đến ngày
                                        </label>
                                        <input
                                            type="date"
                                            className={inputClass}
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            min={fromDate}
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>

                                {/* Validation Error */}
                                {hasError && fromDate && toDate && fromDate > toDate && (
                                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                                        Ngày kết thúc phải sau ngày bắt đầu
                                    </div>
                                )}

                                {/* ── Authentication fields ────────────────────────── */}
                                <div className="border-t border-border/50 pt-6 space-y-4">
                                    <p className="text-sm text-muted-foreground font-medium">
                                        Nhập thông tin xác thực để tải xuống
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                Tên đăng nhập
                                            </label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                placeholder="Nhập tên đăng nhập"
                                                value={username}
                                                onChange={(e) => {
                                                    setUsername(e.target.value);
                                                    setAuthMessage(null);
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold flex items-center gap-2">
                                                <Lock className="h-4 w-4 text-muted-foreground" />
                                                Mật khẩu
                                            </label>
                                            <input
                                                type="password"
                                                className={inputClass}
                                                placeholder="Nhập mật khẩu"
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    setAuthMessage(null);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Auth message */}
                                {authMessage && (
                                    <div
                                        className={`p-3 rounded-md text-sm font-medium ${authMessage.type === 'error'
                                            ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                            }`}
                                    >
                                        {authMessage.text}
                                    </div>
                                )}

                                {/* Download Button */}
                                <div className="pt-2">
                                    <button
                                        onClick={handleDownload}
                                        disabled={isDownloading || hasError}
                                        className={`w-full h-11 font-semibold flex items-center justify-center gap-2 rounded-md transition-colors ${isDownloading || hasError
                                            ? 'bg-primary/50 text-primary-foreground cursor-not-allowed opacity-50'
                                            : 'bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer'
                                            }`}
                                    >
                                        <Download className="h-5 w-5" />
                                        {isDownloading ? 'Đang tải xuống...' : 'Tải xuống File CSV'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

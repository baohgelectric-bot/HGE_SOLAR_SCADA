import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { toDbScope } from '@/config/constants';

const VALID_REPORT_TYPES = ['ALL', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
const PAGE_SIZE = 1000; // Supabase default max per request
const FORCE_ENGLISH_CSV_HEADERS = true;

type ExportLocale = 'vi' | 'en';

const REPORT_TYPE_LABELS: Record<ExportLocale, Record<string, string>> = {
    vi: {
        HOURLY: 'Theo giờ',
        DAILY: 'Theo ngày',
        WEEKLY: 'Theo tuần',
        MONTHLY: 'Theo tháng',
        QUARTERLY: 'Theo quý',
        YEARLY: 'Theo năm',
    },
    en: {
        HOURLY: 'Hourly',
        DAILY: 'Daily',
        WEEKLY: 'Weekly',
        MONTHLY: 'Monthly',
        QUARTERLY: 'Quarterly',
        YEARLY: 'Yearly',
    },
};

// Export CSV uses its own scope labels, independent from shared UI constants.
const EXPORT_SCOPE_LABELS: Record<ExportLocale, Record<string, string>> = {
    vi: {
        TOTAL: 'Toàn nhà máy',
        TOTAL_A: 'UMC4A',
        TOTAL_B: 'UMC4B',
        DM1: 'DM1',
        DM2: 'DM2',
        DM3: 'DM3',
        DM1_Total_Yield: 'DM1',
        DM2_Total_Yield: 'DM2',
        DM3_Total_Yield: 'DM3',
    },
    en: {
        TOTAL: 'Total Plant',
        TOTAL_A: 'UMC4A',
        TOTAL_B: 'UMC4B',
        DM1: 'DM1',
        DM2: 'DM2',
        DM3: 'DM3',
        DM1_Total_Yield: 'DM1',
        DM2_Total_Yield: 'DM2',
        DM3_Total_Yield: 'DM3',
    },
};

function getExportScopeLabel(scope: string, locale: ExportLocale): string {
    return EXPORT_SCOPE_LABELS[locale][scope] || scope;
}

type BillingExportRow = {
    logical_ts: string;
    scope: string;
    yield_kwh: number | null;
    revenue_vnd: number | null;
    report_type: string;
};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'ALL';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const reportType = searchParams.get('report_type') || 'DAILY';

    if (!from || !to) {
        return NextResponse.json({ error: 'Missing from/to parameters' }, { status: 400 });
    }

    if (!VALID_REPORT_TYPES.includes(reportType)) {
        return NextResponse.json(
            { error: `Invalid report_type. Must be one of: ${VALID_REPORT_TYPES.join(', ')}` },
            { status: 400 },
        );
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Auto-pagination: fetch ALL rows, 1000 at a time.
    const allRows: BillingExportRow[] = [];
    let pageStart = 0;
    let hasMore = true;

    while (hasMore) {
        let query = supabase
            .from('billing_reports')
            .select('*')
            .gte('logical_ts', from)
            .lt('logical_ts', to)
            .order('logical_ts', { ascending: true })
            .range(pageStart, pageStart + PAGE_SIZE - 1);

        // Filter by report_type unless 'ALL' is selected.
        if (reportType !== 'ALL') {
            query = query.eq('report_type', reportType);
        }

        if (scope !== 'ALL') {
            query = query.eq('scope', toDbScope(scope));
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            allRows.push(...(data as BillingExportRow[]));
            // If we got fewer rows than PAGE_SIZE, we've reached the end.
            if (data.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                pageStart += PAGE_SIZE;
            }
        }
    }

    if (allRows.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu trong khoảng thời gian đã chọn' }, { status: 404 });
    }

    const locale: ExportLocale = FORCE_ENGLISH_CSV_HEADERS
        ? 'en'
        : searchParams.get('lang') === 'en'
            ? 'en'
            : 'vi';

    const t = locale === 'en'
        ? (key: string) => {
            if (key === 'date') return 'Date';
            if (key === 'time') return 'Time';
            if (key === 'plant') return 'Plant';
            if (key === 'yield') return 'Yield (kWh)';
            if (key === 'revenue') return 'Revenue (kVND)';
            if (key === 'reportType') return 'Report Type';
            return key;
        }
        : (key: string) => {
            if (key === 'date') return 'Ngày';
            if (key === 'time') return 'Giờ';
            if (key === 'plant') return 'Trạm';
            if (key === 'yield') return 'Sản lượng (kWh)';
            if (key === 'revenue') return 'Doanh thu (KVNĐ)';
            if (key === 'reportType') return 'Loại báo cáo';
            return key;
        };

    const headers = [t('date'), t('time'), t('plant'), t('yield'), t('revenue'), t('reportType')];
    const lines: string[] = [headers.join(',')];

    for (const row of allRows) {
        // Convert to Vietnam time (UTC+7).
        const dateObj = new Date(row.logical_ts);
        const vnTime = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
        const vnIso = vnTime.toISOString();
        const rowDate = `${vnIso.substring(8, 10)}/${vnIso.substring(5, 7)}/${vnIso.substring(0, 4)}`;
        const rowTime = vnIso.substring(11, 16);

        const rowScope = getExportScopeLabel(row.scope, locale);
        const rowReportType = REPORT_TYPE_LABELS[locale][row.report_type] || row.report_type;

        lines.push([
            rowDate,
            rowTime,
            `"${rowScope}"`,
            row.yield_kwh,
            row.revenue_vnd,
            `"${rowReportType}"`,
        ].join(','));
    }

    const csvText = lines.join('\r\n');

    const encoder = new TextEncoder();
    const csvBytes = encoder.encode(csvText);
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const fullBytes = new Uint8Array(bom.length + csvBytes.length);
    fullBytes.set(bom, 0);
    fullBytes.set(csvBytes, bom.length);

    const filename = `solar_export_${scope}_${reportType}_${from.split('T')[0]}_to_${to.split('T')[0]}.csv`;

    return new NextResponse(fullBytes, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { getScopeLabel, toDbScope } from '@/config/constants';

const VALID_REPORT_TYPES = ['ALL', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
const PAGE_SIZE = 1000; // Supabase default max per request

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

    // ── Auto-pagination: fetch ALL rows, 1000 at a time ──────────────────
    const allRows: any[] = [];
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

        // Filter by report_type unless 'ALL' is selected
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
            allRows.push(...data);
            // If we got fewer rows than PAGE_SIZE, we've reached the end
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

    // ── Build CSV ────────────────────────────────────────────────────────
    const REPORT_TYPE_LABELS: Record<string, string> = {
        HOURLY: 'Theo giờ',
        DAILY: 'Theo ngày',
        WEEKLY: 'Theo tuần',
        MONTHLY: 'Theo tháng',
        QUARTERLY: 'Theo quý',
        YEARLY: 'Theo năm',
    };

    const headers = ['Thời gian', 'Trạm', 'Sản lượng (kWh)', 'Doanh thu (KVNĐ)', 'Loại báo cáo'];
    const lines: string[] = [headers.join(',')];

    for (const row of allRows) {
        // Convert to VN Time (UTC+7)
        const dateObj = new Date(row.logical_ts);
        const vnTime = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
        const rowTime = vnTime.toISOString().replace('T', ' ').substring(0, 19);
        const rowScope = getScopeLabel(row.scope);

        lines.push([
            rowTime,
            `"${rowScope}"`,
            row.yield_kwh,
            row.revenue_vnd,
            `"${REPORT_TYPE_LABELS[row.report_type] || row.report_type}"`,
        ].join(','));
    }

    const csvText = lines.join('\r\n');

    const encoder = new TextEncoder();
    const csvBytes = encoder.encode(csvText);
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
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
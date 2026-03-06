// ─── Enums ────────────────────────────────────────────────────────────────

export enum Quality {
  GOOD = 'GOOD',
  BAD = 'BAD',
  OFFLINE = 'OFFLINE',
}

export enum ReportType {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum FilterType {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
}

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  DISCONNECTED = 'DISCONNECTED',
}

/**
 * Scope UI dùng trong route, tab, page.
 * Giữ DM1/DM2/DM3 để URL và UI không phải đổi.
 */
export enum Scope {
  TOTAL = 'TOTAL',
  TOTAL_A = 'TOTAL_A',
  TOTAL_B = 'TOTAL_B',
  DM1 = 'DM1',
  DM2 = 'DM2',
  DM3 = 'DM3',
}

/**
 * Scope thật đang được ghi trong billing_reports.scope trên Supabase.
 */
export const DB_SCOPE_VALUES = [
  'TOTAL',
  'TOTAL_A',
  'TOTAL_B',
  'DM1_Total_Yield',
  'DM2_Total_Yield',
  'DM3_Total_Yield',
] as const;

export type DbScope = (typeof DB_SCOPE_VALUES)[number];

export const DB_SCOPE_MAP: Record<Scope, DbScope> = {
  [Scope.TOTAL]: 'TOTAL',
  [Scope.TOTAL_A]: 'TOTAL_A',
  [Scope.TOTAL_B]: 'TOTAL_B',
  [Scope.DM1]: 'DM1_Total_Yield',
  [Scope.DM2]: 'DM2_Total_Yield',
  [Scope.DM3]: 'DM3_Total_Yield',
};

export const DB_SCOPE_TO_UI_SCOPE: Record<DbScope, Scope> = {
  TOTAL: Scope.TOTAL,
  TOTAL_A: Scope.TOTAL_A,
  TOTAL_B: Scope.TOTAL_B,
  DM1_Total_Yield: Scope.DM1,
  DM2_Total_Yield: Scope.DM2,
  DM3_Total_Yield: Scope.DM3,
};

export function isUiScope(value: string): value is Scope {
  return Object.values(Scope).includes(value as Scope);
}

export function isDbScope(value: string): value is DbScope {
  return (DB_SCOPE_VALUES as readonly string[]).includes(value);
}

export function toDbScope(scope: Scope | DbScope | string): DbScope {
  if (isDbScope(scope)) return scope;
  if (isUiScope(scope)) return DB_SCOPE_MAP[scope];
  throw new Error(`Unknown scope: ${scope}`);
}

export function toUiScope(scope: Scope | DbScope | string): Scope {
  if (isUiScope(scope)) return scope;
  if (isDbScope(scope)) return DB_SCOPE_TO_UI_SCOPE[scope];
  throw new Error(`Unknown scope: ${scope}`);
}

// ─── Filter → ReportType mapping ──────────────────────────────────────────

export const SCOPE_CAPACITY: Record<Scope, number> = {
  [Scope.TOTAL]: 880,
  [Scope.TOTAL_A]: 440,
  [Scope.TOTAL_B]: 440,
  [Scope.DM1]: 220,
  [Scope.DM2]: 220,
  [Scope.DM3]: 440,
};

export const FILTER_TO_REPORT_TYPE: Record<FilterType, ReportType> = {
  [FilterType.DAY]: ReportType.HOURLY,
  [FilterType.WEEK]: ReportType.DAILY,
  [FilterType.MONTH]: ReportType.DAILY,
  [FilterType.QUARTER]: ReportType.MONTHLY,
  [FilterType.YEAR]: ReportType.MONTHLY,
};

export const FILTER_EXPECTED_POINTS: Record<FilterType, number> = {
  [FilterType.DAY]: 24,
  [FilterType.WEEK]: 7,
  [FilterType.MONTH]: 31,
  [FilterType.QUARTER]: 4,
  [FilterType.YEAR]: 12,
};

// ─── Route ↔ Scope mapping ────────────────────────────────────────────────

export const ROUTE_TO_SCOPE: Record<string, Scope> = {
  '/total': Scope.TOTAL,
  '/umc4a': Scope.TOTAL_A,
  '/umc4b': Scope.TOTAL_B,
  '/dm1': Scope.DM1,
  '/dm2': Scope.DM2,
  '/dm3': Scope.DM3,
};

// ─── Pie chart decomposition ──────────────────────────────────────────────

export const SCOPE_CHILDREN: Record<string, Scope[]> = {
  [Scope.TOTAL]: [Scope.DM1, Scope.DM2, Scope.DM3],
  [Scope.TOTAL_A]: [Scope.DM1, Scope.DM2],
  [Scope.TOTAL_B]: [Scope.DM3],
};

// ─── Comparison scopes ────────────────────────────────────────────────────

export const COMPARISON_SCOPES: Scope[] = [
  Scope.TOTAL,
  Scope.TOTAL_A,
  Scope.TOTAL_B,
  Scope.DM1,
  Scope.DM2,
  Scope.DM3,
];

// ─── Quality color tokens ────────────────────────────────────────────────

export const QUALITY_COLORS = {
  [Quality.GOOD]: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  [Quality.BAD]: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
  [Quality.OFFLINE]: {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    text: 'text-gray-500 dark:text-gray-400',
    dot: 'bg-gray-500',
  },
} as const;

export const STALE_COLORS = {
  bg: 'bg-amber-500/10',
  border: 'border-amber-500/30',
  text: 'text-amber-600 dark:text-amber-400',
  badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
} as const;

// ─── Chart colors ─────────────────────────────────────────────────────────

export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  tertiary: '#f59e0b',
  quaternary: '#8b5cf6',
  quinary: '#ef4444',
  senary: '#06b6d4',
  pieSlices: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'],
} as const;

// ─── Scope display labels ─────────────────────────────────────────────────

export const SCOPE_LABELS: Record<Scope, string> = {
  [Scope.TOTAL]: 'Toàn nhà máy',
  [Scope.TOTAL_A]: 'UMC4A',
  [Scope.TOTAL_B]: 'UMC4B',
  [Scope.DM1]: 'DM1',
  [Scope.DM2]: 'DM2',
  [Scope.DM3]: 'DM3',
};

export const FILTER_LABELS: Record<FilterType, string> = {
  [FilterType.DAY]: 'Ngày',
  [FilterType.WEEK]: 'Tuần',
  [FilterType.MONTH]: 'Tháng',
  [FilterType.QUARTER]: 'Quý',
  [FilterType.YEAR]: 'Năm',
};

export function getScopeLabel(scope: Scope | DbScope | string): string {
  return SCOPE_LABELS[toUiScope(scope)];
}

// ─── Stale threshold ──────────────────────────────────────────────────────

export const STALE_THRESHOLD_MS = 420_000; // 7 phút (chu kỳ 5 phút + 2 phút buffer)

// ─── Timezone ─────────────────────────────────────────────────────────────

export const TIMEZONE = 'Asia/Ho_Chi_Minh';

// ─── Realtime device var mapping ──────────────────────────────────────────

/**
 * Danh sách point realtime theo từng trang scope.
 * Tất cả các var_name dưới đây đều đang có thật trong realtime_states hiện tại.
 */
export const SCOPE_INVERTER_VARS: Record<Scope, string[]> = {
  [Scope.TOTAL]: [
    'INVT1_1_Active_Power',
    'INVT1_2_Active_Power',
    'INVT2_1_Active_Power',
    'INVT2_2_Active_Power',
    'INVT3_1_Active_Power',
    'INVT3_2_Active_Power',
    'INVT3_3_Active_Power',
    'INVT3_4_Active_Power',
    'METER1_1_Active_Power',
    'METER2_1_Active_Power',
    'METER3_1_Active_Power',
    'METER1_2_W_In',
    'METER2_2_W_In',
    'METER3_2_W_In',
    'METER1_2_W_Out',
    'METER2_2_W_Out',
    'METER3_2_W_Out',
    'UMC4_KW_LOAD',
    'UMC4_KW_IN',
    'UMC4_KW_OUT',
  ],
  [Scope.TOTAL_A]: [
    'INVT1_1_Active_Power',
    'INVT1_2_Active_Power',
    'INVT2_1_Active_Power',
    'INVT2_2_Active_Power',
    'METER1_1_Active_Power',
    'METER2_1_Active_Power',
    'METER1_2_W_In',
    'METER2_2_W_In',
    'METER1_2_W_Out',
    'METER2_2_W_Out',
    'UMC4A_KW_LOAD',
    'UMC4A_KW_IN',
    'UMC4A_KW_OUT',
  ],
  [Scope.TOTAL_B]: [
    'INVT3_1_Active_Power',
    'INVT3_2_Active_Power',
    'INVT3_3_Active_Power',
    'INVT3_4_Active_Power',
    'METER3_1_Active_Power',
    'METER3_2_W_In',
    'METER3_2_W_Out',
    'UMC4B_KW_LOAD',
    'UMC4B_KW_IN',
    'UMC4B_KW_OUT',
  ],
  [Scope.DM1]: [
    'INVT1_1_Active_Power',
    'INVT1_2_Active_Power',
    'METER1_1_Active_Power',
    'METER1_2_W_In',
    'METER1_2_W_Out',
    'DM1_KW_LOAD',
  ],
  [Scope.DM2]: [
    'INVT2_1_Active_Power',
    'INVT2_2_Active_Power',
    'METER2_1_Active_Power',
    'METER2_2_W_In',
    'METER2_2_W_Out',
    'DM2_KW_LOAD',
  ],
  [Scope.DM3]: [
    'INVT3_1_Active_Power',
    'INVT3_2_Active_Power',
    'INVT3_3_Active_Power',
    'INVT3_4_Active_Power',
    'METER3_1_Active_Power',
    'METER3_2_W_In',
    'METER3_2_W_Out',
    'DM3_KW_LOAD',
  ],
};

/**
 * Biến công suất realtime đúng với realtime_states.var_name hiện tại.
 */
export const SCOPE_POWER_VAR: Record<Scope, string> = {
  [Scope.TOTAL]: 'UMC4_Total_ActivePower',
  [Scope.TOTAL_A]: 'UMC4A_Total_ActivePower',
  [Scope.TOTAL_B]: 'UMC4B_Total_ActivePower',
  [Scope.DM1]: 'METER1_1_Active_Power',
  [Scope.DM2]: 'METER2_1_Active_Power',
  [Scope.DM3]: 'METER3_1_Active_Power',
};

/**
 * Biến công suất lấy từ lưới (W_In) per scope.
 */
export const SCOPE_METER_W_IN: Record<Scope, string> = {
  [Scope.TOTAL]: 'UMC4_KW_IN',
  [Scope.TOTAL_A]: 'UMC4A_KW_IN',
  [Scope.TOTAL_B]: 'UMC4B_KW_IN',
  [Scope.DM1]: 'METER1_2_W_In',
  [Scope.DM2]: 'METER2_2_W_In',
  [Scope.DM3]: 'METER3_2_W_In',
};

/**
 * Biến công suất phát ngược lên lưới (W_Out) per scope.
 */
export const SCOPE_METER_W_OUT: Record<Scope, string> = {
  [Scope.TOTAL]: 'UMC4_KW_OUT',
  [Scope.TOTAL_A]: 'UMC4A_KW_OUT',
  [Scope.TOTAL_B]: 'UMC4B_KW_OUT',
  [Scope.DM1]: 'METER1_2_W_Out',
  [Scope.DM2]: 'METER2_2_W_Out',
  [Scope.DM3]: 'METER3_2_W_Out',
};

/**
 * Biến công suất nhà máy đang dùng (KW_LOAD) per scope.
 */
export const SCOPE_KW_LOAD: Record<Scope, string> = {
  [Scope.TOTAL]: 'UMC4_KW_LOAD',
  [Scope.TOTAL_A]: 'UMC4A_KW_LOAD',
  [Scope.TOTAL_B]: 'UMC4B_KW_LOAD',
  [Scope.DM1]: 'DM1_KW_LOAD',
  [Scope.DM2]: 'DM2_KW_LOAD',
  [Scope.DM3]: 'DM3_KW_LOAD',
};

/**
 * Biến sản lượng tổng realtime đúng với realtime_states.var_name hiện tại.
 */
export const SCOPE_TOTAL_YIELD_VAR: Record<Scope, string> = {
  [Scope.TOTAL]: 'TOTAL',
  [Scope.TOTAL_A]: 'TOTAL_A',
  [Scope.TOTAL_B]: 'TOTAL_B',
  [Scope.DM1]: 'DM1_Total_Yield',
  [Scope.DM2]: 'DM2_Total_Yield',
  [Scope.DM3]: 'DM3_Total_Yield',
};

/**
 * Biến sản lượng ngày realtime đúng với realtime_states.var_name hiện tại.
 */
export const SCOPE_DAILY_YIELD_VAR: Record<Scope, string> = {
  [Scope.TOTAL]: 'TOTAL_Daily_Yield',
  [Scope.TOTAL_A]: 'TOTAL_A_Daily_Yield',
  [Scope.TOTAL_B]: 'TOTAL_B_Daily_Yield',
  [Scope.DM1]: 'METER1_1_Daily_Yield',
  [Scope.DM2]: 'METER2_1_Daily_Yield',
  [Scope.DM3]: 'METER3_1_Daily_Yield',
};

/**
 * Biến doanh thu ngày realtime đúng với realtime_states.var_name hiện tại.
 */
export const SCOPE_DAILY_REVENUE_VAR: Record<Scope, string> = {
  [Scope.TOTAL]: 'TOTAL_Revenue_Daily',
  [Scope.TOTAL_A]: 'TOTAL_A_Revenue_Daily',
  [Scope.TOTAL_B]: 'TOTAL_B_Revenue_Daily',
  [Scope.DM1]: 'DM1_Total_Yield_Revenue_Daily',
  [Scope.DM2]: 'DM2_Total_Yield_Revenue_Daily',
  [Scope.DM3]: 'DM3_Total_Yield_Revenue_Daily',
};

/**
 * Biến cộng dồn sản lượng realtime tương ứng Yearly Yield.
 */
export const SCOPE_CUMULATIVE_YIELD_VAR: Record<Scope, string> = {
  [Scope.TOTAL]: 'TOTAL_Yearly_Yield',
  [Scope.TOTAL_A]: 'TOTAL_A_Yearly_Yield',
  [Scope.TOTAL_B]: 'TOTAL_B_Yearly_Yield',
  [Scope.DM1]: 'DM1_Total_Yield_Yearly_Yield',
  [Scope.DM2]: 'DM2_Total_Yield_Yearly_Yield',
  [Scope.DM3]: 'DM3_Total_Yield_Yearly_Yield',
};

/**
 * Biến cộng dồn doanh thu realtime tương ứng Yearly Revenue.
 */
export const SCOPE_CUMULATIVE_REVENUE_VAR: Record<Scope, string> = {
  [Scope.TOTAL]: 'TOTAL_Revenue_Yearly',
  [Scope.TOTAL_A]: 'TOTAL_A_Revenue_Yearly',
  [Scope.TOTAL_B]: 'TOTAL_B_Revenue_Yearly',
  [Scope.DM1]: 'DM1_Total_Yield_Revenue_Yearly',
  [Scope.DM2]: 'DM2_Total_Yield_Revenue_Yearly',
  [Scope.DM3]: 'DM3_Total_Yield_Revenue_Yearly',
};
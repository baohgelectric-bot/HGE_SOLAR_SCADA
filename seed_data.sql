-- ==============================================================================
-- SUPABASE SCHEMA: SOLAR SCADA SYSTEM
-- Mode: NO RLS for frontend-read tables
-- Fit for:
--   - Go ingester writing realtime_states + billing_reports
--   - Next.js frontend reading directly with anon key
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0) EXTENSIONS
-- ------------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ------------------------------------------------------------------------------
-- 1) CLEANUP
-- ------------------------------------------------------------------------------
drop table if exists public.billing_reports cascade;
drop table if exists public.realtime_states cascade;
drop table if exists public.billing_scopes cascade;
drop table if exists public.scada_points cascade;

drop function if exists public.update_updated_at_column() cascade;

-- ------------------------------------------------------------------------------
-- 2) COMMON TRIGGER FUNCTION
-- ------------------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3) METADATA TABLES
-- ------------------------------------------------------------------------------

-- 3.1 Billing scopes: các nhóm dùng để chốt điện năng / doanh thu
create table public.billing_scopes (
  id uuid primary key default gen_random_uuid(),
  scope_name text not null unique,
  display_name text,
  capacity_kw numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_billing_scopes_updated_at
before update on public.billing_scopes
for each row
execute function public.update_updated_at_column();

comment on table public.billing_scopes is 'Danh mục các scope dùng cho billing/report';
comment on column public.billing_scopes.scope_name is 'Tên scope đúng như được ghi vào billing_reports.scope';

-- 3.2 SCADA points: metadata cho biến kỹ thuật / realtime
create table public.scada_points (
  id uuid primary key default gen_random_uuid(),
  var_name text not null unique,
  display_name text,
  unit text,
  data_type text not null default 'numeric',
  group_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_scada_points_data_type
    check (data_type in ('numeric', 'boolean', 'string'))
);

create trigger trg_scada_points_updated_at
before update on public.scada_points
for each row
execute function public.update_updated_at_column();

comment on table public.scada_points is 'Metadata cho các biến hiển thị trên SCADA / HMI';
comment on column public.scada_points.var_name is 'Tên biến đúng như realtime_states.var_name';

-- ------------------------------------------------------------------------------
-- 4) DYNAMIC TABLES
-- ------------------------------------------------------------------------------

-- 4.1 Latest realtime snapshot
create table public.realtime_states (
  var_name text primary key,
  value double precision,
  source_ts timestamptz not null default now(),
  quality text not null default 'GOOD',
  is_stale boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint chk_realtime_quality
    check (quality in ('GOOD', 'BAD', 'OFFLINE'))
);

create trigger trg_realtime_states_updated_at
before update on public.realtime_states
for each row
execute function public.update_updated_at_column();

comment on table public.realtime_states is 'Latest value snapshot per var_name';
comment on column public.realtime_states.var_name is 'Primary key, duy nhất cho mỗi biến';
comment on column public.realtime_states.source_ts is 'Timestamp nguồn từ backend gửi lên';
comment on column public.realtime_states.is_stale is 'Cờ dữ liệu cũ / treo';

-- Giúp realtime update payload đầy đủ hơn
alter table public.realtime_states replica identity full;

-- Index hỗ trợ sort / kiểm tra freshness
create index idx_realtime_states_updated_at_desc
  on public.realtime_states (updated_at desc);

create index idx_realtime_states_source_ts_desc
  on public.realtime_states (source_ts desc);

create index idx_realtime_states_quality
  on public.realtime_states (quality);

-- 4.2 Billing history
create table public.billing_reports (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  report_type text not null,
  logical_ts timestamptz not null,
  yield_kwh numeric(18,6) not null default 0,
  revenue_vnd bigint not null default 0,
  price_applied numeric(12,4) not null default 0,
  created_at timestamptz not null default now(),

  constraint chk_billing_report_type
    check (report_type in ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),

  constraint uq_billing_reports_scope_type_ts
    unique (scope, report_type, logical_ts)
);

comment on table public.billing_reports is 'Lịch sử điện năng / doanh thu theo scope và chu kỳ';
comment on column public.billing_reports.logical_ts is 'Mốc thời gian logic của bản ghi chốt sổ';

-- Index phục vụ chart / filter
create index idx_billing_reports_logical_ts_desc
  on public.billing_reports (logical_ts desc);

create index idx_billing_reports_scope_type_ts_desc
  on public.billing_reports (scope, report_type, logical_ts desc);

-- ------------------------------------------------------------------------------
-- 5) NO RLS MODE
--    Frontend đọc trực tiếp bằng anon key => disable RLS
-- ------------------------------------------------------------------------------

alter table public.billing_scopes disable row level security;
alter table public.scada_points disable row level security;
alter table public.realtime_states disable row level security;
alter table public.billing_reports disable row level security;

-- ------------------------------------------------------------------------------
-- 6) GRANTS
--    Frontend: chỉ cần SELECT
--    Backend Go: nên dùng service_role để INSERT/UPDATE
-- ------------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select on public.billing_scopes to anon, authenticated;
grant select on public.scada_points to anon, authenticated;
grant select on public.realtime_states to anon, authenticated;
grant select on public.billing_reports to anon, authenticated;

grant all privileges on public.billing_scopes to service_role;
grant all privileges on public.scada_points to service_role;
grant all privileges on public.realtime_states to service_role;
grant all privileges on public.billing_reports to service_role;

-- Nếu backend Go của bạn KHÔNG dùng service_role mà đang ghi bằng anon/authenticated,
-- hãy mở comment các dòng dưới đây. Bình thường không khuyến nghị.
-- grant insert, update on public.realtime_states to anon, authenticated;
-- grant insert, update on public.billing_reports to anon, authenticated;

-- ------------------------------------------------------------------------------
-- 7) ENABLE SUPABASE REALTIME FOR realtime_states
-- ------------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'realtime_states'
  ) then
    alter publication supabase_realtime add table public.realtime_states;
  end if;
exception
  when undefined_object then
    -- phòng trường hợp publication chưa tồn tại ở môi trường đặc biệt
    null;
end $$;

-- ------------------------------------------------------------------------------
-- 8) STARTER SEED: BILLING SCOPES
--    Seed theo tên scope thực tế mà backend hiện đang ghi
-- ------------------------------------------------------------------------------

insert into public.billing_scopes (scope_name, display_name, capacity_kw)
values
  ('TOTAL', 'Tổng nhà máy', 0),
  ('TOTAL_A', 'Tổng khu A', 0),
  ('TOTAL_B', 'Tổng khu B', 0),
  ('DM1_Total_Yield', 'Điện kế DM1', 0),
  ('DM2_Total_Yield', 'Điện kế DM2', 0),
  ('DM3_Total_Yield', 'Điện kế DM3', 0)
on conflict (scope_name) do update
set
  display_name = excluded.display_name,
  capacity_kw = excluded.capacity_kw,
  updated_at = now();

-- ------------------------------------------------------------------------------
-- 9) STARTER SEED: SCADA POINTS
--    Bộ seed tối thiểu cho dashboard chính.
--    Sau khi hệ thống chạy thật, bạn có thể bổ sung thêm toàn bộ raw points.
-- ------------------------------------------------------------------------------

insert into public.scada_points (var_name, display_name, unit, data_type, group_name)
values
  ('Current_Price', 'Giá điện hiện tại', 'VND/kWh', 'numeric', 'SYSTEM'),
  ('sys_cpu', 'CPU sử dụng', '%', 'numeric', 'SYSTEM'),
  ('sys_ram', 'RAM sử dụng', '%', 'numeric', 'SYSTEM'),
  ('sys_temp', 'Nhiệt độ thiết bị', '°C', 'numeric', 'SYSTEM'),
  ('sys_disk_free', 'Dung lượng đĩa còn trống', 'GB', 'numeric', 'SYSTEM'),

  ('TOTAL', 'Tổng điện năng nhà máy', 'kWh', 'numeric', 'BILLING'),
  ('TOTAL_A', 'Tổng điện năng khu A', 'kWh', 'numeric', 'BILLING'),
  ('TOTAL_B', 'Tổng điện năng khu B', 'kWh', 'numeric', 'BILLING'),

  ('DM1_Total_Yield', 'DM1 Total Yield', 'kWh', 'numeric', 'BILLING'),
  ('DM2_Total_Yield', 'DM2 Total Yield', 'kWh', 'numeric', 'BILLING'),
  ('DM3_Total_Yield', 'DM3 Total Yield', 'kWh', 'numeric', 'BILLING'),

  ('UMC4_Total_ActivePower', 'Tổng công suất UMC4', 'kW', 'numeric', 'POWER'),
  ('UMC4A_Total_ActivePower', 'Tổng công suất UMC4A', 'kW', 'numeric', 'POWER'),
  ('UMC4B_Total_ActivePower', 'Tổng công suất UMC4B', 'kW', 'numeric', 'POWER'),

  ('UMC4A_Total_TotalYield', 'UMC4A Total Yield', 'kWh', 'numeric', 'YIELD'),
  ('UMC4B_Total_TotalYield', 'UMC4B Total Yield', 'kWh', 'numeric', 'YIELD'),
  ('UMC4A_Total_DailyYield', 'UMC4A Daily Yield', 'kWh', 'numeric', 'YIELD'),
  ('UMC4B_Total_DailyYield', 'UMC4B Daily Yield', 'kWh', 'numeric', 'YIELD')
on conflict (var_name) do update
set
  display_name = excluded.display_name,
  unit = excluded.unit,
  data_type = excluded.data_type,
  group_name = excluded.group_name,
  updated_at = now();

-- ------------------------------------------------------------------------------
-- 10) OPTIONAL NOTES
-- ------------------------------------------------------------------------------
-- realtime_states là bảng snapshot latest-value, không phải time-series history.
-- billing_reports là bảng lịch sử dùng cho chart/report.
-- Nếu sau này bạn muốn public realtime history, hãy tạo thêm bảng time-series riêng.
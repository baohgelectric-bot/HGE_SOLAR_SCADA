**Enterprise Solar SCADA Dashboard**

**Handoff-Ready Technical Spec (Bản A --- Giữ đầy đủ yêu cầu, khóa
ambiguity)**

**1) Project Overview**

**1.1 Mục tiêu**

Xây dựng **SCADA dashboard web** cho hệ thống điện mặt trời, phục vụ:

- Giám sát realtime trạng thái vận hành

- Hiển thị KPI tổng quan (công suất / sản lượng / doanh thu)

- Hiển thị biểu đồ lịch sử theo nhiều mốc thời gian

- Trải nghiệm tốt trên desktop và mobile

**1.2 Kiến trúc tổng thể**

**Edge (Siemens IOT2050 + Golang ingester)** → **Supabase PostgreSQL** →
**Next.js Dashboard (Vercel)**

**1.3 Kết quả mong muốn từ AI coding**

AI cần tạo **frontend app chạy được**, gồm:

- UI layout hoàn chỉnh (sidebar/header/content)

- Realtime data subscription

- Historical chart querying

- State management cho time filter

- Component structure đúng spec

- Loading/empty/error/reconnect states

Giai đoạn này là **POC / chạy thử nội bộ** → chưa yêu cầu triển khai
security/auth hoàn chỉnh.

------------------------------------------------------------------------

**2) Tech Stack (Bắt buộc)**

**2.1 Core**

- **Next.js 14+ (App Router)**

- **React**

- **TypeScript**

**2.2 UI**

- **Tailwind CSS**

- **shadcn/ui**

**2.3 Charts**

- **Recharts**

  - BarChart

  - PieChart

  - LineChart (dự phòng / mở rộng)

**2.4 Data Access**

- **Supabase JS Client**

  - **Realtime (WebSocket)** cho realtime_states

  - **PostgREST** cho billing_reports, metadata

**2.5 State / Caching**

- **Zustand** (global filter state)

- **React Query (TanStack Query)** hoặc **SWR** (historical fetching
  cache)

Ưu tiên React Query nếu AI cần chọn 1.

------------------------------------------------------------------------

**3) Information Architecture (Pages & Navigation)**

**3.1 Sidebar Navigation**

Các route hiển thị trong sidebar:

- Plant Overview

- TOTAL

- UMC4A (scope TOTAL_A)

- UMC4B (scope TOTAL_B)

- DM1

- DM2

- DM3

**3.2 Route Naming (Chuẩn hóa)**

Dùng **lowercase routes**:

- / (Plant Overview)

- /total

- /umc4a

- /umc4b

- /dm1

- /dm2

- /dm3

**3.3 Route ↔ Scope Mapping (Khóa ambiguity)**

  ---------------------
  **Route**   **Scope
              chính**
  ----------- ---------
  /total      TOTAL

  /umc4a      TOTAL_A

  /umc4b      TOTAL_B

  /dm1        DM1

  /dm2        DM2

  /dm3        DM3
  ---------------------

Plant Overview có thể dùng nhiều scope cùng lúc (TOTAL + TOTAL_A +
TOTAL_B + DM1/DM2/DM3 tùy widget).

------------------------------------------------------------------------

**4) UI Layout (Screen Composition)**

**4.1 Header**

Hiển thị:

- Cloud connection status

- Dark / Light mode toggle

- System time (frontend clock)

- **Last Sync Time** (thời điểm nhận dữ liệu realtime gần nhất)

**4.2 Top Section --- KPI Cards**

Hiển thị tối thiểu 3 KPI:

- **Tổng doanh thu (VNĐ)**

- **Tổng sản lượng (kWh)**

- **Công suất hiện tại (kW)**

KPI lấy từ realtime + billing tùy loại dữ liệu; ưu tiên first-load có dữ
liệu qua SSR.

**4.3 Middle Section --- Charts**

**A. Bar Chart (Historical)**

- Có **time filter** (global hoặc local):

  - Ngày

  - Tuần

  - Tháng

  - Quý

  - Năm

- Có **Comparison Mode**

  - Hiển thị đồng thời **5 bar charts**

  - Có nút mở/đóng chế độ compare

  - Khi đổi filter, **toàn bộ 5 chart cập nhật đồng bộ**

**B. Pie Chart (Contribution)**

Hiển thị tỷ trọng sản lượng theo **một cấp phân rã tại một thời điểm**
(tránh double-count).

**Các mode hợp lệ (giữ đủ mong muốn của bạn, nhưng khóa cách dùng):**

1.  **DM Mode**

    - Parent: một DM

    - Children: inverter / energy meter thuộc DM đó

2.  **TOTAL Mode**

    - Parent: TOTAL

    - Children: DM1, DM2, DM3

3.  **TOTAL_A Mode (UMC4A)**

    - Parent: TOTAL_A

    - Children: DM1, DM2

4.  **TOTAL_B Mode (UMC4B)**

    - Parent: TOTAL_B

    - Children: DM3

**Không hiển thị TOTAL cùng lúc với các phần con của TOTAL trong cùng
một pie chart**.

**4.4 Bottom Section --- Realtime Inverter Cards**

- Grid cards hiển thị công suất tức thời từng inverter

- Tự đổi màu theo quality / stale

- Responsive cho desktop + mobile

**5) Data Contract (Frontend Rules)**

**5.1 Enums**

- quality: GOOD \| BAD \| OFFLINE

- report_type: HOURLY \| DAILY \| WEEKLY \| MONTHLY \| QUARTERLY \|
  YEARLY

**5.2 Display Rules**

- Timezone hiển thị: **Việt Nam** (Asia/Ho_Chi_Minh)

- Units: kW, kWh, VNĐ, V, A, \...

- Number formatting:

  - kW: 1 decimal

  - kWh: 2 decimals

  - VNĐ: thousands separator, không thập phân

**5.3 Realtime Freshness Rule (Khóa ambiguity)**

Frontend tính stale theo thứ tự:

1.  **Ưu tiên source_ts**

2.  Fallback updated_at nếu source_ts không có

Đánh dấu STALE nếu timestamp được chọn **cũ hơn 30 giây** so với client
time.

------------------------------------------------------------------------

**6) Realtime Data Flow (Supabase Realtime)**

**6.1 Mục đích**

Dùng cho:

- KPI realtime

- Realtime inverter cards

- Last Sync Time

- Trạng thái online/offline/stale trên UI

**6.2 Nguyên tắc**

- **Không dùng polling**

- Dùng **Supabase Realtime WebSocket**

- Subscribe bảng realtime_states

**6.3 Subscription Scope (Tối ưu)**

useRealtimeData chỉ subscribe các var_name cần thiết theo từng page:

- Không subscribe toàn bảng nếu không cần

- Có unsubscribe/cleanup khi unmount

- Có reconnect handling

**6.4 UI trạng thái kết nối (Bắt buộc)**

Frontend cần thể hiện:

- connected

- reconnecting

- disconnected

------------------------------------------------------------------------

**7) Historical Data Fetching (Charts)**

**7.1 Mục đích**

Dùng cho:

- Bar chart

- Pie chart (theo kỳ chọn)

- Comparison mode

**7.2 Nguồn dữ liệu**

Dùng billing_reports (aggregated data), **không query raw data**.

**7.3 Filter → Query Mapping (Khóa ambiguity, dùng cho chart)**

Đây là mapping chính thức cho frontend chart.

  --------------------------------------------------
  **UI        **report_type dùng để   **Số điểm mục
  Filter**    vẽ chart**              tiêu**
  ----------- ----------------------- --------------
  Ngày (Day)  HOURLY                  24

  Tuần (Week) DAILY                   7

  Tháng       DAILY                   28--31
  (Month)                             

  Quý         MONTHLY                 3
  (Quarter)                           

  Năm (Year)  MONTHLY                 12
  --------------------------------------------------

**Ghi chú quan trọng**

- WEEKLY, QUARTERLY, YEARLY vẫn là report_type hợp lệ trong hệ thống
  (phục vụ tổng hợp/báo cáo), nhưng **frontend chart mặc định** dùng
  mapping ở bảng trên để có số điểm trực quan hơn.

- Nếu cần chế độ "summary chart" ở phase sau, có thể dùng WEEKLY /
  QUARTERLY / YEARLY.

**7.4 Query Constraints**

Tất cả historical queries phải:

- filter theo scope

- filter theo report_type

- filter theo range logical_ts

- sort theo logical_ts asc để vẽ chart

------------------------------------------------------------------------

**8) Status / Quality / Visual Rules (SCADA UX)**

**8.1 Màu trạng thái**

- GOOD → xanh

- BAD → đỏ

- OFFLINE → xám

- STALE → vàng/cam

**8.2 Realtime Card Rules**

- quality == OFFLINE → card xám + icon cảnh báo

- quality == BAD → card đỏ + tooltip/mô tả ngắn

- stale == true → badge STALE (vàng/cam)

- Nếu vừa BAD/OFFLINE vừa STALE, ưu tiên hiển thị quality chính + badge
  STALE

------------------------------------------------------------------------

**9) Data Loading Strategy (SSR + Client Hydration)**

**9.1 First Load (SSR)**

Dùng SSR để lấy dữ liệu ban đầu cho:

- Header metadata (nếu cần)

- KPI cơ bản

- Metadata (billing_scopes, scada_points)

- Dữ liệu chart mặc định (tùy page)

**Mục tiêu**

- Hiển thị nội dung ngay từ first paint

- KPI thấy được sớm

- Realtime hydrate sau khi client mount

**9.2 Client-side Realtime**

Sau khi hydrate:

- mở realtime subscription

- cập nhật UI theo payload mới

- cập nhật Last Sync Time

**9.3 Global Time Filter State**

Dùng **Zustand** để quản lý:

- filter type (day/week/month/quarter/year)

- selected date / selected period

- compare mode on/off

Tất cả chart liên quan phải đọc cùng 1 source state để cập nhật đồng bộ.

------------------------------------------------------------------------

**10) Database Model (Frontend-facing summary)**

Frontend cần biết shape và mục đích từng bảng; không cần định nghĩa SQL
đầy đủ trong phần code UI.

**10.1 billing_scopes**

Metadata cho nhóm tính tiền / nhóm hiển thị:

- scope_name (ví dụ TOTAL_A)

- display_name

- capacity_kw

**10.2 scada_points**

Metadata cho biến kỹ thuật:

- var_name

- display_name

- unit

- data_type

- group_name

**10.3 realtime_states**

Dữ liệu realtime mới nhất:

- var_name (PK / upsert key)

- value

- source_ts

- quality

- is_stale (có thể được backend set; frontend vẫn tự tính stale để hiển
  thị)

- updated_at

**10.4 billing_reports**

Dữ liệu tổng hợp lịch sử:

- scope

- report_type

- logical_ts

- yield_kwh

- revenue_vnd

- price_applied

Ràng buộc idempotent ở backend/DB:

- UNIQUE (scope, report_type, logical_ts)

------------------------------------------------------------------------

**11) Project Structure (Bắt buộc theo App Router)**

solar-scada-web/\
├── src/\
│ ├── app/\
│ │ ├── (dashboard)/\
│ │ │ ├── page.tsx\
│ │ │ ├── total/page.tsx\
│ │ │ ├── umc4a/page.tsx\
│ │ │ ├── umc4b/page.tsx\
│ │ │ ├── dm1/page.tsx\
│ │ │ ├── dm2/page.tsx\
│ │ │ └── dm3/page.tsx\
│ │ ├── layout.tsx\
│ │ └── globals.css\
│ │\
│ ├── components/\
│ │ ├── layout/\
│ │ ├── charts/\
│ │ ├── scada/\
│ │ ├── ui/\
│ │ └── providers/\
│ │ ├── ThemeProvider.tsx\
│ │ └── QueryProvider.tsx\
│ │\
│ ├── config/\
│ │ ├── constants.ts\
│ │ └── site.ts\
│ │\
│ ├── lib/\
│ │ ├── supabase/\
│ │ │ ├── client.ts\
│ │ │ └── server.ts\
│ │ └── utils.ts\
│ │\
│ ├── services/\
│ │ ├── billing.service.ts\
│ │ └── scada.service.ts\
│ │\
│ ├── hooks/\
│ │ ├── useRealtimeData.ts\
│ │ └── useBillingQueries.ts\
│ │\
│ ├── store/\
│ │ └── useFilterStore.ts\
│ │\
│ └── types/\
│ ├── database.types.ts\
│ └── scada.types.ts\
│\
├── .env.local\
├── tailwind.config.ts\
└── package.json

------------------------------------------------------------------------

**12) Required UI States (Bắt buộc cho AI coding)**

AI phải implement các state sau (không chỉ happy path):

**12.1 Loading**

- KPI skeleton

- Chart skeleton

- Realtime cards skeleton

**12.2 Empty**

- "Chưa có dữ liệu trong khoảng thời gian này"

- Placeholder chart state

**12.3 Error**

- Banner/toast lỗi query

- Nút Retry (hoặc auto retry + manual retry)

**12.4 Realtime Reconnect**

- Hiển thị trạng thái "Reconnecting..."

- Khi reconnect thành công, cập nhật lại indicator

------------------------------------------------------------------------

**13) Performance Targets (POC Targets)**

- First dashboard load \< **2s** (mạng nội bộ tốt)

- Realtime UI update \< **1s** sau khi DB update

- Chart query \~30 điểm \< **500ms**

- Comparison mode (**5 charts**) render \< **2s**

Đây là target POC để định hướng tối ưu; chưa phải SLA production.

------------------------------------------------------------------------

**14) Comparison Mode (Chi tiết yêu cầu)**

**14.1 Mục tiêu**

Cho phép người dùng xem nhanh nhiều biểu đồ cột cùng lúc để so sánh.

**14.2 Yêu cầu bắt buộc**

- Hiển thị **5 bar charts** đồng thời

- Dùng chung global filter

- Có control mở/đóng mode

- Có layout responsive hợp lý (desktop ưu tiên)

- Có thể dùng Dialog, Drawer, hoặc Fullscreen Panel

**14.3 Đồng bộ hành vi**

Khi đổi filter:

- tất cả chart trong comparison mode refetch + rerender đồng bộ

- giữ cùng time range và cùng quy tắc query mapping

------------------------------------------------------------------------

**15) MVP Scope (Giữ đầy đủ mong muốn hiện tại)**

**15.1 In Scope (MVP hiện tại)**

1.  Layout + Sidebar + Header

2.  KPI Cards (SSR first load)

3.  Bar Chart có time filter

4.  Pie Chart (theo mode phân rã hợp lệ)

5.  Realtime Inverter Cards (Supabase Realtime)

6.  Comparison Mode (5 charts đồng bộ)

7.  Responsive desktop + mobile

8.  Loading / Empty / Error / Reconnect states

9.  Zustand filter store + data services + hooks

**15.2 Out of Scope (POC hiện tại)**

- Auth / RBAC / RLS policy implementation

- Alarm history / event log đầy đủ

- Export PDF/CSV

- Multi-tenant / multi-site phức tạp

- Tối ưu production sâu (virtualization/downsampling nâng cao)

------------------------------------------------------------------------

**16) Acceptance Criteria (Dùng để đánh giá output AI code)**

**16.1 Functional**

- Sidebar route đúng và điều hướng được giữa /total, /umc4a, /umc4b,
  /dm1, /dm2, /dm3

- Header hiển thị cloud status + last sync time + theme toggle

- KPI cards hiển thị dữ liệu ở first load (SSR hoặc server-fetched
  initial data)

- Realtime cards cập nhật khi realtime_states thay đổi

- quality=OFFLINE hiển thị xám; BAD hiển thị đỏ; stale hiển thị badge
  STALE

- Bar chart đổi dữ liệu đúng khi đổi filter
  (Day/Week/Month/Quarter/Year)

- Comparison mode hiển thị 5 chart và cập nhật đồng bộ theo filter

- Pie chart không double-count TOTAL với các phần con trong cùng 1 chart

**16.2 UX / State Handling**

- Có loading skeleton

- Có empty state

- Có error state + retry

- Có reconnect indicator cho realtime

**16.3 Code Organization**

- Thư mục dự án đúng cấu trúc ở mục 11

- Tách services, hooks, store, types, config

- Route names lowercase

- Không tự ý thêm field DB ngoài spec nếu không khai báo rõ

------------------------------------------------------------------------

**17) AI Coding Handoff Instructions (Đính kèm khi giao agent)**

**17.1 Cách làm việc mong muốn**

AI nên thực hiện theo thứ tự:

1.  Xuất **implementation plan**

2.  Liệt kê **assumptions/ambiguities** (nếu có)

3.  Tạo **project scaffold**

4.  Implement theo module:

    - layout → providers → supabase clients → store → services → hooks →
      components → pages

5.  Cuối cùng mới polish UI

**17.2 Constraints cho AI**

- Không đổi route naming đã chốt

- Không đổi mapping route ↔ scope

- Không đổi filter → report_type mapping đã chốt

- Không trộn TOTAL với phần con trong cùng pie chart

- Không bỏ qua loading/empty/error/reconnect states

------------------------------------------------------------------------

**18) Notes cho Implementation (khuyến nghị)**

- Chuẩn hóa sớm config/constants.ts để tránh hardcode:

  - enum

  - color tokens

  - route/scope map

  - chart labels

- services chỉ làm data fetching / query shaping

- hooks xử lý orchestration + binding vào UI state

- types/scada.types.ts nên tách rõ:

  - DB row types

  - UI model types (chart points / card props)

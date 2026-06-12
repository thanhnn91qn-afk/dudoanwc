# ⚽ Dự đoán World Cup 2026

Web dự đoán thắng/thua World Cup 2026 để chơi cùng bạn bè. Mỗi người tự đăng ký tên, dự đoán từng trận ở vòng bảng (12 bảng × 6 trận = 72 trận) và thi đấu xem ai có nhiều điểm nhất. Dữ liệu đồng bộ realtime qua **Supabase** nên mọi người chơi đều thấy cập nhật của nhau ngay lập tức.

## Tính năng

- 🪪 **Đăng ký/đăng nhập theo tên** — không cần mật khẩu, chỉ cần nhập tên là chơi được.
- 🗺️ **Sơ đồ trực quan 12 bảng A–L** với cờ, giờ thi đấu VN, sân vận động.
- 🎯 **Dự đoán từng trận**: chọn đội thắng (nhà / hoà / khách) — không cần đoán tỉ số.
- 🔒 **Tự khoá vote khi trận đã bắt đầu** theo giờ VN (đọc từ `kickoffVN` trong JSON).
- 🏆 **Vòng trong (Knockout)**: tự động sắp xếp đội vào vòng 1/16, tứ kết, bán kết, chung kết dựa trên kết quả vòng bảng.
- 🛠 **Chế độ Admin**: bất kỳ ai cũng có thể bật để tự xác nhận kết quả thật.
- 📊 **Bảng xếp hạng**: đúng đội thắng +1 điểm, kèm số lượt **Đúng / Sai / Bỏ**.
- 📜 **Lịch sử (audit log)**: tab chỉ hiện ở chế độ Admin để tra lại mọi thay đổi.
- ☀️🌙 **Light / Dark mode** với bảng màu charcoal navy dịu mắt.

## Công nghệ

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- React 19 + TypeScript
- Tailwind CSS v4
- **Supabase** (Postgres + Realtime) — bắt buộc cho chế độ nhiều người chơi
- Lưu tên đăng nhập hiện tại trong `localStorage` (chỉ phía client, không lưu trên server)

---

## 🚀 Cài đặt & cấu hình Supabase

Web **bắt buộc** phải có Supabase để lưu dữ liệu người chơi. Làm theo 4 bước dưới đây.

### Bước 1 — Tạo project Supabase

1. Vào [https://supabase.com](https://supabase.com) → đăng ký/đăng nhập → **New project**.
2. Đặt tên project (vd `wc-predictor`) và đặt **Database password** mạnh → chọn region gần Việt Nam nhất (Singapore) → **Create new project**.
3. Chờ ~2 phút để project khởi tạo xong.

### Bước 2 — Tạo các bảng (SQL Editor)

Trong Supabase Dashboard, mở **SQL Editor** (biểu tượng `</>` ở sidebar) → **New query** → dán toàn bộ script dưới đây → **Run**.

```sql
-- 1) Người chơi
create table if not exists public.wc_players (
  id text primary key,           -- uuid tự sinh phía client
  name text not null unique,     -- tên hiển thị, không phân biệt hoa/thường
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Dự đoán từng trận của từng người
create table if not exists public.wc_predictions (
  player_id text not null references public.wc_players(id) on delete cascade,
  match_id text not null,        -- "A1", "A2", "B1R32", ...
  pick text not null check (pick in ('home','away','draw')),
  predicted_at timestamptz not null default now(),
  primary key (player_id, match_id)
);

-- 3) Kết quả thật do admin nhập
create table if not exists public.wc_results (
  match_id text primary key,
  winner text not null check (winner in ('home','away','draw')),
  score_home int not null,
  score_away int not null,
  finalized_at timestamptz not null default now()
);

-- 4) Lịch sử thay đổi (audit log) — tab Lịch sử trong app
create table if not exists public.wc_audit_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  actor_name text,               -- tên người thao tác (có thể null nếu là hệ thống)
  action text not null,          -- "player.create", "prediction.update", "result.set", ...
  match_id text,
  player_id text,
  details jsonb                  -- thông tin thay đổi (pick cũ/mới, điểm, ...)
);

-- Indexes để truy vấn nhanh
create index if not exists idx_predictions_match on public.wc_predictions(match_id);
create index if not exists idx_audit_match on public.wc_audit_log(match_id);
create index if not exists idx_audit_player on public.wc_audit_log(player_id);
create index if not exists idx_audit_created on public.wc_audit_log(created_at desc);
```

### Bước 3 — Bật Realtime (để cập nhật tức thì)

Vào **Database** → **Replication** → tìm 4 bảng `wc_players`, `wc_predictions`, `wc_results`, `wc_audit_log` → bật nút **Realtime** cho từng bảng.

Ngoài ra vào **Database** → **Publications** → chọn publication `supabase_realtime` → đảm bảo 4 bảng trên đều có trong danh sách (nếu chưa có, chạy):

```sql
alter publication supabase_realtime add table public.wc_players;
alter publication supabase_realtime add table public.wc_predictions;
alter publication supabase_realtime add table public.wc_results;
alter publication supabase_realtime add table public.wc_audit_log;
```

### Bước 4 — Lấy URL + Anon Key

1. Trong Supabase Dashboard, vào **Settings** (biểu tượng ⚙️) → **API**.
2. Copy 2 giá trị:
   - **Project URL** (vd `https://abcdefgh.supabase.co`)
   - **anon public key** (chuỗi JWT bắt đầu bằng `eyJ...`)

### Bước 5 — Cấu hình biến môi trường

Tạo file `.env.local` ở thư mục gốc của project (cùng cấp với `package.json`) với nội dung:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> File này **đã có trong `.gitignore`** nên sẽ không bị push lên GitHub.

### Bước 6 — Chạy thử local

```bash
npm install
npm run dev
```

Mở <http://localhost:3000>, nhập tên, dự đoán. Mở thêm 1 tab/incognito khác với tên khác để thấy cập nhật realtime.

> **Lưu ý về Row Level Security (RLS):** mặc định Supabase bật RLS nhưng không thêm policy. Vì app dùng **anon key** và cho phép mọi người tự đăng ký/đoán theo tên (không có auth thật), bạn cần mở quyền truy cập cho 4 bảng. Chạy tiếp trong SQL Editor:

```sql
-- Cho phép anon (public) đọc + ghi 4 bảng
alter table public.wc_players enable row level security;
alter table public.wc_predictions enable row level security;
alter table public.wc_results enable row level security;
alter table public.wc_audit_log enable row level security;

create policy "anon all wc_players" on public.wc_players
  for all to anon using (true) with check (true);
create policy "anon all wc_predictions" on public.wc_predictions
  for all to anon using (true) with check (true);
create policy "anon all wc_results" on public.wc_results
  for all to anon using (true) with check (true);
create policy "anon read wc_audit_log" on public.wc_audit_log
  for select to anon using (true);
create policy "anon insert wc_audit_log" on public.wc_audit_log
  for insert to anon with check (true);
```

> ⚠️ Nếu muốn **khoá chặt hơn** (vd ai cũng đọc được nhưng chỉ chủ trận mới sửa được), bạn cần tích hợp Supabase Auth và thay policy tương ứng. Mặc định ở trên là "ai cũng đoán được, ai cũng nhập kết quả được" — phù hợp với bản chất "chơi cùng bạn bè" của app.

---

## 🌐 Deploy lên Vercel

### Cách A — Qua GitHub (khuyên dùng)

1. Push code lên GitHub (xem phần bên dưới).
2. Vào <https://vercel.com/new> → **Import** repo `dudoanwc` của bạn.
3. Trong khung **Environment Variables**, thêm 2 biến:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL bạn đã copy
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
4. Bấm **Deploy** → đợi 1–2 phút.

Mỗi lần push code mới lên GitHub, Vercel sẽ tự động build & deploy lại.

### Cách B — Deploy trực tiếp bằng CLI

```bash
npm i -g vercel
vercel login                 # đăng nhập 1 lần
vercel link                 # liên kết với project (tạo mới nếu chưa có)
vercel env add NEXT_PUBLIC_SUPABASE_URL
# dán URL, Enter
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# dán anon key, Enter
vercel --prod               # deploy production
```

---

## 🛠 Chạy local không cần Supabase (chế độ offline)

Nếu chưa cấu hình Supabase, app vẫn chạy nhưng sẽ hiển thị chấm đỏ **"Chưa cấu hình Supabase · App chạy offline"** và không lưu được dữ liệu. Hữu ích để xem giao diện.

```bash
npm install
npm run dev
```

---

## 🔄 Cập nhật dữ liệu giải đấu

Dữ liệu nằm trong `public/worldcup2026.json`. Khi FIFA công bố lịch thi đấu chính thức:

1. Thay thế file `public/worldcup2026.json` (giữ nguyên schema).
2. `kickoffVN` phải ở định dạng ISO 8601 với timezone `+07:00`, ví dụ: `"2026-06-12T02:00:00+07:00"`.
3. Commit + push → Vercel tự redeploy.

---

## 🤝 Đẩy lên GitHub

```bash
git init                                    # chỉ chạy nếu chưa có repo
git add -A
git commit -m "Initial commit"
gh repo create dudoanwc --public --source=. --push
```

Sau đó mở Supabase Dashboard → copy URL + anon key → dán vào Vercel Environment Variables.

---

## 📖 Cách chơi

1. Mở web, nhập **tên của bạn** → bấm **Bắt đầu dự đoán**. Sau này web sẽ gợi ý lại tên.
2. Tab **Theo ngày** (mặc định): xem các trận trong ngày hôm nay + ngày mai.
3. Tab **Vòng bảng**: chọn bảng A → L, dự đoán từng trận bằng 3 nút (nhà / hoà / khách).
4. Tab **Vòng trong**: tự xuất hiện khi vòng bảng có kết quả.
5. Khi trận thật đã diễn ra, bấm **Chế độ Admin** ở header → nhập tỉ số → bấm kết quả.
6. Tab **Bảng xếp hạng**: ai đoán đúng nhiều nhất sẽ lên top 🥇.
7. Tab **Lịch sử** (chỉ Admin): xem lại toàn bộ thay đổi.

> Khi trận đã bắt đầu (theo giờ VN) hệ thống sẽ tự khoá nút dự đoán. Khi admin đã chốt kết quả thì không thể sửa dự đoán nữa.

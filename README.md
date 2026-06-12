# ⚽ Dự đoán World Cup 2026

Web dự đoán thắng/thua World Cup 2026 để chơi cùng bạn bè. Mỗi người tự đăng ký tên, dự đoán từng trận ở vòng bảng (12 bảng × 6 trận = 72 trận) và thi đấu xem ai có nhiều điểm nhất.

## Tính năng

- 🪪 **Đăng ký/đăng nhập theo tên** — không cần tài khoản, không cần backend. Mỗi người dùng nhập tên, các lần sau web sẽ tự gợi ý lại.
- 🗺️ **Sơ đồ trực quan 12 bảng A–L** với cờ, ngày thi đấu, sân vận động.
- 🎯 **Dự đoán từng trận**: chỉ cần chọn đội thắng (nhà / hoà / khách) — không cần đoán tỉ số.
- 🏆 **Vòng trong (Knockout)**: tự động sắp xếp đội vào vòng 1/16, tứ kết, bán kết, chung kết dựa trên kết quả vòng bảng.
- 🛠 **Chế độ Admin**: bất kỳ ai cũng có thể bật để **tự xác nhận kết quả thắng/thua thực tế** cho từng trận (khi đã có kết quả thật).
- 📊 **Bảng xếp hạng**:
  - Đúng đội thắng → **+1 điểm**
  - Hiển thị số lượt đoán **Đúng** / **Sai** cho mỗi người chơi
- 🧮 **Bảng xếp hạng bảng** tự cập nhật khi admin xác nhận kết quả.
- 🗳 **Thống kê cộng đồng** cho từng trận: bao nhiêu người đoán nhà / hoà / khách.
- 💾 Lưu trong **localStorage** của trình duyệt — không cần cơ sở dữ liệu.

## Công nghệ

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- React 19 + TypeScript
- Tailwind CSS v4
- Lưu trữ: `localStorage`

## Chạy local

```bash
npm install
npm run dev
```

Mở <http://localhost:3000>.

## Build production

```bash
npm run build
npm start
```

## Deploy Vercel

Project đã được cấu hình sẵn cho Vercel. Cách nhanh nhất:

```bash
npx vercel        # triển khai preview
npx vercel --prod # triển khai production
```

## Cách chơi

1. Mở web, nhập **tên của bạn** → bấm **Đăng ký tên mới**. Sau này web sẽ gợi ý lại tên này.
2. Chọn bảng (A → L) ở thanh bên phải.
3. Với mỗi trận: bấm 1 trong 3 nút (đội nhà thắng / hoà / đội khách thắng). Vòng trong chỉ có 2 nút (không hoà).
4. Khi trận đấu thật đã diễn ra, **bất kỳ ai cũng bấm nút "Chế độ Admin"** ở header → điền tỉ số thật → bấm kết quả (đội nhà / hoà / đội khách) để xác nhận.
5. Sau khi có kết quả, mở tab **Bảng xếp hạng** để xem ai đang dẫn đầu.

> Mẹo: Mỗi người dùng có thể dùng cùng một trình duyệt (nhập tên đăng nhập) hoặc mỗi người dùng trình duyệt riêng. Dữ liệu lưu theo từng trình duyệt nên nếu muốn "cùng chơi" thì dùng chung một máy và đăng nhập bằng tên khác nhau.

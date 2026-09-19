# Block Blast Arena

Game xếp khối thi đấu trực tuyến. Tạo phòng, mời bạn bè, cùng xếp khối xem ai ghi nhiều điểm nhất trong thời gian quy định.

## Tính năng
- 2-8 người chơi cùng lúc qua nhiều thiết bị
- Phòng có mã 6 ký tự, dễ chia sẻ
- Thời gian thi đấu tùy chỉnh (1-5 phút)
- Xem trực tiếp bảng xếp khối của đối thủ phía trên
- Bảng xếp hạng real-time phía dưới
- Hiệu ứng nổ khi xếp đủ hàng/cột
- Âm thanh khi đặt khối, xếp hàng, combo
- Cài đặt lên home screen như app (PWA)

## Tech
- React + TypeScript + Vite
- Tailwind CSS
- Framer Motion (animations)
- Supabase (real-time multiplayer)
- Web Audio API (sound effects)

## Cài đặt local
```bash
npm install
npm run dev
```

## Build & Deploy
```bash
npm run build
# Deploy dist/ lên GitHub Pages
```

# Du Lịch Online — bản demo

Website du lịch online Việt Nam: tạo tài khoản → chọn điểm đến trên bản đồ → tham quan 360° → trả lời câu đố → nhận dấu hộ chiếu.

Website thuần HTML/CSS/JS, **không cần cài đặt hay build**. Chạy thử:

```bash
cd dulichonline
python3 -m http.server 8000
# mở http://localhost:8000
```

## Cấu trúc

| File | Dùng để |
|---|---|
| `js/data.js` | **Danh sách điểm đến** — sửa tên, giới thiệu, hotspot, câu đố, thêm điểm mới |
| `images/` | Bỏ ảnh 360° thật vào đây |
| `css/style.css` | Màu sắc, giao diện (đổi màu ở đầu file, mục `:root`) |
| `js/app.js` | Logic: tài khoản, bản đồ, trình xem 360°, hộ chiếu |
| `js/scene.js` | Vẽ cảnh minh họa khi chưa có ảnh thật |
| `js/map-data.js` | Đường biên bản đồ Việt Nam (tự động tạo, không cần sửa) |
| `vendor/` | Thư viện Pannellum (trình xem 360°, giấy phép MIT) |

## Việc hay làm

**Thêm điểm đến mới:** copy một khối `{ ... }` trong `js/data.js`, đổi `id`, `name`, `lat`, `lon`… Điểm sẽ tự hiện trên bản đồ, trong danh sách và trong hộ chiếu.

**Dùng ảnh 360° thật thay cảnh vẽ:**
1. Chụp bằng điện thoại (Google Street View app, chế độ Panorama 360°) hoặc camera 360 (Insta360, Ricoh Theta). Xuất ảnh **equirectangular, tỉ lệ 2:1**, rộng khoảng 4000–6000px, dạng JPG.
2. Lưu vào `images/`, ví dụ `images/hoi-an.jpg`.
3. Trong `data.js` đổi `pano: null` thành `pano: "images/hoi-an.jpg"`.

**Đặt vị trí hotspot:** mở cảnh 360°, xoay tới chỗ muốn đặt. Góc trên bên phải hiện `yaw … · pitch …`; chép hai số đó vào hotspot trong `data.js`.

## Lộ trình nâng cấp

1. **Ảnh 360° thật** cho từng điểm đến, kèm thuyết minh giọng nói (`<audio>` trong ghi chú hotspot).
2. **Tài khoản thật:** hiện lưu ở `localStorage` của trình duyệt. Chuyển sang Supabase hoặc Firebase Auth bằng cách thay đối tượng `store` và form đăng nhập trong `app.js`.
3. **Bảng xếp hạng và chia sẻ hộ chiếu** lên mạng xã hội.
4. **Cảnh 3D** cho 1–2 điểm nổi bật (Three.js + Gaussian Splatting quay từ video điện thoại).
5. **Kiếm tiền:** nút "Muốn đến thật?" (`realTrip`) dẫn tới tour/khách sạn của đối tác.

## Triển khai

Đây là site tĩnh, nên có thể đưa lên Cloudflare Pages, Netlify hoặc GitHub Pages bằng cách kéo-thả cả thư mục `dulichonline/`.

Bản đồ dùng dữ liệu Natural Earth (public domain). Bản đồ thể hiện quần đảo Hoàng Sa và Trường Sa thuộc Việt Nam.

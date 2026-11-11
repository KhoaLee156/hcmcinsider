# QR Miễn Phí 📱

> **Bản web đang chạy tại https://hcmcinsider.com/qr/** (tiếng Anh + tiếng Việt). Mã nguồn này nằm trong thư mục `qr-src/` của kho trang web.

## Cập nhật bản web
```bash
cd qr-src
npm install
scripts/build-web.sh
```
Lệnh trên build lại thư mục `qr/` của trang web. Commit + push lên GitHub → Cloudflare tự cập nhật.
Khung trang (tiêu đề, mô tả cho Google…) nằm ở `web/index.html`; chữ trong app nằm ở `src/i18n.tsx`.

Ứng dụng tạo mã QR **miễn phí, không quảng cáo, không cần tài khoản** cho Android & iOS
(Expo / React Native + TypeScript — một mã nguồn cho cả 2 nền tảng).

## Tính năng
| Loại | Ghi chú |
|---|---|
| 🔗 Link | Tự thêm `https://` nếu thiếu |
| 🖼️ Ảnh / Tệp | Dán link Google Drive/OneDrive… hoặc tự tải lên (nếu bật Supabase) |
| 📝 Văn bản | Hỗ trợ tiếng Việt có dấu |
| 📶 Wi‑Fi | Quét là kết nối, tự xử lý ký tự đặc biệt |
| 🏦 Chuyển khoản | **VietQR** chuẩn NAPAS — mọi app ngân hàng VN quét được |
| 👤 Danh bạ | vCard 3.0 |
| ✉️ Email · 📞 Gọi · 💬 SMS | |

- Tùy chỉnh màu, **logo ở giữa**, chú thích dưới mã; cảnh báo khi màu khó quét
- Lưu ảnh PNG 1024px, chia sẻ, sao chép nội dung
- **Quét mã** bằng camera hoặc từ ảnh, hiển thị đẹp Wi‑Fi / VietQR / danh bạ
- Lịch sử + gắn sao, chỉ lưu trên máy
- Mã QR **tĩnh** → không bao giờ hết hạn (khác các trang “QR động” thu phí)

## Chạy thử trên điện thoại
```bash
npm install
npx expo start
```
Cài app **Expo Go** trên điện thoại → quét mã QR hiện trong terminal.
> Một số tính năng gốc (lưu ảnh, quét từ ảnh) nên thử bằng bản build thật (`eas build --profile preview`).

## Cấu hình — `src/config.ts`
- `APP_NAME`, `CONTACT_EMAIL`, `PRIVACY_URL`
- `DONATE`: ngân hàng (mã BIN trong `src/lib/banks.ts`), số tài khoản, tên → app tự tạo mã VietQR ủng hộ
- `UPLOAD`: bật tải tệp lên (xem bên dưới)

Đổi `com.yourname.qrmienphi` trong `app.json` thành mã định danh của bạn (không đổi được sau khi đã đăng store).
Thay icon trong thư mục `assets/` (1024×1024 px).

## (Tùy chọn) Bật tải ảnh/tệp lên — Supabase miễn phí
1. Tạo dự án tại supabase.com (gói Free: 1 GB lưu trữ).
2. Storage → New bucket → tên `qr-files`, bật **Public bucket**, giới hạn kích thước 10 MB.
3. SQL Editor → chạy:
   ```sql
   create policy "anon upload" on storage.objects
     for insert to anon with check (bucket_id = 'qr-files');
   ```
4. Project Settings → API: chép **Project URL** và khóa **anon public** vào `UPLOAD` trong `src/config.ts`.

⚠️ Tệp tải lên là công khai với ai có link. Gói Free sẽ hết dung lượng nếu nhiều người dùng — khi đó có thể
chuyển sang Cloudflare R2 (10 GB miễn phí) hoặc tắt tính năng này (app tự quay về hướng dẫn dán link Drive).

## Phát hành
Cài công cụ: `npm i -g eas-cli` → `eas login` (tài khoản expo.dev miễn phí).

### Google Play (phí 25 USD một lần)
1. Đăng ký tại play.google.com/console. Tài khoản **cá nhân** mới phải cho **12 người thử nghiệm trong 14 ngày** (closed testing) trước khi được phát hành công khai.
2. `eas build --platform android --profile production` → tải file `.aab`.
3. Tạo app trên Play Console, điền: mô tả, ảnh chụp màn hình, **Data safety: "Không thu thập dữ liệu"**, link chính sách bảo mật (đăng `PRIVACY.md` lên GitHub Pages / Google Sites).
4. Tải `.aab` lên kênh thử nghiệm → sau đó Production. Hoặc `eas submit -p android`.

### App Store (99 USD/năm)
1. Đăng ký Apple Developer Program. **Không cần máy Mac** — EAS build trên đám mây.
2. `eas build --platform ios --profile production` → `eas submit -p ios`.
3. App Store Connect: điền thông tin, **App Privacy: "Data Not Collected"**, gửi duyệt.

## ⚠️ Về việc nhận donate
- **App Store**: cá nhân **không được** đặt nút/QR quyên góp chuyển khoản bên ngoài trong app (Guideline 3.1.1 & 3.2.2). Chỉ được dùng *In‑App Purchase* (mua “tip”, Apple thu 15–30%) hoặc là tổ chức phi lợi nhuận được duyệt. → Mặc định `DONATE.enabled` **tắt trên iOS**.
- **Google Play**: chính sách thanh toán cũng yêu cầu dùng Google Play Billing cho hàng hóa số; khoản ủng hộ tự nguyện không đổi lấy tính năng thường được chấp nhận hơn nhưng **không được bảo đảm**. An toàn nhất: đặt thông tin ủng hộ trên **trang web / GitHub / Facebook** của bạn và chỉ ghi tên trang đó trong mô tả.
- Hãy đọc chính sách hiện hành trước khi gửi duyệt — chính sách thay đổi thường xuyên.

## Cấu trúc
```
App.tsx                  thanh điều hướng 4 tab
src/config.ts            cấu hình
src/i18n.tsx             chữ tiếng Việt / tiếng Anh
src/lib/webExport.ts     lưu PNG / chia sẻ trên web
web/                     khung trang cho hcmcinsider.com/qr
scripts/build-web.sh     build bản web vào ../qr
src/lib/payload.ts       tạo nội dung QR (Wi‑Fi, vCard, VietQR + CRC16…)
src/lib/banks.ts         mã BIN ngân hàng
src/lib/history.ts       lịch sử (AsyncStorage)
src/lib/upload.ts        tải tệp lên Supabase
src/components/          giao diện, khung xem trước + lưu/chia sẻ
src/screens/             Tạo mã · Quét · Lịch sử · Giới thiệu
```

## Giấy phép
MIT — tự do sử dụng, chỉnh sửa, chia sẻ.

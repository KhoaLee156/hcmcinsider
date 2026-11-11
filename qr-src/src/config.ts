import { Platform } from 'react-native';

/**
 * ====== CẤU HÌNH ỨNG DỤNG — chỉnh ở đây ======
 */
export const APP_VERSION = '1.0.0';

/**
 * Tải tệp/ảnh lên để tạo QR (tùy chọn).
 * Mã QR chỉ chứa được ~3 KB nên tệp phải nằm ở đâu đó trên mạng; QR chỉ chứa đường link.
 * Để trống => app hướng dẫn người dùng dán link Google Drive / OneDrive / Dropbox.
 * Muốn bật: tạo dự án Supabase miễn phí, tạo bucket "public" tên `qr-files` (xem README.md).
 */
export const UPLOAD = {
  supabaseUrl: '', // ví dụ: 'https://abcxyz.supabase.co'
  supabaseAnonKey: '', // khóa "anon public" (không dùng service_role!)
  bucket: 'qr-files',
  maxSizeMB: 10,
};

/**
 * Ủng hộ (donate).
 * LƯU Ý CHÍNH SÁCH: App Store (mục 3.1.1 / 3.2.2) không cho cá nhân nhận donate qua kênh ngoài
 * trong app; Google Play cũng có quy định về thanh toán. Mặc định chỉ hiện trên Android;
 * hãy đọc README.md trước khi phát hành.
 */
export const DONATE = {
  // Trên web không bị ràng buộc bởi chính sách store; trên iOS mặc định tắt.
  enabled: Platform.OS !== 'ios',
  bankBin: '', // ví dụ '970436' (Vietcombank) — xem src/lib/banks.ts
  bankAccount: '', // số tài khoản
  accountName: '', // tên chủ tài khoản (KHÔNG DẤU, IN HOA)
  message: 'Ung ho QR Mien Phi',
  link: '', // tùy chọn: trang web / Ko-fi / Buy Me a Coffee của bạn
};

export const CONTACT_EMAIL = 'hello@hcmcinsider.com';
export const PRIVACY_URL = 'https://hcmcinsider.com/privacy';

/** Trang web chủ (hiện ở đầu app và trong Giới thiệu). Để url trống để ẩn. */
export const HOME = { label: 'HCMC Insider', url: 'https://hcmcinsider.com' };

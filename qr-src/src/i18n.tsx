import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'vi';

const vi = {
  'app.name': 'QR Miễn Phí',
  'app.tagline': 'Miễn phí · Không quảng cáo · Không cần tài khoản',
  'tab.create': 'Tạo mã', 'tab.scan': 'Quét', 'tab.history': 'Lịch sử', 'tab.about': 'Giới thiệu',
  'type.url': 'Link', 'type.file': 'Ảnh / Tệp', 'type.text': 'Văn bản', 'type.wifi': 'Wi‑Fi', 'type.bank': 'Chuyển khoản',
  'type.contact': 'Danh bạ', 'type.email': 'Email', 'type.phone': 'Gọi điện', 'type.sms': 'SMS',
  'restored': 'Đang mở lại từ Lịch sử: “{label}”. Sửa bất kỳ ô nào để tạo mã mới.',
  'url.label': 'Đường link',
  'text.label': 'Nội dung', 'text.ph': 'Nhập văn bản bất kỳ…',
  'file.noteUpload': 'Chọn ảnh hoặc tệp — app sẽ tải lên và tạo mã QR chứa link tải về.',
  'file.note': 'Mã QR chỉ chứa được khoảng 3 KB nên không thể “nhét” cả ảnh hay tài liệu vào mã.\nCách làm: tải tệp lên Google Drive / OneDrive / Dropbox → bật “Bất kỳ ai có đường liên kết” → sao chép link → dán vào ô bên dưới.',
  'file.pickImage': 'Chọn ảnh / video', 'file.pickDoc': 'Chọn tệp', 'file.uploading': 'Đang tải lên {name}…',
  'file.link': 'Link tệp', 'file.name': 'Tên hiển thị (tùy chọn)', 'file.namePh': 'Ví dụ: Thực đơn quán',
  'file.uploadError': 'Lỗi tải lên',
  'wifi.ssid': 'Tên mạng (SSID)', 'wifi.security': 'Bảo mật', 'wifi.nopass': 'Không mật khẩu', 'wifi.password': 'Mật khẩu', 'wifi.hidden': 'Mạng ẩn',
  'bank.note': 'Tạo mã VietQR — quét được bằng mọi app ngân hàng và ví điện tử tại Việt Nam.',
  'bank.bank': 'Ngân hàng', 'bank.search': 'Tìm: Vietcombank, MB, ACB…', 'bank.account': 'Số tài khoản',
  'bank.name': 'Tên chủ tài khoản (tùy chọn, in dưới mã)', 'bank.amount': 'Số tiền (VND, tùy chọn)',
  'bank.amountHint': 'Để trống để người chuyển tự nhập', 'bank.msg': 'Nội dung chuyển khoản (tùy chọn)', 'bank.msgHint': 'Tự động bỏ dấu, tối đa 50 ký tự',
  'contact.last': 'Họ', 'contact.first': 'Tên', 'contact.phone': 'Số điện thoại', 'contact.email': 'Email', 'contact.org': 'Công ty',
  'contact.title': 'Chức danh', 'contact.website': 'Website', 'contact.address': 'Địa chỉ',
  'email.to': 'Gửi đến', 'email.subject': 'Tiêu đề', 'email.body': 'Nội dung',
  'phone.label': 'Số điện thoại', 'sms.msg': 'Tin nhắn',
  'style.title': 'Tùy chỉnh giao diện', 'style.open': 'Mở', 'style.close': 'Thu gọn', 'style.fg': 'Màu mã', 'style.bg': 'Màu nền',
  'style.contrast': 'Màu mã nên đậm hơn màu nền rõ rệt, nếu không nhiều máy sẽ không quét được.',
  'style.logo': 'Logo ở giữa', 'style.pickLogo': 'Chọn logo', 'style.changeLogo': 'Đổi logo', 'style.removeLogo': 'Bỏ logo',
  'style.caption': 'Chú thích dưới mã (tùy chọn)', 'style.captionPh': 'Ví dụ: Quét để xem thực đơn', 'style.reset': 'Khôi phục mặc định',
  'style.color': 'Màu {c}',
  'qr.empty': 'Nhập nội dung để tạo mã QR',
  'qr.tooBig': 'Nội dung quá dài ({bytes} byte, tối đa {max}). Hãy rút gọn hoặc dùng link thay vì dán toàn bộ nội dung.',
  'qr.meta': '{bytes} / {max} byte · Mức sửa lỗi {ecl}',
  'qr.save': 'Lưu ảnh', 'qr.share': 'Chia sẻ', 'qr.copy': 'Sao chép',
  'qr.saved': 'Đã lưu ảnh mã QR', 'qr.downloaded': 'Đã tải ảnh mã QR', 'qr.copied': 'Đã sao chép nội dung',
  'qr.needPerm': 'Hãy cho phép app lưu ảnh vào Thư viện trong Cài đặt',
  'qr.saveFail': 'Không lưu được: {e}', 'qr.shareFail': 'Không chia sẻ được: {e}', 'qr.noShare': 'Thiết bị không hỗ trợ chia sẻ',
  'scan.permText': 'App cần quyền dùng camera để quét mã QR. Hình ảnh không được lưu hay gửi đi đâu.',
  'scan.allow': 'Cho phép dùng camera', 'scan.denied': 'Trình duyệt hoặc máy đang chặn camera. Bạn vẫn có thể quét mã từ ảnh.',
  'scan.fromImage': 'Quét từ ảnh trong máy', 'scan.notFound': 'Không tìm thấy mã QR trong ảnh. Hãy thử ảnh rõ nét hơn.',
  'scan.readFail': 'Không đọc được ảnh', 'scan.linkWarn': 'Kiểm tra kỹ đường link trước khi mở — mã QR lạ có thể dẫn tới trang lừa đảo.',
  'scan.open': 'Mở', 'scan.copy': 'Sao chép', 'scan.again': 'Quét mã khác', 'scan.copied': 'Đã sao chép',
  'scan.k.link': 'Đường link', 'scan.k.wifi': 'Wi‑Fi', 'scan.k.bank': 'Mã chuyển khoản VietQR', 'scan.k.contact': 'Danh bạ',
  'scan.k.email': 'Email', 'scan.k.phone': 'Số điện thoại', 'scan.k.sms': 'SMS', 'scan.k.text': 'Văn bản',
  'scan.f.link': 'Link', 'scan.f.ssid': 'Tên mạng', 'scan.f.password': 'Mật khẩu', 'scan.f.none': '(không có)', 'scan.f.security': 'Bảo mật',
  'scan.f.bank': 'Ngân hàng', 'scan.f.account': 'Số tài khoản', 'scan.f.amount': 'Số tiền', 'scan.f.name': 'Tên', 'scan.f.phone': 'Điện thoại',
  'scan.f.to': 'Gửi đến', 'scan.f.number': 'Số', 'scan.f.message': 'Tin nhắn', 'scan.f.content': 'Nội dung',
  'hist.search': 'Tìm trong lịch sử…', 'hist.favOn': '★ Đang lọc yêu thích', 'hist.favOff': '☆ Chỉ hiện yêu thích',
  'hist.clear': 'Xóa tất cả', 'hist.clearConfirm': 'Bấm lần nữa để xóa (giữ mục gắn sao)', 'hist.cleared': 'Đã xóa lịch sử',
  'hist.none': 'Không có kết quả.',
  'hist.empty': 'Chưa có mã nào. Mã QR sẽ được lưu ở đây khi bạn bấm Lưu ảnh hoặc Chia sẻ.\nLịch sử chỉ nằm trên máy của bạn.',
  'hist.star': 'Gắn sao', 'hist.delete': 'Xóa',
  'about.version': 'Phiên bản {v}',
  'about.intro': 'Công cụ tạo mã QR miễn phí vĩnh viễn, dành cho cộng đồng.',
  'about.points': 'Không quảng cáo\nKhông thu phí, không giới hạn số lượng\nMã QR tĩnh — không bao giờ “hết hạn”\nKhông đăng ký tài khoản, không theo dõi người dùng\nLịch sử chỉ lưu trên máy của bạn',
  'about.install': 'Dùng như app',
  'about.installText': 'iPhone (Safari): bấm nút Chia sẻ → “Thêm vào MH chính”.\nAndroid (Chrome): bấm ⋮ → “Thêm vào màn hình chính”.',
  'about.donate': 'Ủng hộ tác giả', 'about.donateText': 'Nếu công cụ hữu ích, bạn có thể ủng hộ tùy tâm. Hoàn toàn tự nguyện — mọi tính năng vẫn miễn phí.',
  'about.copyAcc': 'Sao chép số tài khoản', 'about.donatePage': 'Trang ủng hộ',
  'about.contact': 'Liên hệ & góp ý', 'about.privacy': 'Chính sách bảo mật', 'about.by': 'Một công cụ miễn phí của {site}',
  'about.feedback': 'Góp ý {app}',
} as const;

export type Key = keyof typeof vi;

const en: Record<Key, string> = {
  'app.name': 'Free QR Code Maker',
  'app.tagline': 'Free · No ads · No sign-up',
  'tab.create': 'Create', 'tab.scan': 'Scan', 'tab.history': 'History', 'tab.about': 'About',
  'type.url': 'Link', 'type.file': 'Photo / File', 'type.text': 'Text', 'type.wifi': 'Wi‑Fi', 'type.bank': 'Bank transfer',
  'type.contact': 'Contact', 'type.email': 'Email', 'type.phone': 'Phone call', 'type.sms': 'SMS',
  'restored': 'Reopened from History: “{label}”. Edit any field to make a new code.',
  'url.label': 'Link',
  'text.label': 'Text', 'text.ph': 'Type any text…',
  'file.noteUpload': 'Pick a photo or file. It is uploaded and the QR code links to the download.',
  'file.note': 'A QR code holds only about 3 KB, so a photo or document cannot fit inside it.\nUpload the file to Google Drive, OneDrive or Dropbox, set sharing to “Anyone with the link”, copy the link and paste it below.',
  'file.pickImage': 'Pick photo / video', 'file.pickDoc': 'Pick file', 'file.uploading': 'Uploading {name}…',
  'file.link': 'File link', 'file.name': 'Display name (optional)', 'file.namePh': 'e.g. Our menu',
  'file.uploadError': 'Upload failed',
  'wifi.ssid': 'Network name (SSID)', 'wifi.security': 'Security', 'wifi.nopass': 'No password', 'wifi.password': 'Password', 'wifi.hidden': 'Hidden network',
  'bank.note': 'Makes a VietQR code that every Vietnamese banking and e-wallet app can scan.',
  'bank.bank': 'Bank', 'bank.search': 'Search: Vietcombank, MB, ACB…', 'bank.account': 'Account number',
  'bank.name': 'Account holder (optional, shown under the code)', 'bank.amount': 'Amount (VND, optional)',
  'bank.amountHint': 'Leave empty to let the payer type the amount', 'bank.msg': 'Transfer note (optional)', 'bank.msgHint': 'Accents are removed, up to 50 characters',
  'contact.last': 'Last name', 'contact.first': 'First name', 'contact.phone': 'Phone', 'contact.email': 'Email', 'contact.org': 'Company',
  'contact.title': 'Job title', 'contact.website': 'Website', 'contact.address': 'Address',
  'email.to': 'To', 'email.subject': 'Subject', 'email.body': 'Message',
  'phone.label': 'Phone number', 'sms.msg': 'Message',
  'style.title': 'Customize', 'style.open': 'Open', 'style.close': 'Close', 'style.fg': 'Code color', 'style.bg': 'Background',
  'style.contrast': 'Keep the code clearly darker than the background, or many phones will not scan it.',
  'style.logo': 'Logo in the middle', 'style.pickLogo': 'Add logo', 'style.changeLogo': 'Change logo', 'style.removeLogo': 'Remove logo',
  'style.caption': 'Caption under the code (optional)', 'style.captionPh': 'e.g. Scan for our menu', 'style.reset': 'Reset to default',
  'style.color': 'Color {c}',
  'qr.empty': 'Type something to make a QR code',
  'qr.tooBig': 'Too long ({bytes} bytes, max {max}). Shorten it, or use a link instead of the full content.',
  'qr.meta': '{bytes} / {max} bytes · Error correction {ecl}',
  'qr.save': 'Save', 'qr.share': 'Share', 'qr.copy': 'Copy',
  'qr.saved': 'QR code saved to Photos', 'qr.downloaded': 'QR code image downloaded', 'qr.copied': 'Content copied',
  'qr.needPerm': 'Allow saving to Photos in Settings',
  'qr.saveFail': 'Could not save: {e}', 'qr.shareFail': 'Could not share: {e}', 'qr.noShare': 'Sharing is not available on this device',
  'scan.permText': 'Camera access is needed to scan QR codes. Nothing is recorded or sent anywhere.',
  'scan.allow': 'Allow camera', 'scan.denied': 'The camera is blocked by your browser or phone. You can still scan from a photo.',
  'scan.fromImage': 'Scan from a photo', 'scan.notFound': 'No QR code found in that photo. Try a sharper one.',
  'scan.readFail': 'Could not read the photo', 'scan.linkWarn': 'Check the link before opening it. Unknown QR codes can lead to scam sites.',
  'scan.open': 'Open', 'scan.copy': 'Copy', 'scan.again': 'Scan another', 'scan.copied': 'Copied',
  'scan.k.link': 'Link', 'scan.k.wifi': 'Wi‑Fi', 'scan.k.bank': 'VietQR bank transfer', 'scan.k.contact': 'Contact',
  'scan.k.email': 'Email', 'scan.k.phone': 'Phone number', 'scan.k.sms': 'SMS', 'scan.k.text': 'Text',
  'scan.f.link': 'Link', 'scan.f.ssid': 'Network', 'scan.f.password': 'Password', 'scan.f.none': '(none)', 'scan.f.security': 'Security',
  'scan.f.bank': 'Bank', 'scan.f.account': 'Account number', 'scan.f.amount': 'Amount', 'scan.f.name': 'Name', 'scan.f.phone': 'Phone',
  'scan.f.to': 'To', 'scan.f.number': 'Number', 'scan.f.message': 'Message', 'scan.f.content': 'Content',
  'hist.search': 'Search history…', 'hist.favOn': '★ Showing starred', 'hist.favOff': '☆ Starred only',
  'hist.clear': 'Clear all', 'hist.clearConfirm': 'Tap again to clear (starred items stay)', 'hist.cleared': 'History cleared',
  'hist.none': 'No matches.',
  'hist.empty': 'No codes yet. A QR code is kept here when you save or share it.\nHistory stays on this device only.',
  'hist.star': 'Star', 'hist.delete': 'Delete',
  'about.version': 'Version {v}',
  'about.intro': 'A QR code maker that stays free, for everyone.',
  'about.points': 'No ads\nNo fees, no limits\nStatic QR codes that never expire\nNo account, no tracking\nHistory stays on your device',
  'about.install': 'Use it like an app',
  'about.installText': 'iPhone (Safari): tap Share → “Add to Home Screen”.\nAndroid (Chrome): tap ⋮ → “Add to Home screen”.',
  'about.donate': 'Support this tool', 'about.donateText': 'If this tool helps you, you can chip in. It is optional and every feature stays free.',
  'about.copyAcc': 'Copy account number', 'about.donatePage': 'Support page',
  'about.contact': 'Contact & feedback', 'about.privacy': 'Privacy', 'about.by': 'A free tool by {site}',
  'about.feedback': 'Feedback on {app}',
};

const DICT: Record<Lang, Record<Key, string>> = { vi, en };
const KEY = 'qr-lang';

function detect(): Lang {
  if (Platform.OS === 'web' && typeof location !== 'undefined') {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'vi' || q === 'en') return q;
  }
  let loc = 'en';
  try {
    loc = (typeof navigator !== 'undefined' && (navigator as any).language) || Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {}
  return loc.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key, vars?: Record<string, string | number>) => string };
const LangCtx = createContext<Ctx>(null as any);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);
  useEffect(() => {
    const fromUrl = Platform.OS === 'web' && typeof location !== 'undefined' && new URLSearchParams(location.search).get('lang');
    if (fromUrl) return;
    AsyncStorage.getItem(KEY).then((v) => { if (v === 'vi' || v === 'en') setLangState(v); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.title = lang === 'vi' ? 'Tạo mã QR miễn phí, không quảng cáo · HCMC Insider' : 'Free QR Code Maker, No Ads · HCMC Insider';
    }
  }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); AsyncStorage.setItem(KEY, l).catch(() => {}); };
  const t = (k: Key, vars?: Record<string, string | number>) =>
    DICT[lang][k].replace(/\{(\w+)\}/g, (_, n) => String(vars?.[n] ?? ''));
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export const useT = () => useContext(LangCtx);

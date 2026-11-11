// Các hàm tạo nội dung (payload) chuẩn cho mã QR.

export type QRType = 'url' | 'text' | 'wifi' | 'contact' | 'email' | 'phone' | 'sms' | 'bank' | 'file';

export function normalizeUrl(input: string): string {
  const s = input.trim();
  if (!s) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s; // đã có scheme (https:, mailto:, ...)
  return 'https://' + s;
}

// Wi-Fi: ký tự đặc biệt \ ; , : " phải được escape.
const escWifi = (s: string) => s.replace(/([\;,:"])/g, '\\$1');

export function wifiPayload(o: { ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass'; hidden: boolean }) {
  if (!o.ssid.trim()) return '';
  const p = o.security === 'nopass' ? '' : `P:${escWifi(o.password)};`;
  return `WIFI:T:${o.security};S:${escWifi(o.ssid)};${p}${o.hidden ? 'H:true;' : ''};`;
}

const escV = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

export function vcardPayload(o: {
  firstName: string; lastName: string; phone: string; email: string;
  org: string; title: string; website: string; address: string; note: string;
}) {
  if (!o.firstName.trim() && !o.lastName.trim() && !o.phone.trim()) return '';
  const full = [o.lastName, o.firstName].map((x) => x.trim()).filter(Boolean).join(' ');
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${escV(o.lastName)};${escV(o.firstName)};;;`, `FN:${escV(full || o.phone)}`];
  if (o.org.trim()) lines.push(`ORG:${escV(o.org)}`);
  if (o.title.trim()) lines.push(`TITLE:${escV(o.title)}`);
  if (o.phone.trim()) lines.push(`TEL;TYPE=CELL:${o.phone.trim()}`);
  if (o.email.trim()) lines.push(`EMAIL:${o.email.trim()}`);
  if (o.website.trim()) lines.push(`URL:${normalizeUrl(o.website)}`);
  if (o.address.trim()) lines.push(`ADR:;;${escV(o.address)};;;;`);
  if (o.note.trim()) lines.push(`NOTE:${escV(o.note)}`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

export function emailPayload(o: { to: string; subject: string; body: string }) {
  if (!o.to.trim()) return '';
  const q: string[] = [];
  if (o.subject.trim()) q.push('subject=' + encodeURIComponent(o.subject));
  if (o.body.trim()) q.push('body=' + encodeURIComponent(o.body));
  return `mailto:${o.to.trim()}${q.length ? '?' + q.join('&') : ''}`;
}

export const phonePayload = (n: string) => (n.trim() ? `tel:${n.replace(/[^\d+]/g, '')}` : '');

export const smsPayload = (o: { phone: string; message: string }) =>
  o.phone.trim() ? `SMSTO:${o.phone.replace(/[^\d+]/g, '')}:${o.message}` : '';

// ---------- VietQR (chuẩn EMVCo / NAPAS 247) ----------

const tlv = (id: string, value: string) => id + String(value.length).padStart(2, '0') + value;

export function crc16ccitt(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Bỏ dấu tiếng Việt — nhiều app ngân hàng không hiển thị đúng nội dung có dấu. */
export function removeDiacritics(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

export function vietQRPayload(o: { bin: string; account: string; amount?: string; message?: string }) {
  const account = o.account.replace(/\s/g, '');
  if (!o.bin || !account) return '';
  const amount = (o.amount || '').replace(/\D/g, '').replace(/^0+/, '');
  const msg = removeDiacritics(o.message || '').replace(/[^A-Za-z0-9 .,\-_/]/g, '').slice(0, 50).trim();

  const beneficiary = tlv('00', o.bin) + tlv('01', account);
  const merchant = tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA');

  let s = tlv('00', '01') + tlv('01', amount ? '12' : '11') + tlv('38', merchant) + tlv('53', '704');
  if (amount) s += tlv('54', amount);
  s += tlv('58', 'VN');
  if (msg) s += tlv('62', tlv('08', msg));
  s += '6304';
  return s + crc16ccitt(s);
}

/** Số byte UTF-8 của chuỗi (để cảnh báo dung lượng QR). */
export function utf8Bytes(s: string) {
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
}

// Dung lượng tối đa ở chế độ byte (QR version 40).
export const MAX_BYTES = { L: 2953, M: 2331, Q: 1663, H: 1273 } as const;

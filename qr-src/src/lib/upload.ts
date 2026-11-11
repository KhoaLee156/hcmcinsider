import { UPLOAD } from '../config';

export const uploadEnabled = () => !!(UPLOAD.supabaseUrl && UPLOAD.supabaseAnonKey);

export type PickedFile = { uri: string; name: string; mimeType?: string | null; size?: number | null };

/** Tải tệp lên Supabase Storage (bucket công khai) và trả về link công khai. */
export async function uploadFile(file: PickedFile): Promise<string> {
  if (!uploadEnabled()) throw new Error('Chưa cấu hình máy chủ lưu tệp.');
  if (file.size && file.size > UPLOAD.maxSizeMB * 1024 * 1024) {
    throw new Error(`Tệp quá lớn (tối đa ${UPLOAD.maxSizeMB} MB).`);
  }
  const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(-80);
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${rand}-${safe || 'file'}`;
  const base = UPLOAD.supabaseUrl.replace(/\/$/, '');

  const blob = await (await fetch(file.uri)).blob();
  const res = await fetch(`${base}/storage/v1/object/${UPLOAD.bucket}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPLOAD.supabaseAnonKey}`,
      apikey: UPLOAD.supabaseAnonKey,
      'Content-Type': file.mimeType || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: blob,
  });
  if (!res.ok) throw new Error(`Tải lên thất bại (${res.status}). ${await res.text().catch(() => '')}`.trim());
  return `${base}/storage/v1/object/public/${UPLOAD.bucket}/${path}`;
}

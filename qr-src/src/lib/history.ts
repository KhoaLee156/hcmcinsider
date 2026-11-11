import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QRType } from './payload';

export type Style = { fg: string; bg: string; logo?: string | null };
export type HistoryItem = {
  id: string;
  type: QRType;
  label: string;
  payload: string;
  style: Style;
  createdAt: number;
  favorite?: boolean;
};

const KEY = 'qr-history-v1';
const LIMIT = 300;

export async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

async function save(items: HistoryItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items.slice(0, LIMIT)));
}

export async function addHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>) {
  const items = await loadHistory();
  // Gộp nếu cùng nội dung: đưa lên đầu, giữ trạng thái yêu thích.
  const old = items.find((i) => i.payload === item.payload);
  const rest = items.filter((i) => i.payload !== item.payload);
  const next: HistoryItem = {
    ...item,
    favorite: old?.favorite,
    id: old?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  await save([next, ...rest]);
}

export async function removeHistory(id: string) {
  await save((await loadHistory()).filter((i) => i.id !== id));
}

export async function toggleFavorite(id: string) {
  await save((await loadHistory()).map((i) => (i.id === id ? { ...i, favorite: !i.favorite } : i)));
}

export async function clearHistory(keepFavorites: boolean) {
  await save(keepFavorites ? (await loadHistory()).filter((i) => i.favorite) : []);
}

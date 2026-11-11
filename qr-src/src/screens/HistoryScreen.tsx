import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { clearHistory, HistoryItem, loadHistory, removeHistory, toggleFavorite } from '../lib/history';
import { Field, s } from '../components/ui';
import { useToast } from '../components/Toast';
import { C } from '../theme';
import { typeKey } from './CreateScreen';
import { useT } from '../i18n';

export default function HistoryScreen({ active, onOpen }: { active: boolean; onOpen: (i: HistoryItem) => void }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [q, setQ] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { t, lang } = useT();
  const toast = useToast();

  const refresh = useCallback(() => { loadHistory().then(setItems); }, []);
  useEffect(() => { if (active) refresh(); else setConfirming(false); }, [active, refresh]);

  const shown = items.filter((i) => (!favOnly || i.favorite) && (!q || (i.label + i.payload).toLowerCase().includes(q.toLowerCase())));

  function onClear() {
    if (!confirming) { setConfirming(true); setTimeout(() => setConfirming(false), 4000); return; }
    setConfirming(false);
    clearHistory(true).then(refresh).then(() => toast(t('hist.cleared')));
  }

  return (
    <FlatList
      contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}
      data={shown}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={
        <View>
          <Field value={q} onChangeText={setQ} placeholder={t('hist.search')} />
          <View style={[s.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
            <Pressable onPress={() => setFavOnly(!favOnly)} accessibilityRole="button">
              <Text style={{ color: C.primary, fontWeight: '600' }}>{favOnly ? t('hist.favOn') : t('hist.favOff')}</Text>
            </Pressable>
            {items.length > 0 && (
              <Pressable onPress={onClear} accessibilityRole="button">
                <Text style={{ color: C.danger, fontWeight: '600' }}>{confirming ? t('hist.clearConfirm') : t('hist.clear')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={[s.hint, { textAlign: 'center', marginTop: 40 }]}>{items.length ? t('hist.none') : t('hist.empty')}</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => onOpen(item)} style={({ pressed }) => [s.card, { padding: 12, marginBottom: 10, opacity: pressed ? 0.7 : 1 }]}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.hint}>{t(typeKey(item.type))} · {new Date(item.createdAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB')}</Text>
              <Text style={[s.p, { fontWeight: '600' }]} numberOfLines={2}>{item.label || item.payload}</Text>
            </View>
            <Pressable hitSlop={10} onPress={() => toggleFavorite(item.id).then(refresh)} accessibilityLabel={t('hist.star')}>
              <Text style={{ fontSize: 22, color: item.favorite ? C.amber : C.line, paddingHorizontal: 8 }}>★</Text>
            </Pressable>
            <Pressable hitSlop={10} onPress={() => removeHistory(item.id).then(refresh)} accessibilityLabel={t('hist.delete')}>
              <Text style={{ fontSize: 18, color: C.sub, paddingHorizontal: 6 }}>✕</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    />
  );
}

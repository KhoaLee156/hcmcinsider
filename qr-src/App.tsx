import React, { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CreateScreen from './src/screens/CreateScreen';
import ScanScreen from './src/screens/ScanScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AboutScreen from './src/screens/AboutScreen';
import Icon, { IconName } from './src/components/Icon';
import { ToastProvider } from './src/components/Toast';
import { C } from './src/theme';
import { HOME } from './src/config';
import { Key, Lang, LangProvider, useT } from './src/i18n';
import type { HistoryItem } from './src/lib/history';

type Tab = 'create' | 'scan' | 'history' | 'about';
const TABS: { key: Tab; icon: IconName; label: Key }[] = [
  { key: 'create', icon: 'create', label: 'tab.create' },
  { key: 'scan', icon: 'scan', label: 'tab.scan' },
  { key: 'history', icon: 'history', label: 'tab.history' },
  { key: 'about', icon: 'about', label: 'tab.about' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <LangProvider>
        <ToastProvider>
          <Main />
        </ToastProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}

function LangSwitch() {
  const { lang, setLang } = useT();
  const opt = (l: Lang, label: string) => (
    <Pressable
      key={l}
      onPress={() => setLang(l)}
      accessibilityRole="button"
      accessibilityState={{ selected: lang === l }}
      accessibilityLabel={l === 'vi' ? 'Tiếng Việt' : 'English'}
      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: lang === l ? C.ink : 'transparent' }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: lang === l ? '#fff' : C.sub }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: C.line, borderRadius: 999, padding: 2, backgroundColor: C.card }}>
      {opt('en', 'EN')}
      {opt('vi', 'VI')}
    </View>
  );
}

function Main() {
  const [tab, setTab] = useState<Tab>('create');
  const [opened, setOpened] = useState<HistoryItem | null>(null);
  const { t } = useT();
  const show = (k: Tab) => ({ flex: 1, display: tab === k ? ('flex' as const) : ('none' as const) });

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <View style={{ flex: 1 }}>
            {Platform.OS === 'web' && HOME.url ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}
                onPress={() => Linking.openURL(HOME.url)} accessibilityRole="link">
                ← {HOME.label}
              </Text>
            ) : null}
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }} accessibilityRole="header">{t('app.name')}</Text>
            <Text style={{ fontSize: 13, color: C.sub }}>{t('app.tagline')}</Text>
          </View>
          <LangSwitch />
        </View>
        {/* Screens stay mounted so typed input survives tab switches */}
        <View style={show('create')}><CreateScreen initial={opened} /></View>
        <View style={show('scan')}><ScanScreen active={tab === 'scan'} /></View>
        <View style={show('history')}>
          <HistoryScreen active={tab === 'history'} onOpen={(i) => { setOpened({ ...i }); setTab('create'); }} />
        </View>
        <View style={show('about')}><AboutScreen /></View>
      </SafeAreaView>
      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line }}>
        <View style={{ flexDirection: 'row', maxWidth: 640, width: '100%', alignSelf: 'center' }} accessibilityRole="tablist">
          {TABS.map((tb) => {
            const on = tab === tb.key;
            return (
              <Pressable key={tb.key} onPress={() => setTab(tb.key)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
                accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <Icon name={tb.icon} color={on ? C.primary : C.sub} />
                <Text style={{ fontSize: 12, marginTop: 2, color: on ? C.primary : C.sub, fontWeight: on ? '700' : '500' }}>{t(tb.label)}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </>
  );
}

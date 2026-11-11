import React, { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Button, Card, Note, s } from '../components/ui';
import { useToast } from '../components/Toast';
import { C } from '../theme';
import { BANKS } from '../lib/banks';
import { Key, useT } from '../i18n';

type T = (k: Key) => string;
type Parsed = { kind: string; lines: [string, string][]; openUrl?: string };

const unescWifi = (s: string) => s.replace(/\\([\;,:"])/g, '$1');

export function parseScan(data: string, t: T): Parsed {
  if (/^https?:\/\//i.test(data)) return { kind: t('scan.k.link'), lines: [[t('scan.f.link'), data]], openUrl: data };
  if (/^WIFI:/i.test(data)) {
    const get = (k: string) => { const m = data.match(new RegExp(`[:;]${k}:((?:\\\\.|[^;])*)`)); return m ? unescWifi(m[1]) : ''; };
    return { kind: t('scan.k.wifi'), lines: [[t('scan.f.ssid'), get('S')], [t('scan.f.password'), get('P') || t('scan.f.none')], [t('scan.f.security'), get('T') || 'nopass']] };
  }
  if (/^000201/.test(data) && data.includes('A000000727')) {
    const bin = data.match(/0006(\d{6})01(\d{2})/);
    const acc = bin ? data.substr(data.indexOf(bin[0]) + bin[0].length, Number(bin[2])) : '';
    const bank = BANKS.find((b) => b.bin === bin?.[1]);
    const lines: [string, string][] = [[t('scan.f.bank'), bank?.short ?? bin?.[1] ?? '?'], [t('scan.f.account'), acc]];
    const i = data.indexOf('5303704') + 7;
    if (i > 6 && data.substr(i, 2) === '54') {
      lines.push([t('scan.f.amount'), Number(data.substr(i + 4, Number(data.substr(i + 2, 2)))).toLocaleString('vi-VN') + ' ₫']);
    }
    return { kind: t('scan.k.bank'), lines };
  }
  if (/^BEGIN:VCARD/i.test(data)) {
    const fn = data.match(/\nFN:(.*)/)?.[1] ?? '';
    const tel = data.match(/\nTEL[^:]*:(.*)/)?.[1] ?? '';
    return { kind: t('scan.k.contact'), lines: [[t('scan.f.name'), fn], [t('scan.f.phone'), tel]] };
  }
  if (/^mailto:/i.test(data)) return { kind: t('scan.k.email'), lines: [[t('scan.f.to'), data.slice(7).split('?')[0]]], openUrl: data };
  if (/^tel:/i.test(data)) return { kind: t('scan.k.phone'), lines: [[t('scan.f.number'), data.slice(4)]], openUrl: data };
  if (/^SMSTO:/i.test(data)) {
    const [, p, ...m] = data.split(':');
    return { kind: t('scan.k.sms'), lines: [[t('scan.f.number'), p], [t('scan.f.message'), m.join(':')]], openUrl: `sms:${p}` };
  }
  return { kind: t('scan.k.text'), lines: [[t('scan.f.content'), data]] };
}

export default function ScanScreen({ active }: { active: boolean }) {
  const [perm, requestPerm] = useCameraPermissions();
  const [result, setResult] = useState<string | null>(null);
  const { t } = useT();
  const toast = useToast();

  async function scanImage() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (r.canceled) return;
    try {
      const found = await scanFromURLAsync(r.assets[0].uri, ['qr']);
      if (found.length) setResult(found[0].data);
      else toast(t('scan.notFound'), 'error');
    } catch (e: any) {
      toast(t('scan.readFail') + ': ' + String(e?.message ?? e), 'error');
    }
  }

  const parsed = result ? parseScan(result, t) : null;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
      {!parsed && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {!perm ? null : perm.granted ? (
            active ? (
              <CameraView
                style={{ width: '100%', aspectRatio: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={(e) => setResult(e.data)}
              />
            ) : <View style={{ aspectRatio: 1 }} />
          ) : (
            <View style={{ padding: 20 }}>
              <Text style={[s.p, { marginBottom: 12 }]}>{perm.canAskAgain ? t('scan.permText') : t('scan.denied')}</Text>
              {perm.canAskAgain && <Button title={t('scan.allow')} onPress={requestPerm} />}
            </View>
          )}
        </Card>
      )}

      {parsed && result && (
        <Card>
          <Text style={[s.label, { color: C.primary }]}>{parsed.kind}</Text>
          {parsed.lines.map(([k, v]) => (
            <View key={k} style={{ marginBottom: 10 }}>
              <Text style={s.hint}>{k}</Text>
              <Text style={[s.p, { fontSize: 16 }]} selectable>{v}</Text>
            </View>
          ))}
          {parsed.openUrl && /^https?:/i.test(parsed.openUrl) && <Note tone="warn">{t('scan.linkWarn')}</Note>}
          <View style={{ gap: 8 }}>
            {parsed.openUrl && <Button title={t('scan.open')} onPress={() => Linking.openURL(parsed.openUrl!).catch(() => {})} />}
            <Button title={t('scan.copy')} kind="secondary" onPress={async () => { await Clipboard.setStringAsync(result); toast(t('scan.copied')); }} />
            <Button title={t('scan.again')} kind="secondary" onPress={() => setResult(null)} />
          </View>
        </Card>
      )}

      {!parsed && <Button title={t('scan.fromImage')} kind="secondary" onPress={scanImage} />}
    </ScrollView>
  );
}

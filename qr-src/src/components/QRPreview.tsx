import React, { useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { Button, s } from './ui';
import { useToast } from './Toast';
import { C } from '../theme';
import { useT } from '../i18n';
import { MAX_BYTES, utf8Bytes } from '../lib/payload';
import { download, fileName, qrPng, shareOrDownload } from '../lib/webExport';
import type { Style } from '../lib/history';

type Props = { value: string; style: Style; caption?: string; size?: number; onExported?: () => void };

export const eclFor = (style: Style) => (style.logo ? 'H' : 'M') as 'H' | 'M';

export default function QRPreview({ value, style, caption, size = 240, onExported }: Props) {
  const shotRef = useRef<any>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useT();
  const toast = useToast();
  const ecl = eclFor(style);
  const bytes = utf8Bytes(value);
  const tooBig = bytes > MAX_BYTES[ecl];

  if (!value) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <View style={{ width: size * 0.6, height: size * 0.6, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: C.line }} />
        <Text style={[s.hint, { marginTop: 12 }]}>{t('qr.empty')}</Text>
      </View>
    );
  }
  if (tooBig) {
    return <Text style={{ color: C.danger, textAlign: 'center', padding: 24 }}>{t('qr.tooBig', { bytes, max: MAX_BYTES[ecl] })}</Text>;
  }

  const capture = () => captureRef(shotRef, { format: 'png', quality: 1, width: 1024, result: 'tmpfile' });
  const webPng = () => qrPng(shotRef.current as HTMLElement, { fg: style.fg, bg: style.bg, caption });

  async function onSave() {
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        download(await webPng(), fileName(caption));
        toast(t('qr.downloaded'));
      } else {
        const perm = await requestPermissionsAsync(true);
        if (!perm.granted) return toast(t('qr.needPerm'), 'error');
        await Asset.create(await capture());
        toast(t('qr.saved'));
      }
      onExported?.();
    } catch (e: any) {
      toast(t('qr.saveFail', { e: String(e?.message ?? e) }), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        const shared = await shareOrDownload(await webPng(), fileName(caption));
        if (!shared) toast(t('qr.downloaded'));
      } else {
        if (!(await Sharing.isAvailableAsync())) throw new Error(t('qr.noShare'));
        await Sharing.shareAsync(await capture(), { mimeType: 'image/png', UTI: 'public.png' });
      }
      onExported?.();
    } catch (e: any) {
      toast(t('qr.shareFail', { e: String(e?.message ?? e) }), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    await Clipboard.setStringAsync(value);
    toast(t('qr.copied'));
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        ref={shotRef}
        collapsable={false}
        {...({ dataSet: { qr: '1' } } as object)}
        style={{ backgroundColor: style.bg, padding: 16, borderRadius: 12, alignItems: 'center' }}
      >
        <QRCode
          value={value}
          size={size}
          color={style.fg}
          backgroundColor={style.bg}
          ecl={ecl}
          logo={style.logo ? { uri: style.logo } : undefined}
          logoSize={size * 0.22}
          logoBackgroundColor={style.bg}
          logoMargin={4}
          logoBorderRadius={8}
          quietZone={4}
        />
        {caption ? (
          <Text style={{ color: style.fg, marginTop: 10, fontSize: 15, fontWeight: '700', maxWidth: size, textAlign: 'center' }} numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
      </View>
      <Text style={[s.hint, { marginTop: 8 }]}>{t('qr.meta', { bytes, max: MAX_BYTES[ecl], ecl })}</Text>
      <View style={[s.row, { marginTop: 12, gap: 8, alignSelf: 'stretch' }]}>
        <Button title={t('qr.save')} onPress={onSave} disabled={busy} style={{ flex: 1 }} />
        <Button title={t('qr.share')} kind="secondary" onPress={onShare} disabled={busy} style={{ flex: 1 }} />
        <Button title={t('qr.copy')} kind="secondary" onPress={onCopy} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

import React from 'react';
import { Linking, Platform, ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Button, Card, s } from '../components/ui';
import { useToast } from '../components/Toast';
import { APP_VERSION, CONTACT_EMAIL, DONATE, HOME, PRIVACY_URL } from '../config';
import { BANKS } from '../lib/banks';
import { vietQRPayload } from '../lib/payload';
import { C } from '../theme';
import { useT } from '../i18n';

export default function AboutScreen() {
  const { t } = useT();
  const toast = useToast();
  const donatePayload = DONATE.bankBin && DONATE.bankAccount
    ? vietQRPayload({ bin: DONATE.bankBin, account: DONATE.bankAccount, message: DONATE.message })
    : '';
  const bank = BANKS.find((b) => b.bin === DONATE.bankBin);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
      <Card>
        <Text style={s.h1}>{t('app.name')}</Text>
        <Text style={[s.hint, { marginBottom: 12 }]}>{t('about.version', { v: APP_VERSION })}</Text>
        <Text style={[s.p, { marginBottom: 10 }]}>{t('about.intro')}</Text>
        {t('about.points').split('\n').map((line) => (
          <View key={line} style={[s.row, { alignItems: 'flex-start', marginBottom: 6 }]}>
            <Text style={{ color: C.primary, fontWeight: '800', width: 22 }}>✓</Text>
            <Text style={[s.p, { flex: 1 }]}>{line}</Text>
          </View>
        ))}
      </Card>

      {Platform.OS === 'web' && (
        <Card>
          <Text style={s.h2}>{t('about.install')}</Text>
          <Text style={s.p}>{t('about.installText')}</Text>
        </Card>
      )}

      {DONATE.enabled && (donatePayload || DONATE.link) ? (
        <Card>
          <Text style={s.h2}>{t('about.donate')}</Text>
          <Text style={[s.p, { marginBottom: 12 }]}>{t('about.donateText')}</Text>
          {donatePayload ? (
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}>
                <QRCode value={donatePayload} size={200} ecl="M" />
              </View>
              <Text style={[s.p, { marginTop: 8, fontWeight: '600' }]}>{bank?.short} · {DONATE.bankAccount}</Text>
              {DONATE.accountName ? <Text style={s.hint}>{DONATE.accountName}</Text> : null}
              <Button title={t('about.copyAcc')} kind="secondary" style={{ marginTop: 10, alignSelf: 'stretch' }}
                onPress={async () => { await Clipboard.setStringAsync(DONATE.bankAccount); toast(t('scan.copied')); }} />
            </View>
          ) : null}
          {DONATE.link ? <Button title={t('about.donatePage')} onPress={() => Linking.openURL(DONATE.link)} /> : null}
        </Card>
      ) : null}

      <Card>
        <Text style={s.h2}>{t('about.contact')}</Text>
        {CONTACT_EMAIL ? (
          <Text style={[s.p, { marginBottom: 12 }]} selectable>
            <Text style={{ color: C.primary, fontWeight: '600' }}
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t('about.feedback', { app: t('app.name') }))}`).catch(() => {})}>
              {CONTACT_EMAIL}
            </Text>
          </Text>
        ) : null}
        <View style={{ gap: 8 }}>
          {PRIVACY_URL ? <Button title={t('about.privacy')} kind="secondary" onPress={() => Linking.openURL(PRIVACY_URL)} /> : null}
          {HOME.url ? <Button title={t('about.by', { site: HOME.label })} kind="secondary" onPress={() => Linking.openURL(HOME.url)} /> : null}
        </View>
      </Card>
    </ScrollView>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import QRPreview from '../components/QRPreview';
import { Button, Card, Chip, Field, Label, Note, s } from '../components/ui';
import { C } from '../theme';
import { BANKS } from '../lib/banks';
import { addHistory, HistoryItem, Style } from '../lib/history';
import {
  emailPayload, normalizeUrl, phonePayload, QRType, smsPayload, vcardPayload, vietQRPayload, wifiPayload,
} from '../lib/payload';
import { PickedFile, uploadEnabled, uploadFile } from '../lib/upload';
import { Key, useT } from '../i18n';
import { useToast } from '../components/Toast';

export const TYPES: QRType[] = ['url', 'file', 'text', 'wifi', 'bank', 'contact', 'email', 'phone', 'sms'];
export const typeKey = (k: QRType) => ('type.' + k) as Key;

const FG = ['#000000', '#1F2937', '#1F6FEB', '#0B6E4F', '#6A1B9A', '#B71C1C', '#E65100'];
const BG = ['#FFFFFF', '#FFF8E1', '#E8F5E9', '#E3F2FD', '#FCE4EC', '#F5F5F5'];
const isHex = (h: string) => /^#[0-9a-f]{6}$/i.test(h);

function luminance(hex: string) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

export default function CreateScreen({ initial }: { initial?: HistoryItem | null }) {
  const { t } = useT();
  const toast = useToast();
  const [type, setType] = useState<QRType>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [wifi, setWifi] = useState({ ssid: '', password: '', security: 'WPA' as 'WPA' | 'WEP' | 'nopass', hidden: false });
  const [contact, setContact] = useState({ firstName: '', lastName: '', phone: '', email: '', org: '', title: '', website: '', address: '', note: '' });
  const [email, setEmail] = useState({ to: '', subject: '', body: '' });
  const [phone, setPhone] = useState('');
  const [sms, setSms] = useState({ phone: '', message: '' });
  const [bank, setBank] = useState({ bin: '', account: '', name: '', amount: '', message: '' });
  const [bankQuery, setBankQuery] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const [style, setStyle] = useState<Style>({ fg: '#000000', bg: '#FFFFFF', logo: null });
  const [fgInput, setFgInput] = useState('#000000');
  const [bgInput, setBgInput] = useState('#FFFFFF');
  const [caption, setCaption] = useState('');
  const [showStyle, setShowStyle] = useState(false);

  // Mở lại từ Lịch sử: hiển thị đúng nội dung cũ.
  const [restored, setRestored] = useState<HistoryItem | null>(null);
  useEffect(() => {
    if (!initial) return;
    setRestored(initial);
    setType(initial.type);
    setStyle(initial.style);
    setFgInput(initial.style.fg);
    setBgInput(initial.style.bg);
  }, [initial]);

  const payload = useMemo(() => {
    if (restored && restored.type === type) return restored.payload;
    switch (type) {
      case 'url': return normalizeUrl(url);
      case 'text': return text;
      case 'wifi': return wifiPayload(wifi);
      case 'contact': return vcardPayload(contact);
      case 'email': return emailPayload(email);
      case 'phone': return phonePayload(phone);
      case 'sms': return smsPayload(sms);
      case 'bank': return vietQRPayload(bank);
      case 'file': return normalizeUrl(fileUrl);
    }
  }, [restored, type, url, text, wifi, contact, email, phone, sms, bank, fileUrl]);

  const edit = () => restored && setRestored(null); // người dùng sửa => thôi hiển thị bản cũ

  const label = useMemo(() => {
    switch (type) {
      case 'wifi': return `Wi‑Fi: ${wifi.ssid}`;
      case 'contact': return [contact.lastName, contact.firstName].join(' ').trim() || contact.phone;
      case 'bank': return `${BANKS.find((b) => b.bin === bank.bin)?.short ?? ''} ${bank.account}`.trim();
      case 'file': return fileName || payload;
      default: return payload.slice(0, 80);
    }
  }, [type, payload, wifi, contact, bank, fileName]);

  const onExported = () => {
    addHistory({ type, label: restored?.label ?? label, payload, style }).catch(() => {});
  };

  function applyColor(which: 'fg' | 'bg', hex: string) {
    which === 'fg' ? setFgInput(hex) : setBgInput(hex);
    if (isHex(hex)) setStyle((st) => ({ ...st, [which]: hex.toUpperCase() }));
  }

  async function pickLogo() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!r.canceled) setStyle((st) => ({ ...st, logo: r.assets[0].uri }));
  }

  async function handleFile(f: PickedFile) {
    setFileName(f.name);
    if (!uploadEnabled()) return;
    setUploading(true);
    try {
      setFileUrl(await uploadFile(f));
    } catch (e: any) {
      toast(t('file.uploadError') + ': ' + String(e?.message ?? e), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function pickImage() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.9 });
    if (r.canceled) return;
    const a = r.assets[0];
    handleFile({ uri: a.uri, name: a.fileName ?? `image-${Date.now()}.jpg`, mimeType: a.mimeType, size: a.fileSize });
  }

  async function pickDocument() {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (r.canceled) return;
    const a = r.assets[0];
    handleFile({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size });
  }

  const lowContrast = (() => {
    const a = luminance(style.fg), b = luminance(style.bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 3 || a > b;
  })();

  const banks = BANKS.filter((b) => {
    const q = bankQuery.trim().toLowerCase();
    return !q || b.short.toLowerCase().includes(q) || b.name.toLowerCase().includes(q);
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
        {TYPES.map((k) => (
          <Chip key={k} label={t(typeKey(k))} active={type === k} onPress={() => { setType(k); setRestored(null); }} />
        ))}
      </ScrollView>

      {restored ? (
        <Note>{t('restored', { label: restored.label })}</Note>
      ) : null}

      <Card>
        {type === 'url' && (
          <Field label={t('url.label')} value={url} onChangeText={(v) => { edit(); setUrl(v); }} placeholder="https://..." keyboardType="url" autoCapitalize="none" />
        )}

        {type === 'text' && (
          <Field label={t('text.label')} value={text} onChangeText={(v) => { edit(); setText(v); }} placeholder={t('text.ph')} multiline />
        )}

        {type === 'file' && (
          <View>
            {uploadEnabled() ? (
              <Note>{t('file.noteUpload')}</Note>
            ) : (
<Note>{t('file.note')}</Note>
            )}
            {uploadEnabled() && (
              <View style={[s.row, { gap: 8, marginBottom: 12 }]}>
                <Button title={t('file.pickImage')} kind="secondary" onPress={pickImage} style={{ flex: 1 }} disabled={uploading} />
                <Button title={t('file.pickDoc')} kind="secondary" onPress={pickDocument} style={{ flex: 1 }} disabled={uploading} />
              </View>
            )}
            {uploading && (
              <View style={[s.row, { marginBottom: 12 }]}>
                <ActivityIndicator color={C.primary} />
                <Text style={[s.hint, { marginLeft: 8, marginTop: 0 }]}>{t('file.uploading', { name: fileName })}</Text>
              </View>
            )}
            <Field label={t('file.link')} value={fileUrl} onChangeText={(v) => { edit(); setFileUrl(v); }} placeholder="https://drive.google.com/..." autoCapitalize="none" keyboardType="url" />
            <Field label={t('file.name')} value={fileName} onChangeText={setFileName} placeholder={t('file.namePh')} />
          </View>
        )}

        {type === 'wifi' && (
          <View>
            <Field label={t('wifi.ssid')} value={wifi.ssid} onChangeText={(v) => { edit(); setWifi({ ...wifi, ssid: v }); }} autoCapitalize="none" />
            <Label>{t('wifi.security')}</Label>
            <View style={[s.wrap, { marginBottom: 6 }]}>
              {(['WPA', 'WEP', 'nopass'] as const).map((k) => (
                <Chip key={k} label={k === 'nopass' ? t('wifi.nopass') : k === 'WPA' ? 'WPA/WPA2/WPA3' : 'WEP'} active={wifi.security === k} onPress={() => { edit(); setWifi({ ...wifi, security: k }); }} />
              ))}
            </View>
            {wifi.security !== 'nopass' && (
              <Field label={t('wifi.password')} value={wifi.password} onChangeText={(v) => { edit(); setWifi({ ...wifi, password: v }); }} autoCapitalize="none" />
            )}
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <Text style={s.p}>{t('wifi.hidden')}</Text>
              <Switch value={wifi.hidden} onValueChange={(v) => { edit(); setWifi({ ...wifi, hidden: v }); }} />
            </View>
          </View>
        )}

        {type === 'bank' && (
          <View>
            <Note>{t('bank.note')}</Note>
            <Field label={t('bank.bank')} value={bankQuery} onChangeText={setBankQuery} placeholder={t('bank.search')} />
            <View style={[s.wrap, { marginTop: -4, marginBottom: 8 }]}>
              {banks.slice(0, bankQuery ? 12 : 8).map((b) => (
                <Chip key={b.bin} label={b.short} active={bank.bin === b.bin} onPress={() => { edit(); setBank({ ...bank, bin: b.bin }); }} />
              ))}
              {bank.bin && !banks.slice(0, bankQuery ? 12 : 8).some((b) => b.bin === bank.bin) ? (
                <Chip label={BANKS.find((b) => b.bin === bank.bin)!.short} active onPress={() => {}} />
              ) : null}
            </View>
            <Field label={t('bank.account')} value={bank.account} onChangeText={(v) => { edit(); setBank({ ...bank, account: v }); }} keyboardType="number-pad" />
            <Field label={t('bank.name')} value={bank.name} onChangeText={(v) => setBank({ ...bank, name: v })} autoCapitalize="characters" />
            <Field label={t('bank.amount')} value={bank.amount} onChangeText={(v) => { edit(); setBank({ ...bank, amount: v.replace(/\D/g, '') }); }} keyboardType="number-pad"
              hint={bank.amount ? Number(bank.amount).toLocaleString('vi-VN') + ' ₫' : t('bank.amountHint')} />
            <Field label={t('bank.msg')} value={bank.message} onChangeText={(v) => { edit(); setBank({ ...bank, message: v }); }} hint={t('bank.msgHint')} />
          </View>
        )}

        {type === 'contact' && (
          <View>
            <View style={[s.row, { gap: 8 }]}>
              <View style={{ flex: 1 }}><Field label={t('contact.last')} value={contact.lastName} onChangeText={(v) => { edit(); setContact({ ...contact, lastName: v }); }} /></View>
              <View style={{ flex: 1 }}><Field label={t('contact.first')} value={contact.firstName} onChangeText={(v) => { edit(); setContact({ ...contact, firstName: v }); }} /></View>
            </View>
            <Field label={t('contact.phone')} value={contact.phone} onChangeText={(v) => { edit(); setContact({ ...contact, phone: v }); }} keyboardType="phone-pad" />
            <Field label={t('contact.email')} value={contact.email} onChangeText={(v) => { edit(); setContact({ ...contact, email: v }); }} keyboardType="email-address" autoCapitalize="none" />
            <Field label={t('contact.org')} value={contact.org} onChangeText={(v) => { edit(); setContact({ ...contact, org: v }); }} />
            <Field label={t('contact.title')} value={contact.title} onChangeText={(v) => { edit(); setContact({ ...contact, title: v }); }} />
            <Field label={t('contact.website')} value={contact.website} onChangeText={(v) => { edit(); setContact({ ...contact, website: v }); }} autoCapitalize="none" keyboardType="url" />
            <Field label={t('contact.address')} value={contact.address} onChangeText={(v) => { edit(); setContact({ ...contact, address: v }); }} />
          </View>
        )}

        {type === 'email' && (
          <View>
            <Field label={t('email.to')} value={email.to} onChangeText={(v) => { edit(); setEmail({ ...email, to: v }); }} keyboardType="email-address" autoCapitalize="none" />
            <Field label={t('email.subject')} value={email.subject} onChangeText={(v) => { edit(); setEmail({ ...email, subject: v }); }} />
            <Field label={t('email.body')} value={email.body} onChangeText={(v) => { edit(); setEmail({ ...email, body: v }); }} multiline />
          </View>
        )}

        {type === 'phone' && (
          <Field label={t('phone.label')} value={phone} onChangeText={(v) => { edit(); setPhone(v); }} keyboardType="phone-pad" placeholder="0901 234 567" />
        )}

        {type === 'sms' && (
          <View>
            <Field label={t('phone.label')} value={sms.phone} onChangeText={(v) => { edit(); setSms({ ...sms, phone: v }); }} keyboardType="phone-pad" />
            <Field label={t('sms.msg')} value={sms.message} onChangeText={(v) => { edit(); setSms({ ...sms, message: v }); }} multiline />
          </View>
        )}
      </Card>

      <Card>
        <QRPreview
          value={payload}
          style={style}
          caption={caption || (type === 'bank' && bank.name ? bank.name.toUpperCase() : '')}
          onExported={onExported}
        />
      </Card>

      <Card>
        <Pressable onPress={() => setShowStyle(!showStyle)} style={[s.row, { justifyContent: 'space-between' }]} accessibilityRole="button">
          <Text style={[s.h2, { marginBottom: 0 }]}>{t('style.title')}</Text>
          <Text style={{ color: C.primary, fontWeight: '600' }}>{showStyle ? t('style.close') : t('style.open')}</Text>
        </Pressable>
        {showStyle && (
          <View style={{ marginTop: 14 }}>
            <Label>{t('style.fg')}</Label>
            <ColorRow label={t('style.color')} colors={FG} value={style.fg} onPick={(c) => applyColor('fg', c)} />
            <Field value={fgInput} onChangeText={(v) => applyColor('fg', v)} autoCapitalize="characters" maxLength={7} />
            <Label>{t('style.bg')}</Label>
            <ColorRow label={t('style.color')} colors={BG} value={style.bg} onPick={(c) => applyColor('bg', c)} />
            <Field value={bgInput} onChangeText={(v) => applyColor('bg', v)} autoCapitalize="characters" maxLength={7} />
            {lowContrast && <Note tone="warn">{t('style.contrast')}</Note>}
            <Label>{t('style.logo')}</Label>
            <View style={[s.row, { gap: 8, marginBottom: 12 }]}>
              <Button title={style.logo ? t('style.changeLogo') : t('style.pickLogo')} kind="secondary" onPress={pickLogo} style={{ flex: 1 }} />
              {style.logo ? <Button title={t('style.removeLogo')} kind="danger" onPress={() => setStyle({ ...style, logo: null })} style={{ flex: 1 }} /> : null}
            </View>
            <Field label={t('style.caption')} value={caption} onChangeText={setCaption} placeholder={t('style.captionPh')} />
            <Button title={t('style.reset')} kind="secondary" onPress={() => { setStyle({ fg: '#000000', bg: '#FFFFFF', logo: null }); setFgInput('#000000'); setBgInput('#FFFFFF'); setCaption(''); }} />
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function ColorRow({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label: string }) {
  return (
    <View style={[s.wrap, { marginBottom: 8 }]}>
      {colors.map((c) => (
        <Pressable
          key={c}
          onPress={() => onPick(c)}
          accessibilityLabel={label.replace('{c}', c)}
          style={{
            width: 34, height: 34, borderRadius: 17, backgroundColor: c, marginRight: 10, marginBottom: 6,
            borderWidth: value.toUpperCase() === c.toUpperCase() ? 3 : 1,
            borderColor: value.toUpperCase() === c.toUpperCase() ? C.primary : C.line,
          }}
        />
      ))}
    </View>
  );
}

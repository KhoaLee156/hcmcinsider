import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { C, R } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Field(props: TextInputProps & { label?: string; hint?: string }) {
  const { label, hint, style, ...rest } = props;
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        placeholderTextColor="#9AA0AA"
        autoCorrect={false}
        {...rest}
        style={[s.input, rest.multiline && { minHeight: 90, textAlignVertical: 'top' }, style]}
      />
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[s.chip, active && s.chipActive]}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Button({
  title, onPress, kind = 'primary', disabled, style,
}: { title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        kind === 'secondary' && s.btnSecondary,
        kind === 'danger' && s.btnDanger,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.75 },
        style,
      ]}
    >
      <Text style={[s.btnText, kind === 'secondary' && { color: C.primary }, kind === 'danger' && { color: C.danger }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <View style={[s.note, tone === 'warn' && { backgroundColor: C.warnSoft }]}>
      <Text style={[s.noteText, tone === 'warn' && { color: C.warn }]}>{children}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.line },
  label: { fontSize: 14, fontWeight: '600', color: C.sub, marginBottom: 6 },
  hint: { fontSize: 12, color: C.sub, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, color: C.text, backgroundColor: C.card,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.line,
    backgroundColor: C.card, marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { color: C.text, fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  btn: { backgroundColor: C.primary, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center' },
  btnSecondary: { backgroundColor: C.primarySoft },
  btnDanger: { backgroundColor: C.dangerSoft },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  note: { backgroundColor: C.primarySoft, borderRadius: 12, padding: 12, marginBottom: 12 },
  noteText: { color: C.primaryInk, fontSize: 13, lineHeight: 19 },
  h1: { fontSize: 24, fontWeight: '700', color: C.text },
  h2: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 10 },
  p: { fontSize: 14, color: C.text, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});

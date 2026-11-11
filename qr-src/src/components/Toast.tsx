import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { C } from '../theme';

type Show = (msg: string, tone?: 'ok' | 'error') => void;
const ToastCtx = createContext<Show>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback<Show>((text, tone = 'ok') => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ text, tone });
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 96, alignItems: 'center' }}>
          <View
            accessibilityLiveRegion="polite"
            style={{ backgroundColor: msg.tone === 'error' ? C.danger : C.ink, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, maxWidth: 480 }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{msg.text}</Text>
          </View>
        </View>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

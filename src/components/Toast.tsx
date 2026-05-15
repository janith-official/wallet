import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export type ToastOptions = {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
};

const C = {
  bg: '#161619',
  border: '#2a2a2a',
  text: '#f0f0f5',
  sub: '#b0b0be',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#60a5fa',
};

function typeConfig(type: ToastType) {
  switch (type) {
    case 'error':
      return { color: C.error, icon: 'close-circle' as const };
    case 'success':
      return { color: C.success, icon: 'checkmark-circle' as const };
    case 'warning':
      return { color: C.warning, icon: 'warning' as const };
    case 'info':
      return { color: C.info, icon: 'information-circle' as const };
  }
}

// ── Imperative API ──────────────────────────────────────────────────────────
type ToastHandle = { show: (opts: ToastOptions) => void };
let _handle: ToastHandle | null = null;

export const toast = {
  show: (opts: ToastOptions) => _handle?.show(opts),
  error: (title: string, message?: string) => _handle?.show({ title, message, type: 'error' }),
  success: (title: string, message?: string) => _handle?.show({ title, message, type: 'success' }),
  warning: (title: string, message?: string) => _handle?.show({ title, message, type: 'warning' }),
  info: (title: string, message?: string) => _handle?.show({ title, message, type: 'info' }),
};

// ── Component ───────────────────────────────────────────────────────────────
export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<ToastOptions>({ title: '', type: 'info' });
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFn = useRef<((o: ToastOptions) => void) | undefined>(undefined);

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  showFn.current = (newOpts: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    setOpts(newOpts);
    setVisible(true);
    translateY.setValue(-120);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(hide, newOpts.duration ?? 3500);
  };

  useEffect(() => {
    _handle = { show: (o) => showFn.current?.(o) };
    return () => {
      _handle = null;
    };
  }, []);

  const cfg = typeConfig(opts.type ?? 'info');

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      {/* Full-screen pass-through layer — touches fall through to content beneath */}
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <Animated.View
          style={{
            position: 'absolute',
            top: insets.top + 12,
            left: 16,
            right: 16,
            transform: [{ translateY }],
            opacity,
          }}
        >
          <Pressable onPress={hide}>
            <View
              style={{
                backgroundColor: C.bg,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                borderLeftWidth: 4,
                borderLeftColor: cfg.color,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                shadowColor: '#000',
                shadowOpacity: 0.45,
                shadowOffset: { width: 0, height: 8 },
                shadowRadius: 20,
                elevation: 12,
              }}
            >
              <Ionicons name={cfg.icon} size={22} color={cfg.color} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{opts.title}</Text>
                {opts.message ? (
                  <Text style={{ fontSize: 13, color: C.sub, marginTop: 3, lineHeight: 18 }}>
                    {opts.message}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="close" size={16} color={C.sub} />
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

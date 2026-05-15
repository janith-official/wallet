import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import { useTheme } from '@/features/theme/ThemeContext';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

// ── Imperative API ──────────────────────────────────────────────────────────
type ConfirmHandle = { show: (opts: ConfirmOptions) => void };
let _handle: ConfirmHandle | null = null;

export const confirmDialog = {
  show: (opts: ConfirmOptions) => _handle?.show(opts),
};

// ── Component ───────────────────────────────────────────────────────────────
export function ConfirmDialogContainer() {
  const C = useTheme();
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ title: '', onConfirm: () => {} });
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const showFn = useRef<((o: ConfirmOptions) => void) | undefined>(undefined);

  showFn.current = (newOpts: ConfirmOptions) => {
    setOpts(newOpts);
    setVisible(true);
    scale.setValue(0.88);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 240, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    _handle = { show: (o) => showFn.current?.(o) };
    return () => {
      _handle = null;
    };
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.9, duration: 160, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  const handleCancel = () => {
    opts.onCancel?.();
    dismiss();
  };

  const handleConfirm = () => {
    opts.onConfirm();
    dismiss();
  };

  const confirmColor = opts.destructive ? C.expense : C.accent;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
      {/* Backdrop */}
      <Pressable
        onPress={handleCancel}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', padding: 32 }}
      >
        <Animated.View
          style={{ width: '100%', transform: [{ scale }], opacity }}
        >
          <Pressable onPress={() => {}} /* absorb taps */>
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: C.border,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOpacity: 0.55,
                shadowOffset: { width: 0, height: 12 },
                shadowRadius: 32,
                elevation: 16,
              }}
            >
              {/* Top accent strip */}
              <View style={{ height: 3, backgroundColor: confirmColor }} />

              {/* Content */}
              <View style={{ padding: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: confirmColor + '18',
                      borderWidth: 1,
                      borderColor: confirmColor + '40',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={opts.destructive ? 'trash-outline' : 'alert-circle-outline'}
                      size={20}
                      color={confirmColor}
                    />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, flex: 1 }}>
                    {opts.title}
                  </Text>
                </View>

                {opts.message ? (
                  <Text style={{ fontSize: 14, color: C.sub, lineHeight: 21, marginBottom: 22 }}>
                    {opts.message}
                  </Text>
                ) : (
                  <View style={{ marginBottom: 22 }} />
                )}

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={handleCancel}
                    style={{
                      flex: 1,
                      paddingVertical: 13,
                      borderRadius: 12,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: C.border,
                      backgroundColor: C.inputBg,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.sub }}>
                      {opts.cancelLabel ?? 'Cancel'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirm}
                    style={{
                      flex: 1,
                      paddingVertical: 13,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: confirmColor,
                      shadowColor: confirmColor,
                      shadowOpacity: 0.4,
                      shadowOffset: { width: 0, height: 4 },
                      shadowRadius: 10,
                      elevation: 6,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                      {opts.confirmLabel ?? 'Confirm'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

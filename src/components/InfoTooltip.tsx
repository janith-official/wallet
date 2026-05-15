import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = {
  text: string;
  iconColor?: string;
  iconSize?: number;
};

export function InfoTooltip({ text, iconSize = 17 }: Props) {
  const C = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable onPress={() => setVisible(true)} hitSlop={10}>
        <Ionicons name="information-circle-outline" size={iconSize} color={C.muted} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        {/* Backdrop — tap to dismiss */}
        <Pressable
          style={{
            flex: 1,
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.65)',
            paddingHorizontal: 20,
            paddingVertical: 60,
          }}
          onPress={() => setVisible(false)}
        >
          {/* Card — swallow tap so it doesn't dismiss */}
          <Pressable onPress={() => {}}>
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: C.border,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={C.accent}
                  style={{ marginTop: 1 }}
                />
                <Text style={{ flex: 1, fontSize: 14, color: C.sub, lineHeight: 21 }}>
                  {text}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>
                Tap outside to dismiss
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

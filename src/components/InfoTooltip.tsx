import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';

type Props = {
  text: string;
  iconColor?: string;
  iconSize?: number;
};

export function InfoTooltip({ text, iconColor = '#52525b', iconSize = 17 }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable onPress={() => setVisible(true)} hitSlop={10}>
        <Ionicons name="information-circle-outline" size={iconSize} color={iconColor} />
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
                backgroundColor: '#18181c',
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: '#2a2a35',
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color="#dc2626"
                  style={{ marginTop: 1 }}
                />
                <Text style={{ flex: 1, fontSize: 14, color: '#b0b0be', lineHeight: 21 }}>
                  {text}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#52525b', textAlign: 'center' }}>
                Tap outside to dismiss
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

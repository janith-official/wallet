import { useRef, useEffect } from 'react';
import { Animated, Dimensions, Pressable, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';

const TAB_META: Record<string, { label: string; icon: string }> = {
  index:        { label: 'Dashboard',    icon: 'grid-outline' },
  transactions: { label: 'Transactions', icon: 'swap-vertical-outline' },
  budgets:      { label: 'Budgets',      icon: 'pie-chart-outline' },
  settings:     { label: 'Settings',     icon: 'settings-outline' },
};

const ACCENT = '#dc2626';
const SCREEN_W = Dimensions.get('window').width;
const TAB_W = SCREEN_W / 4;
const PILL_INSET = 6;
const PILL_W = TAB_W - PILL_INSET * 2;
const PILL_H = 52;

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const pillAnim = useRef(new Animated.Value(state.index)).current;

  // Four separate refs — must not be in a conditional or loop
  const s0 = useRef(new Animated.Value(1)).current;
  const s1 = useRef(new Animated.Value(1)).current;
  const s2 = useRef(new Animated.Value(1)).current;
  const s3 = useRef(new Animated.Value(1)).current;
  const scaleAnims = [s0, s1, s2, s3];

  useEffect(() => {
    Animated.spring(pillAnim, {
      toValue: state.index,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();
  }, [state.index]);

  const pillTranslateX = pillAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, 1, 2, 3].map((i) => i * TAB_W + PILL_INSET),
  });

  const handlePress = (index: number, routeKey: string, routeName: string) => {
    const isFocused = state.index === index;

    // Bounce animation
    const scale = scaleAnims[index];
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.82,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
    ]).start();

    navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });

    if (!isFocused) {
      navigation.navigate(routeName);
    }
  };

  const barHeight = 62 + insets.bottom;

  return (
    <View
      style={{
        height: barHeight,
        backgroundColor: '#0f0f0f',
        borderTopWidth: 1,
        borderTopColor: '#1f1f1f',
        flexDirection: 'row',
      }}
    >
      {/* Sliding pill */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: (62 - PILL_H) / 2,
          width: PILL_W,
          height: PILL_H,
          borderRadius: PILL_H / 2,
          backgroundColor: ACCENT + '18',
          transform: [{ translateX: pillTranslateX }],
        }}
      />

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const meta = TAB_META[route.name] ?? { label: route.name, icon: 'ellipse-outline' };
        const color = isFocused ? ACCENT : '#6b7280';

        return (
          <Pressable
            key={route.key}
            onPress={() => handlePress(index, route.key, route.name)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Animated.View
              style={{
                alignItems: 'center',
                gap: 3,
                transform: [{ scale: scaleAnims[index] }],
              }}
            >
              <Ionicons name={meta.icon as any} size={24} color={color} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color,
                  letterSpacing: 0.2,
                }}
              >
                {meta.label}
              </Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

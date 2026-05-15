import { useRef, useState, useCallback } from 'react';
import { Animated, Pressable, View } from 'react-native';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import type { LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { useTheme, useThemeMode } from '@/features/theme/ThemeContext';

const TAB_META: Record<string, { label: string; icon: string }> = {
  index:        { label: 'Dashboard',    icon: 'grid-outline' },
  transactions: { label: 'Transactions', icon: 'swap-vertical-outline' },
  budgets:      { label: 'Budgets',      icon: 'pie-chart-outline' },
  settings:     { label: 'Settings',     icon: 'settings-outline' },
};

const ACCENT = '#dc2626';
const CONTENT_H = 64;
const PILL_INSET = 8;
const PILL_H = 46;
const LINE_H = 3;
const MARGIN_H = 12;
const BAR_RADIUS = 20;

export function TabBar({ state, navigation, position }: MaterialTopTabBarProps) {
  const C = useTheme();
  const { isDark } = useThemeMode();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  // Theme-aware bar and screen colors
  const SCREEN_BG = C.bg;
  const BAR_TOP = isDark ? '#2c2c2e' : '#ffffff';
  const BAR_MID = isDark ? '#232326' : '#f8f8fa';
  const BAR_BOT = isDark ? '#1a1a1d' : '#f0f0f4';
  const inactiveColor = isDark ? '#8e8e93' : '#6b6b7a';

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  const tabCount = state.routes.length;
  const tabW = barWidth / tabCount;
  const pillW = tabW - PILL_INSET * 2;
  const lineW = tabW * 0.4;

  const s0 = useRef(new Animated.Value(1)).current;
  const s1 = useRef(new Animated.Value(1)).current;
  const s2 = useRef(new Animated.Value(1)).current;
  const s3 = useRef(new Animated.Value(1)).current;
  const scaleAnims = [s0, s1, s2, s3];

  // Use the position prop from material-top-tabs for real-time pill tracking.
  // This animated value follows the swipe finger position natively.
  const pillTranslateX = position.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => i * tabW + PILL_INSET),
  });

  const lineTranslateX = position.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => i * tabW + (tabW - lineW) / 2),
  });

  const handlePress = (index: number, routeKey: string, routeName: string) => {
    const isFocused = state.index === index;

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

  return (
    <View
      style={{
        paddingBottom: insets.bottom,
        paddingHorizontal: MARGIN_H,
        backgroundColor: SCREEN_BG,
      }}
    >
      <View
        onLayout={onLayout}
        style={{
          position: 'relative',
        }}
      >
        {/* Shadow layer */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: BAR_RADIUS,
            backgroundColor: BAR_BOT,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.5 : 0.15,
            shadowRadius: 12,
            elevation: 20,
          }}
        />

        {/* 3D gradient bar */}
        <LinearGradient
          colors={[BAR_TOP, BAR_MID, BAR_BOT]}
          locations={[0, 0.4, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            borderRadius: BAR_RADIUS,
            overflow: 'hidden',
          }}
        >
          <View style={{ height: 1, backgroundColor: isDark ? '#ffffff10' : '#00000008' }} />

          {/* Sliding accent top line */}
          {barWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                width: lineW,
                height: LINE_H,
                borderBottomLeftRadius: LINE_H,
                borderBottomRightRadius: LINE_H,
                backgroundColor: ACCENT,
                transform: [{ translateX: lineTranslateX }],
              }}
            />
          )}

          <View style={{ height: CONTENT_H, flexDirection: 'row' }}>
            {/* Pill background */}
            {barWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: (CONTENT_H - PILL_H) / 2,
                  width: pillW,
                  height: PILL_H,
                  borderRadius: PILL_H / 2,
                  backgroundColor: ACCENT + '20',
                  borderWidth: 1,
                  borderColor: ACCENT + '30',
                  transform: [{ translateX: pillTranslateX }],
                }}
              />
            )}

            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const meta = TAB_META[route.name] ?? { label: route.name, icon: 'ellipse-outline' };
              const color = isFocused ? ACCENT : inactiveColor;

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
                    <Ionicons
                      name={(isFocused ? meta.icon.replace('-outline', '') : meta.icon) as any}
                      size={24}
                      color={color}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: isFocused ? '700' : '500',
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

          <View style={{ height: 1, backgroundColor: isDark ? '#00000040' : '#0000000a' }} />
        </LinearGradient>
      </View>
    </View>
  );
}

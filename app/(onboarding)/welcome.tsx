import { useRef, useState } from 'react';
import { Animated, Image, Pressable, View, Text as RNText } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '@/components/Text';
import { useAuth } from '@/features/auth/AuthProvider';

type Slide = {
  kind: 'logo' | 'icon';
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    kind: 'logo',
    title: 'Welcome to Savvo',
    description: "Your all-in-one personal finance tracker. Let's show you what's inside.",
  },
  {
    kind: 'icon',
    icon: 'stats-chart-outline',
    title: 'Your Financial Snapshot',
    description:
      'The Dashboard shows your net balance, income vs. expenses, spending trends, and top categories — all in one view.',
  },
  {
    kind: 'icon',
    icon: 'swap-horizontal-outline',
    title: 'Track Every Transaction',
    description:
      'Log income, expenses, and transfers in seconds. Filter by month, type, or account to see exactly where your money goes.',
  },
  {
    kind: 'icon',
    icon: 'pie-chart-outline',
    title: 'Budgets & Categories',
    description:
      'Create weekly or monthly spending limits per category. Color-coded progress bars keep you on track at a glance.',
  },
  {
    kind: 'icon',
    icon: 'settings-outline',
    title: 'Make It Yours',
    description:
      'Add your bank accounts, set your base currency, and customize your profile. Everything is built around how you manage money.',
  },
];

const TOTAL = SLIDES.length;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { markOnboardingSeen } = useAuth();
  const [index, setIndex] = useState(0);

  // Content fade + scale
  const slideOpacity = useRef(new Animated.Value(1)).current;
  const slideScale = useRef(new Animated.Value(1)).current;

  // Icon spring
  const iconScale = useRef(new Animated.Value(1)).current;

  // Dot widths (animated)
  const dotWidths = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 24 : 8))).current;

  const isFirst = index === 0;
  const isLast = index === TOTAL - 1;
  const slide = SLIDES[index];

  const updateDots = (nextIndex: number) => {
    SLIDES.forEach((_, i) => {
      Animated.timing(dotWidths[i], {
        toValue: i === nextIndex ? 24 : 8,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  };

  const animateToSlide = (nextIndex: number) => {
    updateDots(nextIndex);
    Animated.parallel([
      Animated.timing(slideOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideScale, { toValue: 0.94, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setIndex(nextIndex);
      iconScale.setValue(0.7);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideScale, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleDone = async () => {
    await markOnboardingSeen();
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (isLast) {
      handleDone();
    } else {
      animateToSlide(index + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) animateToSlide(index - 1);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0f0f0f',
        paddingTop: insets.top,
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      {/* Skip button */}
      {!isLast && (
        <Pressable
          onPress={handleDone}
          hitSlop={12}
          style={{ position: 'absolute', top: insets.top + 16, right: 24, zIndex: 10 }}
        >
          <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500' }}>Skip</Text>
        </Pressable>
      )}

      {/* Slide content */}
      <Animated.View
        style={{
          flex: 1,
          opacity: slideOpacity,
          transform: [{ scale: slideScale }],
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 36,
        }}
      >
        {/* Icon / logo card */}
        <LinearGradient
          colors={['#1e0a0a', '#110404']}
          style={{
            width: 160,
            height: 160,
            borderRadius: 44,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 44,
            borderWidth: 1,
            borderColor: '#dc262630',
            // shadow
            shadowColor: '#dc2626',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 28,
            elevation: 10,
          }}
        >
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            {slide.kind === 'logo' ? (
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 24,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={{ width: 96, height: 96 }}
                />
              </View>
            ) : (
              <Ionicons name={slide.icon!} size={72} color="#dc2626" />
            )}
          </Animated.View>
        </LinearGradient>

        {/* Slide label — small step indicator */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: '#dc2626',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          {index === 0 ? 'Get started' : `Feature ${index} of ${TOTAL - 1}`}
        </Text>

        {/* Title */}
        <Text
          style={{
            fontSize: 26,
            fontWeight: '700',
            color: '#f9fafb',
            textAlign: 'center',
            letterSpacing: -0.5,
            marginBottom: 16,
          }}
        >
          {slide.title}
        </Text>

        {/* Description */}
        <Text
          style={{
            fontSize: 15,
            color: '#9ca3af',
            textAlign: 'center',
            lineHeight: 24,
            letterSpacing: 0.1,
          }}
        >
          {slide.description}
        </Text>
      </Animated.View>

      {/* Bottom nav */}
      <View style={{ paddingHorizontal: 24, gap: 20 }}>
        {/* Dot indicators */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={{
                height: 8,
                width: dotWidths[i],
                borderRadius: 4,
                backgroundColor: i === index ? '#dc2626' : '#2a2a2a',
              }}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {/* Back — only rendered on slides 2+ */}
          {!isFirst && (
            <Pressable
              onPress={handleBack}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#2a2a2a',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#9ca3af' }}>Back</Text>
            </Pressable>
          )}

          {/* Next / Get Started */}
          <View
            style={{
              flex: 1,
              height: 52,
              borderRadius: 14,
              shadowColor: '#dc2626',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Pressable
              onPress={handleNext}
              style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#ef4444', '#b91c1c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                  {isLast ? 'Get Started' : 'Next'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

import { Modal, View, Pressable, useWindowDimensions } from 'react-native';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/features/theme/ThemeContext';

export type TourStep = {
  title: string;
  body: string;
  /** 'center' = floats in middle of screen; 'above-tabs' = sits above the tab bar */
  placement: 'center' | 'above-tabs';
  /** Index of the tab to point the arrow at (0=Dashboard,1=Transactions,2=Budgets,3=Settings) */
  tabIndex?: number;
};

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Savvo',
    body: 'Your personal finance tracker. Let me walk you through the key features.',
    placement: 'center',
  },
  {
    title: 'Transactions',
    body: 'Log every payment, income, or transfer. Tap the tab then use + to add one instantly.',
    placement: 'above-tabs',
    tabIndex: 1,
  },
  {
    title: 'Budgets',
    body: 'Set spending limits per category. Visual progress bars show how much you have left.',
    placement: 'above-tabs',
    tabIndex: 2,
  },
  {
    title: 'Settings & Accounts',
    body: 'Add your bank accounts, choose your base currency, and manage your profile here.',
    placement: 'above-tabs',
    tabIndex: 3,
  },
];

const H_MARGIN = 20; // horizontal margin for the card

type Props = {
  visible: boolean;
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
};

export function TourOverlay({ visible, currentStep, onNext, onSkip }: Props) {
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();

  const step = TOUR_STEPS[Math.min(currentStep, TOUR_STEPS.length - 1)];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  // Approximate tab bar height (tab content + safe area)
  const TAB_BAR_H = 58 + insets.bottom;

  // Horizontal center of the target tab in screen coordinates
  const tabCenterX =
    step.tabIndex !== undefined ? (step.tabIndex + 0.5) * (screenW / 4) : screenW / 2;

  // Arrow left offset relative to the card's left edge
  const arrowOffset = Math.max(8, Math.min(tabCenterX - H_MARGIN - 9, screenW - H_MARGIN * 2 - 26));

  const Dots = () => (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
      {TOUR_STEPS.map((_, i) => (
        <View
          key={i}
          style={{
            width: i === currentStep ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === currentStep ? C.accent : C.muted,
          }}
        />
      ))}
    </View>
  );

  const Buttons = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
      <Pressable onPress={onSkip} hitSlop={10}>
        <Text style={{ color: C.muted, fontSize: 14 }}>Skip</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Dots />
        <Pressable
          onPress={onNext}
          style={{
            backgroundColor: C.accent,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 10,
            shadowColor: C.accent,
            shadowOpacity: 0.45,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
            {isLast ? 'Done' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const cardBase = {
    position: 'absolute' as const,
    left: H_MARGIN,
    right: H_MARGIN,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 30,
    elevation: 14,
  };

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      {/* Dark backdrop */}
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' }} />

      {step.placement === 'center' ? (
        /* ── Center card (welcome step) ── */
        <View style={{ ...cardBase, top: '38%' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 10 }}>
            {step.title}
          </Text>
          <Text style={{ fontSize: 14, color: C.sub, lineHeight: 22 }}>{step.body}</Text>
          <Buttons />
        </View>
      ) : (
        /* ── Above-tabs card with downward arrow ── */
        <View style={{ ...cardBase, bottom: TAB_BAR_H + 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 }}>
            {step.title}
          </Text>
          <Text style={{ fontSize: 14, color: C.sub, lineHeight: 22 }}>{step.body}</Text>
          <Buttons />

          {/* Arrow border layer (rendered first = behind) */}
          <View
            style={{
              position: 'absolute',
              bottom: -13,
              left: arrowOffset - 2,
              width: 0,
              height: 0,
              borderLeftWidth: 11,
              borderRightWidth: 11,
              borderTopWidth: 13,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: C.border,
            }}
          />
          {/* Arrow fill layer */}
          <View
            style={{
              position: 'absolute',
              bottom: -11,
              left: arrowOffset,
              width: 0,
              height: 0,
              borderLeftWidth: 9,
              borderRightWidth: 9,
              borderTopWidth: 11,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: C.card,
            }}
          />
        </View>
      )}
    </Modal>
  );
}

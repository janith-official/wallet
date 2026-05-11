import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { InfoTooltip } from '@/components/InfoTooltip';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBaseCurrency } from '@/features/profile/ProfileContext';
import { useBudgets, useAddBudget, useUpdateBudget, useDeleteBudget } from '@/features/budgets/useBudgets';
import { useCategories, useUpsertCategory, useDeleteCategory } from '@/features/categories/useCategories';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryPicker } from '@/components/CategoryPicker';
import { ProgressBar } from '@/components/ProgressBar';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { formatMoney } from '@/lib/currency';
import type { BudgetWithSpend } from '@/features/budgets/useBudgets';
import type { Category } from '@/features/categories/useCategories';
import type { SupportedCurrency } from '@/components/CurrencyPicker';

/* ── palette (matches dashboard + transactions) ── */
const C = {
  bg: '#0a0a0c',
  card: '#141416',
  border: '#1e1e24',
  text: '#f0f0f5',
  sub: '#b0b0be',
  muted: '#5c5c70',
  income: '#34d399',
  expense: '#f87171',
  accent: '#dc2626',
  amber: '#f59e0b',
  inputBg: '#0e0e10',
  purple: '#a78bfa',
  blue: '#60a5fa',
};

const PRESET_COLORS = ['#f97316', '#ef4444', '#3b82f6', '#16a34a', '#a855f7', '#f59e0b', '#6b7280', '#0ea5e9'];

type BudgetFormValues = {
  name: string;
  category_id: string;
  amount: string;
  currency: SupportedCurrency;
};

type CategoryFormValues = {
  name: string;
  kind: 'income' | 'expense';
  icon: string;
  color: string;
};

function statusColor(ratio: number) {
  if (ratio >= 1) return C.expense;
  if (ratio >= 0.8) return C.amber;
  return C.income;
}

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const baseCurrency = useBaseCurrency();

  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpend | null>(null);
  const [showModal, setShowModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const [showCatList, setShowCatList] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const catSlideAnim = useRef(new Animated.Value(600)).current;

  const today = new Date();

  const { budgetsWithSpend, totalBudgeted, totalSpent, isLoading, periodFrom, periodTo } =
    useBudgets(userId, period, today);
  const addMutation = useAddBudget(userId);
  const updateMutation = useUpdateBudget(userId);
  const deleteMutation = useDeleteBudget(userId);

  const categoriesQuery = useCategories(userId);
  const upsertCategoryMutation = useUpsertCategory(userId);
  const deleteCategoryMutation = useDeleteCategory(userId);
  const allCategories = categoriesQuery.data ?? [];
  const expenseCategories = allCategories.filter((c) => c.kind === 'expense');

  const overallRatio = totalBudgeted > 0 ? totalSpent / totalBudgeted : 0;
  const isEditing = editingBudget !== null;

  // — Budget form —
  const { control, handleSubmit, reset, setValue } = useForm<BudgetFormValues>({
    defaultValues: { name: '', category_id: '', amount: '', currency: baseCurrency },
  });

  const openNew = () => {
    setEditingBudget(null);
    setValue('name', '');
    setValue('category_id', '');
    setValue('amount', '');
    setValue('currency', baseCurrency);
    setShowModal(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  };

  const openEdit = (budget: BudgetWithSpend) => {
    setEditingBudget(budget);
    setValue('name', budget.name ?? '');
    setValue('category_id', budget.category_id ?? '');
    setValue('amount', String(budget.amount));
    setValue('currency', (budget.currency as SupportedCurrency) ?? baseCurrency);
    setShowModal(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, { toValue: 600, duration: 240, useNativeDriver: true }).start(() => {
      setShowModal(false);
      setEditingBudget(null);
    });
  };

  const onSave = handleSubmit(async (values) => {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive number.');
      return;
    }
    try {
      if (isEditing && editingBudget) {
        await updateMutation.mutateAsync({
          id: editingBudget.id,
          amount,
          currency: values.currency,
          name: values.name.trim() || null,
          category_id: values.category_id || null,
        });
      } else {
        await addMutation.mutateAsync({
          category_id: values.category_id || null,
          period,
          amount,
          currency: values.currency,
          start_date: format(periodFrom, 'yyyy-MM-dd'),
          name: values.name.trim() || null,
        });
      }
      reset();
      closeModal();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save.');
    }
  });

  const onDeleteBudget = (budget: BudgetWithSpend) => {
    Alert.alert(
      'Delete budget?',
      `Remove the ${budget.name ?? budget.category?.name ?? 'this'} budget of ${formatMoney(budget.amount, budget.currency)}?`,
      [
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(budget.id) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  // — Category form —
  const {
    control: catControl,
    handleSubmit: catHandleSubmit,
    reset: catReset,
  } = useForm<CategoryFormValues>({
    defaultValues: { name: '', kind: 'expense', icon: '', color: PRESET_COLORS[0] },
  });

  const openNewCategory = () => {
    setEditingCategory(null);
    catReset({ name: '', kind: 'expense', icon: '', color: PRESET_COLORS[0] });
    setShowCatModal(true);
    Animated.timing(catSlideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    catReset({ name: cat.name, kind: cat.kind, icon: cat.icon ?? '', color: cat.color ?? PRESET_COLORS[0] });
    setShowCatModal(true);
    Animated.timing(catSlideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  };

  const closeCatModal = () => {
    Animated.timing(catSlideAnim, { toValue: 600, duration: 240, useNativeDriver: true }).start(() => {
      setShowCatModal(false);
      setEditingCategory(null);
    });
  };

  const onSaveCategory = catHandleSubmit(async (values) => {
    if (!values.name.trim()) {
      Alert.alert('Name required', 'Enter a category name.');
      return;
    }
    try {
      await upsertCategoryMutation.mutateAsync({
        id: editingCategory?.id,
        name: values.name.trim(),
        kind: values.kind,
        icon: values.icon.trim() || null,
        color: values.color || null,
      });
      closeCatModal();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save.');
    }
  });

  const onDeleteCategory = (cat: Category) => {
    Alert.alert(
      'Delete category?',
      `Remove "${cat.name}"? Existing transactions will become uncategorised.`,
      [
        { text: 'Delete', style: 'destructive', onPress: () => deleteCategoryMutation.mutate(cat.id) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const isCatPending = upsertCategoryMutation.isPending;
  const remaining = totalBudgeted - totalSpent;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 10, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: 68, height: 68, borderRadius: 20 }}
              />
              <View style={{ gap: 2 }}>
                <RNText style={{ fontSize: 11, fontFamily: 'RussoOne_400Regular', letterSpacing: 1.5 }}>
                  <RNText style={{ color: C.sub }}>Sav</RNText>
                  <RNText style={{ color: C.accent }}>vo</RNText>
                </RNText>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>
                  Budgets
                </Text>
              </View>
            </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <InfoTooltip text="Set monthly or weekly spending limits by category. Progress bars update automatically as you add transactions." />
            <Pressable
              onPress={() => setShowCatList(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="pricetags-outline" size={18} color={C.sub} />
            </Pressable>
            <Pressable
              onPress={openNew}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: C.accent,
                borderRadius: 10,
                shadowColor: C.accent,
                shadowOpacity: 0.4,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>New</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Period Toggle ── */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: C.inputBg,
            borderRadius: 12,
            padding: 4,
            gap: 4,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          {(['monthly', 'weekly'] as const).map((p) => {
            const active = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: active ? C.accent + '18' : 'transparent',
                  borderWidth: active ? 1 : 0,
                  borderColor: active ? C.accent + '40' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: active ? C.accent : C.muted,
                    textTransform: 'capitalize',
                  }}
                >
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.accent} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        >
          {/* ── Overview Card ── */}
          {budgetsWithSpend.length > 0 && (
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
                overflow: 'hidden',
                marginBottom: 20,
              }}
            >
              <LinearGradient
                colors={[C.accent + '10', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="calendar-outline" size={14} color={C.muted} />
                      <Text style={{ fontSize: 12, color: C.muted }}>
                        {format(periodFrom, 'MMM d')} – {format(periodTo, 'MMM d, yyyy')}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: statusColor(overallRatio) + '18',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: statusColor(overallRatio) + '40',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: statusColor(overallRatio) }}>
                        {Math.round(overallRatio * 100)}% used
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: C.inputBg,
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: C.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <Ionicons name="wallet-outline" size={12} color={C.sub} />
                        <Text style={{ fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                          Budgeted
                        </Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.3 }}>
                        {formatMoney(totalBudgeted, baseCurrency)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: C.inputBg,
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: C.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <Ionicons name="flame-outline" size={12} color={C.expense} />
                        <Text style={{ fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                          Spent
                        </Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: C.expense, letterSpacing: -0.3 }}>
                        {formatMoney(totalSpent, baseCurrency)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: C.inputBg,
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: C.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <Ionicons name="shield-checkmark-outline" size={12} color={remaining >= 0 ? C.income : C.expense} />
                        <Text style={{ fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                          Left
                        </Text>
                      </View>
                      <Text
                        style={{ fontSize: 16, fontWeight: '800', color: remaining >= 0 ? C.income : C.expense, letterSpacing: -0.3 }}
                        numberOfLines={1}
                      >
                        {formatMoney(Math.abs(remaining), baseCurrency)}
                      </Text>
                    </View>
                  </View>

                  <ProgressBar ratio={overallRatio} height={8} />
                </View>
              </LinearGradient>
            </View>
          )}

          {/* ── Budget List ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="pie-chart-outline" size={15} color={C.accent} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Budgets ({budgetsWithSpend.length})
            </Text>
          </View>

          {budgetsWithSpend.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="pie-chart-outline" size={40} color={C.border} />
              <Text style={{ fontSize: 14, color: C.muted, marginTop: 12 }}>No budgets yet</Text>
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Tap + New to create one</Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginBottom: 24 }}>
              {budgetsWithSpend.map((b) => {
                const ratio = b.amount > 0 ? b.spent / b.amount : 0;
                const overBudget = ratio >= 1;
                const left = b.amount - b.spent;
                const sc = statusColor(ratio);
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => openEdit(b)}
                    onLongPress={() => onDeleteBudget(b)}
                    style={({ pressed }) => ({
                      backgroundColor: C.card,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: C.border,
                      overflow: 'hidden',
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    {/* Top accent strip */}
                    <View style={{ height: 3, backgroundColor: sc }} />
                    <View style={{ padding: 16 }}>
                      {/* Row 1: Icon, name, percentage badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <CategoryIcon icon={b.category?.icon} color={b.category?.color} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>
                            {b.name ?? b.category?.name ?? 'General'}
                          </Text>
                          <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            {formatMoney(b.spent, b.currency)} of {formatMoney(b.amount, b.currency)}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: sc + '18',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderWidth: 1,
                            borderColor: sc + '40',
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: sc }}>
                            {Math.round(ratio * 100)}%
                          </Text>
                        </View>
                      </View>

                      {/* Progress bar */}
                      <ProgressBar ratio={ratio} height={6} />

                      {/* Row 2: Remaining + reset date */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                        <Text style={{ fontSize: 11, color: overBudget ? C.expense : C.income, fontWeight: '600' }}>
                          {overBudget
                            ? `${formatMoney(Math.abs(left), b.currency)} over`
                            : `${formatMoney(left, b.currency)} left`}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="refresh-outline" size={11} color={C.muted} />
                          <Text style={{ fontSize: 11, color: C.muted }}>resets {b.resetDate}</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

        </ScrollView>
      )}

      {/* ── Categories Full-Screen Modal ── */}
      <Modal visible={showCatList} animationType="slide" onRequestClose={() => setShowCatList(false)}>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 10, paddingBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable onPress={() => setShowCatList(false)} style={{ padding: 4 }}>
                  <Ionicons name="arrow-back" size={22} color={C.text} />
                </Pressable>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>Categories</Text>
              </View>
              <Pressable
                onPress={openNewCategory}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: C.accent,
                  borderRadius: 10,
                  shadowColor: C.accent,
                  shadowOpacity: 0.4,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 10,
                  elevation: 5,
                }}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>New</Text>
              </Pressable>
            </View>
          </View>

          {/* Category counts */}
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 }}>
            {[
              { label: 'Expense', count: allCategories.filter((c) => c.kind === 'expense').length, color: C.expense },
              { label: 'Income', count: allCategories.filter((c) => c.kind === 'income').length, color: C.income },
              { label: 'Total', count: allCategories.length, color: C.sub },
            ].map((s) => (
              <View
                key={s.label}
                style={{
                  flex: 1,
                  backgroundColor: C.card,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: '800', color: s.color }}>{s.count}</Text>
                <Text style={{ fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Category list */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}>
            {allCategories.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Ionicons name="pricetags-outline" size={40} color={C.border} />
                <Text style={{ fontSize: 14, color: C.muted, marginTop: 12 }}>No categories yet</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Tap + New to create one</Text>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: C.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                  overflow: 'hidden',
                }}
              >
                {allCategories.map((cat, i) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => openEditCategory(cat)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      backgroundColor: pressed ? C.border : C.card,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: C.border,
                    })}
                  >
                    <CategoryIcon icon={cat.icon} color={cat.color} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{cat.name}</Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: (cat.kind === 'income' ? C.income : C.expense) + '14',
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: (cat.kind === 'income' ? C.income : C.expense) + '30',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: cat.kind === 'income' ? C.income : C.expense,
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                        }}
                      >
                        {cat.kind}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.muted} />
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Budget Modal ── */}
      <Modal visible={showModal} transparent animationType="none" onRequestClose={closeModal}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' }} onPress={closeModal} />
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: C.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: C.border,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>
              {isEditing ? 'Edit Budget' : 'New Budget'}
            </Text>
            <Pressable onPress={closeModal} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={C.muted} />
            </Pressable>
          </View>

          <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
            Name
          </Text>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <TextInput
                placeholder="Budget name (optional)"
                placeholderTextColor={C.muted}
                value={field.value}
                onChangeText={field.onChange}
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  marginBottom: 14,
                  color: C.text,
                  backgroundColor: C.inputBg,
                }}
              />
            )}
          />

          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
                  Category (expense)
                </Text>
                <CategoryPicker
                  categories={expenseCategories}
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? '')}
                  onAdd={openNewCategory}
                />
              </View>
            )}
          />

          <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
            Amount limit
          </Text>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <TextInput
                placeholder="0.00"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
                value={field.value}
                onChangeText={field.onChange}
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  fontSize: 22,
                  fontWeight: '700',
                  marginBottom: 14,
                  color: C.text,
                  backgroundColor: C.inputBg,
                  letterSpacing: -0.5,
                }}
              />
            )}
          />

          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
                  Currency
                </Text>
                <CurrencyPicker value={field.value} onChange={field.onChange} />
              </View>
            )}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {isEditing && (
              <Pressable
                onPress={() => {
                  closeModal();
                  if (editingBudget) onDeleteBudget(editingBudget);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: C.expense + '50',
                  backgroundColor: C.expense + '10',
                }}
              >
                <Ionicons name="trash-outline" size={16} color={C.expense} />
                <Text style={{ color: C.expense, fontSize: 14, fontWeight: '600' }}>Delete</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onSave}
              disabled={isPending}
              style={{
                flex: 2,
                backgroundColor: C.accent,
                paddingVertical: 15,
                borderRadius: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                shadowColor: C.accent,
                shadowOpacity: 0.4,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
              )}
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Budget'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Modal>

      {/* ── Category Modal ── */}
      <Modal visible={showCatModal} transparent animationType="none" onRequestClose={closeCatModal}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' }} onPress={closeCatModal} />
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: C.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: C.border,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
            transform: [{ translateY: catSlideAnim }],
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>
              {editingCategory ? 'Edit Category' : 'New Category'}
            </Text>
            <Pressable onPress={closeCatModal} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={C.muted} />
            </Pressable>
          </View>

          <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
            Name
          </Text>
          <Controller
            control={catControl}
            name="name"
            render={({ field }) => (
              <TextInput
                placeholder="Category name"
                placeholderTextColor={C.muted}
                value={field.value}
                onChangeText={field.onChange}
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  marginBottom: 14,
                  color: C.text,
                  backgroundColor: C.inputBg,
                }}
              />
            )}
          />

          <Controller
            control={catControl}
            name="kind"
            render={({ field }) => (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
                  Type
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: C.inputBg,
                    borderRadius: 12,
                    padding: 4,
                    gap: 4,
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  {(['expense', 'income'] as const).map((k) => {
                    const active = field.value === k;
                    const kColor = k === 'income' ? C.income : C.expense;
                    return (
                      <Pressable
                        key={k}
                        onPress={() => field.onChange(k)}
                        style={{
                          flex: 1,
                          paddingVertical: 9,
                          borderRadius: 8,
                          alignItems: 'center',
                          backgroundColor: active ? kColor + '18' : 'transparent',
                          borderWidth: active ? 1 : 0,
                          borderColor: active ? kColor + '40' : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: active ? kColor : C.muted,
                            textTransform: 'capitalize',
                          }}
                        >
                          {k}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          />

          <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
            Icon (emoji)
          </Text>
          <Controller
            control={catControl}
            name="icon"
            render={({ field }) => (
              <TextInput
                placeholder="e.g. 🍔"
                placeholderTextColor={C.muted}
                value={field.value}
                onChangeText={field.onChange}
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 20,
                  marginBottom: 14,
                  color: C.text,
                  backgroundColor: C.inputBg,
                }}
              />
            )}
          />

          <Controller
            control={catControl}
            name="color"
            render={({ field }) => (
              <View style={{ marginBottom: 22 }}>
                <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
                  Color
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((hex) => (
                    <Pressable
                      key={hex}
                      onPress={() => field.onChange(hex)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        backgroundColor: hex,
                        borderWidth: field.value === hex ? 3 : 0,
                        borderColor: '#fff',
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {editingCategory && (
              <Pressable
                onPress={() => {
                  closeCatModal();
                  onDeleteCategory(editingCategory);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: C.expense + '50',
                  backgroundColor: C.expense + '10',
                }}
              >
                <Ionicons name="trash-outline" size={16} color={C.expense} />
                <Text style={{ color: C.expense, fontSize: 14, fontWeight: '600' }}>Delete</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onSaveCategory}
              disabled={isCatPending}
              style={{
                flex: 2,
                backgroundColor: C.accent,
                paddingVertical: 15,
                borderRadius: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                shadowColor: C.accent,
                shadowOpacity: 0.4,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              {isCatPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
              )}
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {isCatPending ? 'Saving…' : editingCategory ? 'Save Changes' : 'Add Category'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

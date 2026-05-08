import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
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

const C = {
  bg: '#0f0f0f',
  card: '#1a1a1a',
  border: '#2a2a2a',
  text: '#f9fafb',
  muted: '#9ca3af',
  income: '#22c55e',
  expense: '#ef4444',
  accent: '#dc2626',
};

const card = {
  backgroundColor: C.card,
  borderRadius: 12,
  shadowColor: '#000',
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 4,
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

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const baseCurrency = useBaseCurrency();

  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpend | null>(null);
  const [showModal, setShowModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const catSlideAnim = useRef(new Animated.Value(500)).current;

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
    Animated.timing(slideAnim, { toValue: 500, duration: 240, useNativeDriver: true }).start(() => {
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

  const onLongPress = (budget: BudgetWithSpend) => {
    Alert.alert(
      `Delete budget?`,
      `Remove the ${budget.name ?? budget.category?.name ?? 'this'} budget of ${formatMoney(budget.amount, budget.currency)}?`,
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(budget.id),
        },
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
    Animated.timing(catSlideAnim, { toValue: 500, duration: 240, useNativeDriver: true }).start(() => {
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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>Budgets</Text>
        <Pressable
          onPress={openNew}
          style={{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.accent, borderRadius: 8, shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 10, elevation: 5 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>+ New</Text>
        </Pressable>
      </View>

      {/* Period toggle */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 16,
          marginBottom: 16,
          backgroundColor: C.border,
          borderRadius: 8,
          padding: 4,
        }}
      >
        {(['monthly', 'weekly'] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 6,
              alignItems: 'center',
              backgroundColor: period === p ? C.card : 'transparent',
              shadowColor: period === p ? '#000' : 'transparent',
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: period === p ? 1 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: period === p ? C.text : C.muted,
                textTransform: 'capitalize',
              }}
            >
              {p}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
          {/* Overview card */}
          {budgetsWithSpend.length > 0 && (
            <View style={{ ...card, marginBottom: 4 }}>
              <View style={{ height: 3, backgroundColor: C.accent, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, color: C.muted }}>
                    {format(periodFrom, 'MMM d')} – {format(periodTo, 'MMM d, yyyy')}
                  </Text>
                  <View style={{ backgroundColor: overallRatio >= 1 ? C.expense + '20' : C.accent + '15', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: overallRatio >= 1 ? C.expense + '50' : C.accent + '35' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: overallRatio >= 1 ? C.expense : C.accent }}>
                      {Math.round(overallRatio * 100)}%
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 24, marginBottom: 12 }}>
                  <View>
                    <Text style={{ fontSize: 12, color: C.muted }}>Budgeted</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>
                      {formatMoney(totalBudgeted, baseCurrency)}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: C.muted }}>Spent</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.expense }}>
                      {formatMoney(totalSpent, baseCurrency)}
                    </Text>
                  </View>
                </View>
                <ProgressBar ratio={overallRatio} height={10} />
              </View>
            </View>
          )}

          {/* Budget cards */}
          {budgetsWithSpend.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 16, color: C.muted }}>No budgets yet.</Text>
              <Text style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Tap + New to add one.</Text>
            </View>
          ) : (
            budgetsWithSpend.map((b) => {
              const ratio = b.amount > 0 ? b.spent / b.amount : 0;
              const overBudget = ratio >= 1;
              const remaining = b.amount - b.spent;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => openEdit(b)}
                  onLongPress={() => onLongPress(b)}
                  style={({ pressed }) => ({
                    ...card,
                    padding: 14,
                    borderLeftWidth: overBudget ? 3 : 0,
                    borderLeftColor: overBudget ? C.expense : 'transparent',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <CategoryIcon icon={b.category?.icon} color={b.category?.color} size={32} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: C.text }}>
                      {b.name ?? b.category?.name ?? 'General'}
                    </Text>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View
                        style={{
                          backgroundColor: overBudget ? C.expense + '20' : ratio >= 0.8 ? '#f59e0b20' : C.income + '15',
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderWidth: 1,
                          borderColor: overBudget ? C.expense + '50' : ratio >= 0.8 ? '#f59e0b50' : C.income + '35',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: overBudget ? C.expense : ratio >= 0.8 ? '#f59e0b' : C.income }}>
                          {Math.round(ratio * 100)}%
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: C.muted }}>
                        {formatMoney(b.spent, b.currency)} / {formatMoney(b.amount, b.currency)}
                      </Text>
                    </View>
                  </View>
                  <ProgressBar ratio={ratio} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: overBudget ? C.expense : C.income, fontWeight: '500' }}>
                      {overBudget
                        ? `${formatMoney(Math.abs(remaining), b.currency)} over budget`
                        : `${formatMoney(remaining, b.currency)} remaining`}
                    </Text>
                    <Text style={{ fontSize: 12, color: C.muted }}>resets {b.resetDate}</Text>
                  </View>
                </Pressable>
              );
            })
          )}

          {/* ─── Categories section ─── */}
          <View style={{ marginTop: 8 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: C.muted,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Categories
            </Text>
            <View style={{ ...card, overflow: 'hidden' }}>
              {allCategories.length === 0 ? (
                <View style={{ padding: 16 }}>
                  <Text style={{ fontSize: 14, color: C.muted }}>No categories yet.</Text>
                </View>
              ) : (
                allCategories.map((cat, i) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => openEditCategory(cat)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: pressed ? '#242424' : C.card,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: C.border,
                    })}
                  >
                    <CategoryIcon icon={cat.icon} color={cat.color} size={32} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: C.text }}>{cat.name}</Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: cat.kind === 'income' ? C.income : C.expense,
                        textTransform: 'capitalize',
                      }}
                    >
                      {cat.kind}
                    </Text>
                  </Pressable>
                ))
              )}
              <Pressable
                onPress={openNewCategory}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: pressed ? '#242424' : C.card,
                  borderTopWidth: allCategories.length > 0 ? 1 : 0,
                  borderTopColor: C.border,
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.accent }}>+ Add Category</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ─── Add / Edit Budget Modal ─── */}
      <Modal visible={showModal} transparent animationType="none" onRequestClose={closeModal}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} onPress={closeModal} />
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: C.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            paddingBottom: insets.bottom + 24,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 }}>
            {isEditing ? 'Edit Budget' : 'New Budget'}
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
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                  marginBottom: 12,
                  color: C.text,
                  backgroundColor: C.bg,
                }}
              />
            )}
          />

          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Category (expense)</Text>
                <CategoryPicker
                  categories={expenseCategories}
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? '')}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <TextInput
                placeholder="Amount limit"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
                value={field.value}
                onChangeText={field.onChange}
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                  marginBottom: 12,
                  color: C.text,
                  backgroundColor: C.bg,
                }}
              />
            )}
          />

          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Currency</Text>
                <CurrencyPicker value={field.value} onChange={field.onChange} />
              </View>
            )}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {isEditing && (
              <Pressable
                onPress={() => {
                  closeModal();
                  if (editingBudget) onLongPress(editingBudget);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: C.expense,
                }}
              >
                <Text style={{ color: C.expense, fontSize: 15, fontWeight: '600' }}>Delete</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onSave}
              disabled={isPending}
              style={{ flex: 2, backgroundColor: C.accent, paddingVertical: 14, borderRadius: 8, alignItems: 'center', shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 14, elevation: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Budget'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Modal>

      {/* ─── Add / Edit Category Modal ─── */}
      <Modal visible={showCatModal} transparent animationType="none" onRequestClose={closeCatModal}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} onPress={closeCatModal} />
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: C.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            paddingBottom: insets.bottom + 24,
            transform: [{ translateY: catSlideAnim }],
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 }}>
            {editingCategory ? 'Edit Category' : 'New Category'}
          </Text>

          {/* Name */}
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
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                  marginBottom: 12,
                  color: C.text,
                  backgroundColor: C.bg,
                }}
              />
            )}
          />

          {/* Kind toggle */}
          <Controller
            control={catControl}
            name="kind"
            render={({ field }) => (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Type</Text>
                <View style={{ flexDirection: 'row', backgroundColor: C.border, borderRadius: 8, padding: 4, gap: 4 }}>
                  {(['expense', 'income'] as const).map((k) => (
                    <Pressable
                      key={k}
                      onPress={() => field.onChange(k)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        alignItems: 'center',
                        backgroundColor: field.value === k ? C.card : 'transparent',
                        elevation: field.value === k ? 1 : 0,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: field.value === k ? (k === 'income' ? C.income : C.expense) : C.muted,
                          textTransform: 'capitalize',
                        }}
                      >
                        {k}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          />

          {/* Icon */}
          <Controller
            control={catControl}
            name="icon"
            render={({ field }) => (
              <TextInput
                placeholder="Emoji icon (optional, e.g. 🍔)"
                placeholderTextColor={C.muted}
                value={field.value}
                onChangeText={field.onChange}
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 20,
                  marginBottom: 12,
                  color: C.text,
                  backgroundColor: C.bg,
                }}
              />
            )}
          />

          {/* Color */}
          <Controller
            control={catControl}
            name="color"
            render={({ field }) => (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Color</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {PRESET_COLORS.map((hex) => (
                    <Pressable
                      key={hex}
                      onPress={() => field.onChange(hex)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: hex,
                        borderWidth: field.value === hex ? 3 : 0,
                        borderColor: '#f9fafb',
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {editingCategory && (
              <Pressable
                onPress={() => {
                  closeCatModal();
                  onDeleteCategory(editingCategory);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: C.expense,
                }}
              >
                <Text style={{ color: C.expense, fontSize: 15, fontWeight: '600' }}>Delete</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onSaveCategory}
              disabled={isCatPending}
              style={{ flex: 2, backgroundColor: C.accent, paddingVertical: 14, borderRadius: 8, alignItems: 'center', shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 14, elevation: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                {isCatPending ? 'Saving…' : editingCategory ? 'Save Changes' : 'Add Category'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

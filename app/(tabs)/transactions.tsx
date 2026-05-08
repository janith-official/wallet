import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  SectionList,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, format, subMonths } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBaseCurrency } from '@/features/profile/ProfileContext';
import { useTransactions, useAddTransaction } from '@/features/transactions/useTransactions';
import { useAccounts } from '@/features/profile/useProfile';
import { useCategories } from '@/features/categories/useCategories';
import { TransactionRow } from '@/components/TransactionRow';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { CategoryPicker } from '@/components/CategoryPicker';
import { formatMoney } from '@/lib/currency';
import type { TransactionRowData } from '@/components/TransactionRow';
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

type TxType = 'all' | 'income' | 'expense' | 'transfer';
const FILTERS: { key: TxType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expense' },
  { key: 'transfer', label: 'Transfer' },
];

type AddFormValues = {
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  currency: SupportedCurrency;
  account_id: string;
  category_id: string;
  note: string;
};

function groupByDate(items: TransactionRowData[]) {
  const map = new Map<string, TransactionRowData[]>();
  for (const item of items) {
    const key = format(new Date(item.occurred_at), 'MMM d, yyyy');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [month, setMonth] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<TxType>('all');
  const [showAdd, setShowAdd] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;

  const query = useTransactions(userId, month, typeFilter);
  const addMutation = useAddTransaction(userId);
  const accountsQuery = useAccounts(userId);
  const accounts = accountsQuery.data ?? [];
  const categoriesQuery = useCategories(userId);

  const allItems: TransactionRowData[] = (query.data?.pages ?? []).flat();
  const sections = groupByDate(allItems);

  const baseCurrency = useBaseCurrency();

  const income = allItems.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = allItems.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const net = income - expenses;

  const openModal = () => {
    setValue('currency', baseCurrency);
    const firstAccountId = accounts[0]?.id ?? '';
    setValue('account_id', firstAccountId);
    setShowAdd(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  };
  const closeModal = () => {
    Animated.timing(slideAnim, { toValue: 400, duration: 240, useNativeDriver: true }).start(() =>
      setShowAdd(false),
    );
  };

  const { control, handleSubmit, reset, watch, setValue } = useForm<AddFormValues>({
    defaultValues: { type: 'expense', amount: '', currency: baseCurrency, account_id: '', category_id: '', note: '' },
  });

  const txType = watch('type');
  useEffect(() => {
    setValue('category_id', '');
  }, [txType, setValue]);

  const onSave = handleSubmit(async (values) => {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive number.');
      return;
    }
    if (!values.account_id) {
      Alert.alert('No account', 'Please select an account first from Settings.');
      return;
    }
    try {
      await addMutation.mutateAsync({
        amount,
        currency: values.currency,
        amount_in_base: amount,
        type: values.type,
        occurred_at: new Date().toISOString(),
        note: values.note || undefined,
        account_id: values.account_id,
        category_id: values.category_id || undefined,
      });
      reset();
      closeModal();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save.');
    }
  });

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

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
          paddingBottom: 10,
          backgroundColor: C.bg,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>Transactions</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            onPress={() => setMonth((m) => subMonths(m, 1))}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 16, color: C.text }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 13, color: C.text, fontWeight: '600', minWidth: 76, textAlign: 'center' }}>
            {format(month, 'MMM yyyy')}
          </Text>
          <Pressable
            onPress={() => setMonth((m) => addMonths(m, 1))}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 16, color: C.text }}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setTypeFilter(f.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: typeFilter === f.key ? C.accent : C.border,
              shadowColor: C.accent,
              shadowOpacity: typeFilter === f.key ? 0.45 : 0,
              shadowRadius: 8,
              elevation: typeFilter === f.key ? 3 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: typeFilter === f.key ? '#fff' : C.muted,
              }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Summary strip */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: C.card,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        {[
          { label: 'Income', value: formatMoney(income, baseCurrency), color: C.income },
          { label: 'Expenses', value: formatMoney(expenses, baseCurrency), color: C.expense },
          { label: 'Net', value: formatMoney(net, baseCurrency), color: C.text },
        ].map((s, i) => (
          <View
            key={s.label}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 12,
              gap: 3,
              borderTopWidth: 2,
              borderTopColor: s.label === 'Net' ? C.border : s.color,
              borderLeftWidth: i > 0 ? 1 : 0,
              borderLeftColor: C.border,
            }}
          >
            <Text style={{ fontSize: 11, color: C.muted, fontWeight: '500' }}>{s.label}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: s.color }}>{s.value}</Text>
          </View>
        ))}
      </View>

      {/* Transaction list */}
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 2, height: 12, backgroundColor: C.accent, borderRadius: 1 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: 0.3 }}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TransactionRow
              item={item}
              onPress={(id) => router.push(`/transaction/${id}` as never)}
            />
          )}
          stickySectionHeadersEnabled
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            query.isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} /> : null
          }
          ListEmptyComponent={
            <Text style={{ color: C.muted, textAlign: 'center', padding: 40 }}>
              No transactions found.
            </Text>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={openModal}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: C.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: C.accent,
          shadowOpacity: 0.55,
          shadowRadius: 18,
          elevation: 8,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>+</Text>
      </Pressable>

      {/* Add Transaction Modal */}
      <Modal visible={showAdd} transparent animationType="none" onRequestClose={closeModal}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}
          onPress={closeModal}
        />
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 20 }}>
            Add Transaction
          </Text>

          {/* Type toggle */}
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: C.border,
                  borderRadius: 8,
                  padding: 4,
                  marginBottom: 16,
                  gap: 4,
                }}
              >
                {(['expense', 'income', 'transfer'] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => field.onChange(t)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 6,
                      alignItems: 'center',
                      backgroundColor: field.value === t ? C.accent + '25' : 'transparent',
                      shadowColor: field.value === t ? C.accent : 'transparent',
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                      elevation: field.value === t ? 1 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color:
                          field.value === t
                            ? t === 'income'
                              ? C.income
                              : t === 'expense'
                                ? C.expense
                                : C.text
                            : C.muted,
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />

          {/* Account picker */}
          {accounts.length > 0 && (
            <Controller
              control={control}
              name="account_id"
              render={({ field }) => (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Account</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {accounts.map((acc) => {
                      const active = field.value === acc.id;
                      return (
                        <Pressable
                          key={acc.id}
                          onPress={() => field.onChange(acc.id)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderRadius: 20,
                            borderWidth: 1.5,
                            borderColor: active ? C.accent : C.border,
                            backgroundColor: active ? C.accent + '15' : C.card,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '500', color: active ? C.accent : C.text }}>
                            {acc.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            />
          )}

          {/* Category picker */}
          {txType !== 'transfer' && (
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => {
                const filtered = (categoriesQuery.data ?? []).filter((c) => c.kind === txType);
                return (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Category</Text>
                    <CategoryPicker
                      categories={filtered}
                      value={field.value || null}
                      onChange={(id) => field.onChange(id ?? '')}
                    />
                  </View>
                );
              }}
            />
          )}

          {/* Amount */}
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <TextInput
                placeholder="Amount"
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

          {/* Currency */}
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Currency</Text>
                <CurrencyPicker value={field.value} onChange={field.onChange} />
              </View>
            )}
          />

          {/* Note */}
          <Controller
            control={control}
            name="note"
            render={({ field }) => (
              <TextInput
                placeholder="Note (optional)"
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
                  marginBottom: 20,
                  color: C.text,
                  backgroundColor: C.bg,
                }}
              />
            )}
          />

          <Pressable
            onPress={onSave}
            disabled={addMutation.isPending}
            style={{
              backgroundColor: C.accent,
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: 'center',
              shadowColor: C.accent,
              shadowOpacity: 0.45,
              shadowRadius: 14,
              elevation: 6,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              {addMutation.isPending ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </Animated.View>
      </Modal>
    </View>
  );
}

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { InfoTooltip } from '@/components/InfoTooltip';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, format, subMonths } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBaseCurrency } from '@/features/profile/ProfileContext';
import { useTransactions, useAddTransaction } from '@/features/transactions/useTransactions';
import { useAccounts } from '@/features/profile/useProfile';
import { useCategories } from '@/features/categories/useCategories';
import { useFxRates } from '@/features/fx/useFxRates';
import { TransactionRow } from '@/components/TransactionRow';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { CategoryPicker } from '@/components/CategoryPicker';
import { formatMoney, convert } from '@/lib/currency';
import { toast } from '@/components/Toast';
import { useTheme } from '@/features/theme/ThemeContext';
import type { TransactionRowData } from '@/components/TransactionRow';
import type { SupportedCurrency } from '@/components/CurrencyPicker';

const SCREEN_W = Dimensions.get('window').width;

type TxType = 'all' | 'income' | 'expense' | 'transfer';
const FILTERS: { key: TxType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'layers-outline' },
  { key: 'income', label: 'Income', icon: 'trending-up-outline' },
  { key: 'expense', label: 'Expense', icon: 'trending-down-outline' },
  { key: 'transfer', label: 'Transfer', icon: 'swap-horizontal-outline' },
];

type AddFormValues = {
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  currency: SupportedCurrency;
  account_id: string;
  to_account_id: string;
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
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [month, setMonth] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<TxType>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const query = useTransactions(userId, month, typeFilter, accountFilter);
  const addMutation = useAddTransaction(userId);
  const accountsQuery = useAccounts(userId);
  const accounts = accountsQuery.data ?? [];
  const categoriesQuery = useCategories(userId);
  const fxRatesQuery = useFxRates();

  const allItems: TransactionRowData[] = (query.data?.pages ?? []).flat();
  const sections = groupByDate(allItems);

  const baseCurrency = useBaseCurrency();

  const income = allItems.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = allItems.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const net = income - expenses;
  const txCount = allItems.length;

  const openModal = () => {
    setValue('currency', baseCurrency);
    const firstAccountId = accounts[0]?.id ?? '';
    setValue('account_id', firstAccountId);
    setShowAdd(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  };
  const closeModal = () => {
    Animated.timing(slideAnim, { toValue: 600, duration: 240, useNativeDriver: true }).start(() =>
      setShowAdd(false),
    );
  };

  const { control, handleSubmit, reset, watch, setValue } = useForm<AddFormValues>({
    defaultValues: { type: 'expense', amount: '', currency: baseCurrency, account_id: '', to_account_id: '', category_id: '', note: '' },
  });

  const txType = watch('type');
  const activeAccounts = accounts.filter((a) => !a.archived);
  useEffect(() => {
    setValue('category_id', '');
    setValue('to_account_id', '');
  }, [txType, setValue]);

  const onSave = handleSubmit(async (values) => {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount', 'Enter a positive number.');
      return;
    }
    if (!values.account_id) {
      toast.warning('No account', 'Please select an account first from Settings.');
      return;
    }
    if (values.type === 'transfer') {
      if (!values.to_account_id) {
        toast.warning('Missing destination', 'Please select a destination account for the transfer.');
        return;
      }
      if (values.account_id === values.to_account_id) {
        toast.warning('Same account', 'Source and destination accounts must be different.');
        return;
      }
    }
    let amount_in_base = amount;
    const rates = fxRatesQuery.data;
    if (rates && values.currency !== baseCurrency) {
      try {
        amount_in_base = convert(amount, values.currency, baseCurrency, rates);
      } catch {
        // rates missing for this pair — fall back to 1:1
      }
    }

    try {
      await addMutation.mutateAsync({
        amount,
        currency: values.currency,
        amount_in_base,
        type: values.type,
        occurred_at: new Date().toISOString(),
        note: values.note || undefined,
        account_id: values.account_id,
        category_id: values.category_id || undefined,
        to_account_id: values.type === 'transfer' ? values.to_account_id || undefined : undefined,
      });
      reset();
      closeModal();
    } catch (e: unknown) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Failed to save.');
    }
  });

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 10, paddingBottom: 14, backgroundColor: C.bg }}>
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
                  Transactions
                </Text>
              </View>
            </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => setMonth((m) => subMonths(m, 1))}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-back" size={16} color={C.sub} />
            </Pressable>
            <Text style={{ fontSize: 13, color: C.text, fontWeight: '600', minWidth: 76, textAlign: 'center' }}>
              {format(month, 'MMM yyyy')}
            </Text>
            <Pressable
              onPress={() => setMonth((m) => addMonths(m, 1))}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-forward" size={16} color={C.sub} />
            </Pressable>
            <InfoTooltip text="Log every payment, income, or transfer. Use filters to review spending by category or account." />
          </View>
        </View>

        {/* ── Summary Cards ── */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Income', value: income, color: C.income, icon: 'trending-up' as const },
            { label: 'Expenses', value: expenses, color: C.expense, icon: 'trending-down' as const },
            { label: 'Net', value: net, color: net >= 0 ? C.income : C.expense, icon: 'analytics' as const },
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
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <Ionicons name={s.icon} size={12} color={s.color} />
                <Text style={{ fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  {s.label}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: s.color, letterSpacing: -0.3 }} numberOfLines={1}>
                {formatMoney(s.value, baseCurrency)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Filter Chips ── */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {FILTERS.map((f) => {
            const active = typeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setTypeFilter(f.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: active ? C.accent + '18' : C.card,
                  borderWidth: 1,
                  borderColor: active ? C.accent + '40' : C.border,
                }}
              >
                <Ionicons name={f.icon as any} size={13} color={active ? C.accent : C.muted} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: active ? C.accent : C.muted,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Account Filter ── */}
        {activeAccounts.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingTop: 10 }}
          >
            <Pressable
              onPress={() => setAccountFilter(null)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: accountFilter === null ? C.accent + '18' : C.card,
                borderWidth: 1,
                borderColor: accountFilter === null ? C.accent + '40' : C.border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: accountFilter === null ? C.accent : C.muted }}>
                All Accounts
              </Text>
            </Pressable>
            {activeAccounts.map((acc) => {
              const active = accountFilter === acc.id;
              return (
                <Pressable
                  key={acc.id}
                  onPress={() => setAccountFilter(active ? null : acc.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 10,
                    backgroundColor: active ? C.accent + '18' : C.card,
                    borderWidth: 1,
                    borderColor: active ? C.accent + '40' : C.border,
                  }}
                >
                  {acc.icon ? <Text style={{ fontSize: 12 }}>{acc.icon}</Text> : null}
                  <Text style={{ fontSize: 12, fontWeight: '600', color: active ? C.accent : C.muted }}>
                    {acc.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Count bar ── */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <Text style={{ fontSize: 11, color: C.muted }}>
          {txCount} transaction{txCount !== 1 ? 's' : ''}
        </Text>
        <Text style={{ fontSize: 11, color: C.muted }}>
          {format(month, 'MMMM yyyy')}
        </Text>
      </View>

      {/* ── Transaction List ── */}
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.accent} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                backgroundColor: C.bg,
                paddingHorizontal: 20,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 3, height: 14, backgroundColor: C.accent, borderRadius: 2 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub, letterSpacing: 0.3 }}>
                  {section.title}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: C.muted }}>
                {section.data.length} item{section.data.length !== 1 ? 's' : ''}
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
            query.isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={C.accent} /> : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="receipt-outline" size={40} color={C.border} />
              <Text style={{ color: C.muted, fontSize: 14, marginTop: 12 }}>No transactions found</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                Tap + to add your first one
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        />
      )}

      {/* ── FAB ── */}
      <Pressable
        onPress={openModal}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 24,
          right: 20,
          width: 54,
          height: 54,
          borderRadius: 16,
          backgroundColor: C.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: C.accent,
          shadowOpacity: 0.5,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 14,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* ── Add Transaction Modal ── */}
      <Modal visible={showAdd} transparent animationType="none" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end' }}
          behavior="padding"
        >
          <Pressable
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.75)' }}
            onPress={closeModal}
          />
          <Animated.View
            style={{
              backgroundColor: C.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor: C.border,
              paddingHorizontal: 24,
              paddingTop: 16,
              transform: [{ translateY: slideAnim }],
            }}
          >
          {/* Drag indicator */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>
              Add Transaction
            </Text>
            <Pressable onPress={closeModal} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={C.muted} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
          {/* Type toggle */}
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: C.inputBg,
                  borderRadius: 12,
                  padding: 4,
                  marginBottom: 18,
                  gap: 4,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                {(['expense', 'income', 'transfer'] as const).map((t) => {
                  const active = field.value === t;
                  const tColor =
                    t === 'income' ? C.income : t === 'expense' ? C.expense : C.sub;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => field.onChange(t)}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 8,
                        alignItems: 'center',
                        backgroundColor: active ? tColor + '18' : 'transparent',
                        borderWidth: active ? 1 : 0,
                        borderColor: active ? tColor + '40' : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: active ? tColor : C.muted,
                          textTransform: 'capitalize',
                        }}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />

          {/* Amount input */}
          <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
            Amount
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
                  marginBottom: 16,
                  color: C.text,
                  backgroundColor: C.inputBg,
                  letterSpacing: -0.5,
                }}
              />
            )}
          />

          {/* Account picker (From Account for transfers) */}
          {activeAccounts.length > 0 && (
            <Controller
              control={control}
              name="account_id"
              render={({ field }) => (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
                    {txType === 'transfer' ? 'From Account' : 'Account'}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {activeAccounts.map((acc) => {
                      const active = field.value === acc.id;
                      return (
                        <Pressable
                          key={acc.id}
                          onPress={() => field.onChange(acc.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: active ? C.accent + '50' : C.border,
                            backgroundColor: active ? C.accent + '14' : C.inputBg,
                          }}
                        >
                          {acc.icon ? (
                            <Text style={{ fontSize: 12 }}>{acc.icon}</Text>
                          ) : (
                            <Ionicons
                              name={acc.type === 'bank' ? 'business-outline' : acc.type === 'card' ? 'card-outline' : acc.type === 'cash' ? 'cash-outline' : 'wallet-outline'}
                              size={14}
                              color={active ? C.accent : C.muted}
                            />
                          )}
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

          {/* To Account picker (transfer only) */}
          {txType === 'transfer' && activeAccounts.length > 0 && (
            <Controller
              control={control}
              name="to_account_id"
              render={({ field }) => (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
                    To Account
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {activeAccounts.map((acc) => {
                      const active = field.value === acc.id;
                      return (
                        <Pressable
                          key={acc.id}
                          onPress={() => field.onChange(acc.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: active ? C.accent + '50' : C.border,
                            backgroundColor: active ? C.accent + '14' : C.inputBg,
                          }}
                        >
                          {acc.icon ? (
                            <Text style={{ fontSize: 12 }}>{acc.icon}</Text>
                          ) : (
                            <Ionicons
                              name={acc.type === 'bank' ? 'business-outline' : acc.type === 'card' ? 'card-outline' : acc.type === 'cash' ? 'cash-outline' : 'wallet-outline'}
                              size={14}
                              color={active ? C.accent : C.muted}
                            />
                          )}
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
                  <View style={{ marginBottom: 14 }}>
                    <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
                      Category
                    </Text>
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

          {/* Currency */}
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
                  Currency
                </Text>
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
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  marginBottom: 20,
                  color: C.text,
                  backgroundColor: C.inputBg,
                }}
              />
            )}
          />

          {/* Save button */}
          <Pressable
            onPress={onSave}
            disabled={addMutation.isPending}
            style={{
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
            {addMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            )}
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              {addMutation.isPending ? 'Saving…' : 'Save Transaction'}
            </Text>
          </Pressable>
          </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

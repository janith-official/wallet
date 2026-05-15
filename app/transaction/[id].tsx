import { useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import { Text } from '@/components/Text';
import { CategoryPicker } from '@/components/CategoryPicker';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBaseCurrency } from '@/features/profile/ProfileContext';
import { useFxRates } from '@/features/fx/useFxRates';
import { convert } from '@/lib/currency';
import {
  useTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/features/transactions/useTransactions';
import { useCategories } from '@/features/categories/useCategories';
import { useAccounts } from '@/features/profile/useProfile';
import { toast } from '@/components/Toast';
import { confirmDialog } from '@/components/ConfirmDialog';
import { useTheme } from '@/features/theme/ThemeContext';

type FormValues = {
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  currency: string;
  account_id: string;
  to_account_id: string;
  category_id: string;
  occurred_at: string;
  note: string;
};

function Label({ children }: { children: string }) {
  const C = useTheme();
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: C.sub,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <View style={{ marginBottom: 20 }}>{children}</View>;
}

export default function TransactionDetailScreen() {
  const C = useTheme();
  const TYPE_OPTIONS: { value: FormValues['type']; label: string; color: string }[] = [
    { value: 'income', label: 'Income', color: C.income },
    { value: 'expense', label: 'Expense', color: C.expense },
    { value: 'transfer', label: 'Transfer', color: C.transfer },
  ];
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const baseCurrency = useBaseCurrency();
  const fxRatesQuery = useFxRates();

  const txQuery = useTransaction(id, userId);
  const updateMutation = useUpdateTransaction(userId);
  const deleteMutation = useDeleteTransaction(userId);
  const categoriesQuery = useCategories(userId);
  const accountsQuery = useAccounts(userId);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      type: 'expense',
      amount: '',
      currency: 'USD',
      account_id: '',
      to_account_id: '',
      category_id: '',
      occurred_at: format(new Date(), 'yyyy-MM-dd'),
      note: '',
    },
  });

  useEffect(() => {
    if (txQuery.data) {
      const tx = txQuery.data;
      reset({
        type: tx.type,
        amount: tx.amount.toString(),
        currency: tx.currency,
        account_id: tx.account_id,
        to_account_id: tx.to_account_id ?? '',
        category_id: tx.category_id ?? '',
        occurred_at: format(parseISO(tx.occurred_at), 'yyyy-MM-dd'),
        note: tx.note ?? '',
      });
    }
  }, [txQuery.data]);

  const watchType = watch('type');
  const watchAccountId = watch('account_id');
  const accounts = accountsQuery.data?.filter((a) => !a.archived) ?? [];
  const categories = categoriesQuery.data ?? [];
  const filteredCategories =
    watchType === 'income'
      ? categories.filter((c) => c.kind === 'income')
      : categories.filter((c) => c.kind === 'expense');

  useEffect(() => {
    setValue('category_id', '', { shouldDirty: false });
  }, [watchType]);

  const onSave = handleSubmit(async (values) => {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount', 'Please enter a positive number.');
      return;
    }
    if (!values.account_id) {
      toast.warning('No account', 'Please select an account.');
      return;
    }
    if (values.type === 'transfer' && !values.to_account_id) {
      toast.warning('No destination', 'Please select a destination account.');
      return;
    }

    let occurredAt: string;
    try {
      const d = new Date(values.occurred_at);
      if (isNaN(d.getTime())) throw new Error();
      occurredAt = d.toISOString();
    } catch {
      toast.error('Invalid date', 'Use format YYYY-MM-DD.');
      return;
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
      await updateMutation.mutateAsync({
        id,
        type: values.type,
        amount,
        currency: values.currency,
        amount_in_base,
        account_id: values.account_id,
        to_account_id: values.type === 'transfer' ? values.to_account_id || null : null,
        category_id: values.type !== 'transfer' ? values.category_id || null : null,
        occurred_at: occurredAt,
        note: values.note.trim() || null,
      });
      router.back();
    } catch (e: any) {
      toast.error('Save failed', e?.message ?? 'Could not save changes.');
    }
  });

  const onDelete = () => {
    confirmDialog.show({
      title: 'Delete Transaction',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          router.back();
        } catch (e: any) {
          toast.error('Delete failed', e?.message ?? 'Could not delete.');
        }
      },
    });
  };

  if (txQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!txQuery.data) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Ionicons name="alert-circle-outline" size={40} color={C.muted} />
        <Text style={{ color: C.muted, fontSize: 15 }}>Transaction not found</Text>
        <Pressable onPress={() => router.back()} style={{ padding: 10 }}>
          <Text style={{ color: C.accent, fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: insets.top + 10,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.3 }}>
          Edit Transaction
        </Text>
        <Pressable onPress={onSave} disabled={!isDirty || isSubmitting} style={{ padding: 4 }}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: '700', color: isDirty ? C.accent : C.muted }}>
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Type ── */}
        <Field>
          <Label>Type</Label>
          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {TYPE_OPTIONS.map((opt) => {
                  const active = value === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => onChange(opt.value)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: 'center',
                        borderWidth: 1.5,
                        borderColor: active ? opt.color : C.border,
                        backgroundColor: active ? opt.color + '18' : C.card,
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, fontWeight: '700', color: active ? opt.color : C.muted }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
        </Field>

        {/* ── Amount ── */}
        <Field>
          <Label>Amount</Label>
          <Controller
            control={control}
            name="amount"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={C.muted}
                style={{
                  backgroundColor: C.inputBg,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 22,
                  fontWeight: '700',
                  color: C.text,
                  letterSpacing: -0.5,
                }}
              />
            )}
          />
        </Field>

        {/* ── Currency ── */}
        <Field>
          <Label>Currency</Label>
          <Controller
            control={control}
            name="currency"
            render={({ field: { value, onChange } }) => (
              <CurrencyPicker value={value} onChange={onChange} />
            )}
          />
        </Field>

        {/* ── From Account ── */}
        <Field>
          <Label>{watchType === 'transfer' ? 'From Account' : 'Account'}</Label>
          <Controller
            control={control}
            name="account_id"
            render={({ field: { value, onChange } }) => (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {accounts.map((acc) => {
                  const active = value === acc.id;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => onChange(acc.id)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: active ? C.accent : C.border,
                        backgroundColor: active ? C.accent + '15' : C.card,
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, fontWeight: '600', color: active ? C.accent : C.sub }}
                      >
                        {acc.icon ? `${acc.icon} ` : ''}{acc.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
        </Field>

        {/* ── To Account (transfer only) ── */}
        {watchType === 'transfer' && (
          <Field>
            <Label>To Account</Label>
            <Controller
              control={control}
              name="to_account_id"
              render={({ field: { value, onChange } }) => (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {accounts
                    .filter((a) => a.id !== watchAccountId)
                    .map((acc) => {
                      const active = value === acc.id;
                      return (
                        <Pressable
                          key={acc.id}
                          onPress={() => onChange(acc.id)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 20,
                            borderWidth: 1.5,
                            borderColor: active ? C.transfer : C.border,
                            backgroundColor: active ? C.transfer + '15' : C.card,
                          }}
                        >
                          <Text
                            style={{ fontSize: 13, fontWeight: '600', color: active ? C.transfer : C.sub }}
                          >
                            {acc.icon ? `${acc.icon} ` : ''}{acc.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
              )}
            />
          </Field>
        )}

        {/* ── Category (non-transfer) ── */}
        {watchType !== 'transfer' && (
          <Field>
            <Label>Category</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field: { value, onChange } }) => (
                <CategoryPicker
                  categories={filteredCategories}
                  value={value || null}
                  onChange={(catId) => onChange(catId ?? '')}
                />
              )}
            />
          </Field>
        )}

        {/* ── Date ── */}
        <Field>
          <Label>Date (YYYY-MM-DD)</Label>
          <Controller
            control={control}
            name="occurred_at"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="2024-01-15"
                placeholderTextColor={C.muted}
                style={{
                  backgroundColor: C.inputBg,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 15,
                  color: C.text,
                }}
              />
            )}
          />
        </Field>

        {/* ── Note ── */}
        <Field>
          <Label>Note (optional)</Label>
          <Controller
            control={control}
            name="note"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Add a note…"
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: C.inputBg,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 15,
                  color: C.text,
                  textAlignVertical: 'top',
                  minHeight: 80,
                }}
              />
            )}
          />
        </Field>

        {/* ── Delete ── */}
        <Pressable
          onPress={onDelete}
          disabled={deleteMutation.isPending}
          style={{
            marginTop: 8,
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.accent + '40',
            backgroundColor: C.accent + '10',
            alignItems: 'center',
          }}
        >
          {deleteMutation.isPending ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.accent }}>
              Delete Transaction
            </Text>
          )}
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

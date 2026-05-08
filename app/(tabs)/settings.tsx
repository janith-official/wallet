import { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile, useUpdateProfile, useAccounts, useUpsertAccount } from '@/features/profile/useProfile';
import { SettingsRow, SettingsSeparator } from '@/components/SettingsRow';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { formatMoney } from '@/lib/currency';
import type { Account } from '@/features/profile/useProfile';
import type { SupportedCurrency } from '@/components/CurrencyPicker';

const C = {
  bg: '#0f0f0f',
  card: '#1a1a1a',
  border: '#2a2a2a',
  text: '#f9fafb',
  muted: '#9ca3af',
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
  overflow: 'hidden' as const,
};

type AccountFormValues = {
  name: string;
  type: string;
  currency: SupportedCurrency;
  opening_balance: string;
  archived: boolean;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const email = session?.user.email ?? '';

  const profileQuery = useProfile(userId);
  const updateProfile = useUpdateProfile(userId);
  const accountsQuery = useAccounts(userId);
  const upsertAccount = useUpsertAccount(userId);

  const [editingAccount, setEditingAccount] = useState<Account | null | 'new'>(null);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const profile = profileQuery.data;
  const initials = (profile?.display_name ?? email).slice(0, 1).toUpperCase();

  const openAccountModal = (acc: Account | 'new') => {
    setEditingAccount(acc);
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  };
  const closeAccountModal = () => {
    Animated.timing(slideAnim, { toValue: 600, duration: 240, useNativeDriver: true }).start(() =>
      setEditingAccount(null),
    );
  };

  const { control, handleSubmit, reset, setValue } = useForm<AccountFormValues>({
    defaultValues: { name: '', type: 'bank', currency: 'USD', opening_balance: '0', archived: false },
  });

  const openWithData = (acc: Account | 'new') => {
    if (acc === 'new') {
      reset({ name: '', type: 'bank', currency: 'USD', opening_balance: '0', archived: false });
    } else {
      reset({
        name: acc.name,
        type: acc.type,
        currency: acc.currency,
        opening_balance: String(acc.opening_balance),
        archived: acc.archived,
      });
    }
    openAccountModal(acc);
  };

  const onSaveAccount = handleSubmit(async (values) => {
    try {
      await upsertAccount.mutateAsync({
        id: editingAccount !== 'new' && editingAccount ? editingAccount.id : undefined,
        name: values.name,
        type: values.type,
        currency: values.currency,
        opening_balance: parseFloat(values.opening_balance) || 0,
        archived: values.archived,
      });
      closeAccountModal();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save.');
    }
  });

  const onEditDisplayName = () => {
    Alert.prompt(
      'Display name',
      'Enter your display name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (name) => {
            if (name) updateProfile.mutate({ display_name: name });
          },
        },
      ],
      'plain-text',
      profile?.display_name ?? '',
    );
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Sign out failed', error.message);
  };

  const version =
    (Constants.expoConfig as { version?: string } | null)?.version ?? '';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      {/* Profile Card */}
      <View style={{ margin: 16, ...card, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: C.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>
              {profile?.display_name ?? 'No name set'}
            </Text>
            <Text style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{email}</Text>
          </View>
          <Pressable onPress={onEditDisplayName}>
            <Text style={{ fontSize: 13, color: C.accent }}>Edit</Text>
          </Pressable>
        </View>
      </View>

      {/* Preferences */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: C.muted,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginHorizontal: 16,
          marginBottom: 6,
        }}
      >
        Preferences
      </Text>
      <View style={{ marginHorizontal: 16, marginBottom: 20, ...card, padding: 16 }}>
        <Text style={{ fontSize: 14, color: C.text, marginBottom: 10 }}>Base Currency</Text>
        <CurrencyPicker
          value={profile?.base_currency ?? 'USD'}
          onChange={(c) => updateProfile.mutate({ base_currency: c })}
        />
      </View>

      {/* Accounts */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: C.muted,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginHorizontal: 16,
          marginBottom: 6,
        }}
      >
        Accounts
      </Text>
      <View style={{ marginHorizontal: 16, marginBottom: 20, ...card }}>
        {(accountsQuery.data ?? []).map((acc, i) => (
          <View key={acc.id}>
            {i > 0 && <SettingsSeparator />}
            <SettingsRow
              label={acc.name}
              value={formatMoney(acc.opening_balance, acc.currency)}
              onPress={() => openWithData(acc)}
            />
          </View>
        ))}
        {(accountsQuery.data?.length ?? 0) > 0 && <SettingsSeparator />}
        <SettingsRow label="+ Add Account" onPress={() => openWithData('new')} showChevron={false} labelColor={C.accent} />
      </View>

      {/* Sign Out */}
      <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <Pressable
          onPress={signOut}
          style={{ backgroundColor: C.expense, paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Sign out</Text>
        </Pressable>
      </View>

      {version ? (
        <Text style={{ textAlign: 'center', color: C.muted, fontSize: 12 }}>v{version}</Text>
      ) : null}

      {/* Account Modal */}
      <Modal
        visible={editingAccount !== null}
        transparent
        animationType="none"
        onRequestClose={closeAccountModal}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}
          onPress={closeAccountModal}
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 20 }}>
            {editingAccount === 'new' ? 'Add Account' : 'Edit Account'}
          </Text>

          {(['name', 'type', 'opening_balance'] as const).map((field) => (
            <Controller
              key={field}
              control={control}
              name={field}
              render={({ field: f }) => (
                <TextInput
                  placeholder={
                    field === 'name'
                      ? 'Account name'
                      : field === 'type'
                        ? 'Type (bank, cash, card…)'
                        : 'Opening balance'
                  }
                  keyboardType={field === 'opening_balance' ? 'decimal-pad' : 'default'}
                  value={f.value as string}
                  onChangeText={f.onChange}
                  placeholderTextColor={C.muted}
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
          ))}

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

          {editingAccount !== 'new' && (
            <Controller
              control={control}
              name="archived"
              render={({ field }) => (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}
                >
                  <Text style={{ fontSize: 15, color: C.text }}>Archived</Text>
                  <Switch
                    value={field.value}
                    onValueChange={field.onChange}
                    trackColor={{ true: C.accent }}
                  />
                </View>
              )}
            />
          )}

          <Pressable
            onPress={onSaveAccount}
            disabled={upsertAccount.isPending}
            style={{
              backgroundColor: C.accent,
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: 'center',
              marginTop: editingAccount !== 'new' ? 0 : 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              {upsertAccount.isPending ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </Animated.View>
      </Modal>
    </ScrollView>
  );
}

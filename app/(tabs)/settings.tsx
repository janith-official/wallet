import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useForm, Controller } from 'react-hook-form';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useChangeEmail,
  useChangePassword,
  useAccounts,
  useUpsertAccount,
  useDeleteAccount,
  useReorderAccounts,
  useAccountBalances,
} from '@/features/profile/useProfile';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { formatMoney } from '@/lib/currency';
import type { Account } from '@/features/profile/useProfile';
import type { SupportedCurrency } from '@/components/CurrencyPicker';

/* ── palette (matches dashboard / transactions / budgets) ── */
const C = {
  bg: '#0a0a0c',
  card: '#141416',
  border: '#1e1e24',
  text: '#f0f0f5',
  sub: '#b0b0be',
  muted: '#5c5c70',
  accent: '#dc2626',
  expense: '#f87171',
  income: '#34d399',
  inputBg: '#0e0e10',
  blue: '#60a5fa',
  purple: '#a78bfa',
  amber: '#f59e0b',
};

const ACCOUNT_TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  bank: { icon: 'business-outline', color: C.blue },
  cash: { icon: 'cash-outline', color: C.income },
  card: { icon: 'card-outline', color: C.purple },
  wallet: { icon: 'wallet-outline', color: C.amber },
};

function accountMeta(type: string) {
  return ACCOUNT_TYPE_META[type] ?? { icon: 'wallet-outline' as const, color: C.sub };
}

const ICON_OPTIONS = ['💰', '💵', '💳', '🏦', '👛', '💎', '🪙', '📊'];
const COLOR_OPTIONS = ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#f87171', '#ec4899', '#14b8a6', '#fb923c'];

type AccountFormValues = {
  name: string;
  type: string;
  currency: SupportedCurrency;
  opening_balance: string;
  archived: boolean;
  icon: string;
  color: string;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const email = session?.user.email ?? '';

  const profileQuery = useProfile(userId);
  const updateProfile = useUpdateProfile(userId);
  const uploadAvatar = useUploadAvatar(userId);
  const changeEmail = useChangeEmail();
  const changePassword = useChangePassword();
  const accountsQuery = useAccounts(userId);
  const upsertAccount = useUpsertAccount(userId);
  const deleteAccount = useDeleteAccount(userId);
  const reorderAccounts = useReorderAccounts(userId);
  const balancesQuery = useAccountBalances(userId);

  const [editingAccount, setEditingAccount] = useState<Account | null | 'new'>(null);
  const slideAnim = useRef(new Animated.Value(600)).current;

  // Edit Profile modal state
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const profile = profileQuery.data;
  const initials = (profile?.display_name ?? email).slice(0, 2).toUpperCase();
  const accounts = accountsQuery.data ?? [];
  const activeAccounts = accounts.filter((a) => !a.archived);
  const archivedAccounts = accounts.filter((a) => a.archived);
  const balances = balancesQuery.data;

  /* ── Profile Modal ── */
  const openProfileModal = () => {
    setProfileName(profile?.display_name ?? '');
    setProfileEmail(email);
    setShowPasswordFields(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowProfile(true);
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        await uploadAvatar.mutateAsync(result.assets[0].uri);
      } catch (e: unknown) {
        Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload image.');
      }
    }
  };

  const onSaveProfile = async () => {
    try {
      // Save display name if changed
      const trimmedName = profileName.trim();
      if (trimmedName !== (profile?.display_name ?? '')) {
        await updateProfile.mutateAsync({ display_name: trimmedName || null });
      }

      // Save email if changed
      const trimmedEmail = profileEmail.trim().toLowerCase();
      if (trimmedEmail && trimmedEmail !== email) {
        await changeEmail.mutateAsync(trimmedEmail);
        Alert.alert(
          'Confirmation required',
          'A confirmation link has been sent to both your old and new email addresses. Please check your inbox.',
        );
      }

      // Save password if provided
      if (showPasswordFields && newPassword) {
        if (newPassword.length < 6) {
          Alert.alert('Password too short', 'Password must be at least 6 characters.');
          return;
        }
        if (newPassword !== confirmPassword) {
          Alert.alert('Passwords do not match', 'Please make sure both fields match.');
          return;
        }
        await changePassword.mutateAsync(newPassword);
        Alert.alert('Password updated', 'Your password has been changed successfully.');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordFields(false);
      }

      setShowProfile(false);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save changes.');
    }
  };

  const isSavingProfile = updateProfile.isPending || changeEmail.isPending || changePassword.isPending;

  /* ── Account Modal ── */
  const openAccountModal = (acc: Account | 'new') => {
    setEditingAccount(acc);
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  };
  const closeAccountModal = () => {
    Animated.timing(slideAnim, { toValue: 600, duration: 240, useNativeDriver: true }).start(() =>
      setEditingAccount(null),
    );
  };

  const { control, handleSubmit, reset } = useForm<AccountFormValues>({
    defaultValues: {
      name: '',
      type: 'bank',
      currency: 'LKR',
      opening_balance: '0',
      archived: false,
      icon: '',
      color: '',
    },
  });

  const openWithData = (acc: Account | 'new') => {
    if (acc === 'new') {
      reset({ name: '', type: 'bank', currency: 'LKR', opening_balance: '0', archived: false, icon: '', color: '' });
    } else {
      reset({
        name: acc.name,
        type: acc.type,
        currency: acc.currency as SupportedCurrency,
        opening_balance: String(acc.opening_balance),
        archived: acc.archived,
        icon: acc.icon ?? '',
        color: acc.color ?? '',
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
        icon: values.icon || null,
        color: values.color || null,
      });
      closeAccountModal();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save.');
    }
  });

  /* ── Reorder ── */
  const moveAccount = (index: number, direction: 'up' | 'down') => {
    const list = [...activeAccounts];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;
    [list[index], list[newIndex]] = [list[newIndex], list[index]];
    reorderAccounts.mutate(list.map((a) => a.id));
  };

  /* ── Delete ── */
  const confirmDeleteAccount = () => {
    const acc = editingAccount;
    if (!acc || acc === 'new') return;
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${acc.name}"? Transactions linked to this account will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAccount.mutate(acc.id);
            closeAccountModal();
          },
        },
      ],
    );
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Sign out failed', error.message);
  };

  const version = (Constants.expoConfig as { version?: string } | null)?.version ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 10, paddingBottom: 14 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.8 }}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
      >
        {/* ── Profile Card (tappable) ── */}
        <Pressable
          onPress={openProfileModal}
          style={({ pressed }) => ({
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            padding: 20,
            marginBottom: 24,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: C.accent + '40',
                }}
              />
            ) : (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: C.accent + '20',
                  borderWidth: 1,
                  borderColor: C.accent + '40',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: C.accent, fontSize: 20, fontWeight: '800' }}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>
                {profile?.display_name ?? 'No name set'}
              </Text>
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </View>
        </Pressable>

        {/* ── Preferences Section ── */}
        <SectionHeader icon="options-outline" label="Preferences" />
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.border,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Ionicons name="globe-outline" size={16} color={C.sub} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>Base Currency</Text>
          </View>
          <CurrencyPicker
            value={profile?.base_currency ?? 'LKR'}
            onChange={(c) => updateProfile.mutate({ base_currency: c })}
          />
        </View>

        {/* ── Accounts Section ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionHeader icon="wallet-outline" label="Accounts" />
          <Pressable
            onPress={() => openWithData('new')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: C.accent + '15',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: C.accent + '40',
            }}
          >
            <Ionicons name="add" size={14} color={C.accent} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.accent }}>Add</Text>
          </Pressable>
        </View>

        {accounts.length === 0 ? (
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: 'center',
              paddingVertical: 36,
              marginBottom: 24,
            }}
          >
            <Ionicons name="wallet-outline" size={36} color={C.border} />
            <Text style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>No accounts yet</Text>
            <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Tap + Add to create one</Text>
          </View>
        ) : (
          <View style={{ gap: 8, marginBottom: 24 }}>
            {activeAccounts.map((acc, index) => (
              <AccountCard
                key={acc.id}
                account={acc}
                balance={balances?.get(acc.id)}
                onPress={() => router.push(`/account/${acc.id}`)}
                onEdit={() => openWithData(acc)}
                onMoveUp={index > 0 ? () => moveAccount(index, 'up') : undefined}
                onMoveDown={index < activeAccounts.length - 1 ? () => moveAccount(index, 'down') : undefined}
              />
            ))}
            {archivedAccounts.length > 0 && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 4 }}>
                  <Ionicons name="archive-outline" size={13} color={C.muted} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                    Archived
                  </Text>
                </View>
                {archivedAccounts.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    balance={balances?.get(acc.id)}
                    onPress={() => openWithData(acc)}
                    onEdit={() => openWithData(acc)}
                    dimmed
                  />
                ))}
              </>
            )}
          </View>
        )}

        {/* ── App Info ── */}
        <SectionHeader icon="information-circle-outline" label="App" />
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.border,
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <InfoRow icon="code-slash-outline" label="Version" value={version || '—'} />
          <View style={{ height: 1, backgroundColor: C.border, marginLeft: 46 }} />
          <InfoRow icon="logo-react" label="Framework" value="Expo + React Native" />
        </View>

        {/* ── Sign Out ── */}
        <Pressable
          onPress={signOut}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 15,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.expense + '50',
            backgroundColor: pressed ? C.expense + '18' : C.expense + '10',
            marginBottom: 8,
          })}
        >
          <Ionicons name="log-out-outline" size={18} color={C.expense} />
          <Text style={{ color: C.expense, fontWeight: '700', fontSize: 15 }}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      {/* ── Edit Profile Modal (full-screen) ── */}
      <Modal visible={showProfile} animationType="slide" onRequestClose={() => setShowProfile(false)}>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 10, paddingBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable onPress={() => setShowProfile(false)} style={{ padding: 4 }}>
                  <Ionicons name="arrow-back" size={22} color={C.text} />
                </Pressable>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>Edit Profile</Text>
              </View>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          >
            {/* Avatar */}
            <View style={{ alignItems: 'center', marginBottom: 28, marginTop: 8 }}>
              <Pressable onPress={pickAvatar} style={{ position: 'relative' }}>
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 28,
                      borderWidth: 2,
                      borderColor: C.accent + '40',
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 28,
                      backgroundColor: C.accent + '20',
                      borderWidth: 2,
                      borderColor: C.accent + '40',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: C.accent, fontSize: 32, fontWeight: '800' }}>{initials}</Text>
                  </View>
                )}
                {/* Camera overlay */}
                {uploadAvatar.isPending ? (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: C.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: C.bg,
                    }}
                  >
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                ) : (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: C.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: C.bg,
                    }}
                  >
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                )}
              </Pressable>
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Tap to change photo</Text>
            </View>

            {/* Display Name */}
            <SectionHeader icon="person-outline" label="Display Name" />
            <TextInput
              value={profileName}
              onChangeText={setProfileName}
              placeholder="Your name"
              placeholderTextColor={C.muted}
              style={{
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 15,
                color: C.text,
                backgroundColor: C.card,
                marginBottom: 24,
              }}
            />

            {/* Email */}
            <SectionHeader icon="mail-outline" label="Email Address" />
            <TextInput
              value={profileEmail}
              onChangeText={setProfileEmail}
              placeholder="your@email.com"
              placeholderTextColor={C.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 15,
                color: C.text,
                backgroundColor: C.card,
                marginBottom: 4,
              }}
            />
            <Text style={{ fontSize: 11, color: C.muted, marginBottom: 24, paddingHorizontal: 4 }}>
              Changing email requires confirmation from both addresses.
            </Text>

            {/* Password */}
            <SectionHeader icon="lock-closed-outline" label="Password" />
            {!showPasswordFields ? (
              <Pressable
                onPress={() => setShowPasswordFields(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: C.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  marginBottom: 24,
                }}
              >
                <Ionicons name="key-outline" size={16} color={C.sub} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }}>Change Password</Text>
                <View style={{ flex: 1 }} />
                <Ionicons name="chevron-forward" size={16} color={C.muted} />
              </Pressable>
            ) : (
              <View
                style={{
                  backgroundColor: C.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 16,
                  marginBottom: 24,
                  gap: 12,
                }}
              >
                <View>
                  <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
                    New Password
                  </Text>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={C.muted}
                    secureTextEntry
                    style={{
                      borderWidth: 1,
                      borderColor: C.border,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 14,
                      color: C.text,
                      backgroundColor: C.inputBg,
                    }}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
                    Confirm Password
                  </Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter password"
                    placeholderTextColor={C.muted}
                    secureTextEntry
                    style={{
                      borderWidth: 1,
                      borderColor: C.border,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 14,
                      color: C.text,
                      backgroundColor: C.inputBg,
                    }}
                  />
                </View>
                {newPassword.length > 0 && newPassword.length < 6 && (
                  <Text style={{ fontSize: 11, color: C.expense }}>Password must be at least 6 characters</Text>
                )}
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <Text style={{ fontSize: 11, color: C.expense }}>Passwords do not match</Text>
                )}
                <Pressable
                  onPress={() => {
                    setShowPasswordFields(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
                >
                  <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
              </View>
            )}

            {/* Save Button */}
            <Pressable
              onPress={onSaveProfile}
              disabled={isSavingProfile}
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
              {isSavingProfile ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
              )}
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Account Modal ── */}
      <Modal visible={editingAccount !== null} transparent animationType="none" onRequestClose={closeAccountModal}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' }} onPress={closeAccountModal} />
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
            paddingTop: 16,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View
            style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 22,
              paddingHorizontal: 24,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>
              {editingAccount === 'new' ? 'Add Account' : 'Edit Account'}
            </Text>
            <Pressable onPress={closeAccountModal} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={C.muted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
            style={{ maxHeight: 520 }}
          >
            <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
              Account Name
            </Text>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <TextInput
                  placeholder="e.g. Main checking"
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

            <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
              Type
            </Text>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  {(['bank', 'cash', 'card', 'wallet'] as const).map((t) => {
                    const active = field.value === t;
                    const meta = accountMeta(t);
                    return (
                      <Pressable
                        key={t}
                        onPress={() => field.onChange(t)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: active ? meta.color + '15' : C.inputBg,
                          borderWidth: 1,
                          borderColor: active ? meta.color + '40' : C.border,
                        }}
                      >
                        <Ionicons name={meta.icon} size={18} color={active ? meta.color : C.muted} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: active ? meta.color : C.muted,
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

            <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
              Icon
            </Text>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {ICON_OPTIONS.map((emoji) => {
                      const active = field.value === emoji;
                      return (
                        <Pressable
                          key={emoji}
                          onPress={() => field.onChange(active ? '' : emoji)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: active ? C.accent + '20' : C.inputBg,
                            borderWidth: 1,
                            borderColor: active ? C.accent : C.border,
                          }}
                        >
                          <Text style={{ fontSize: 20 }}>{emoji}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            />

            <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
              Color
            </Text>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  {COLOR_OPTIONS.map((c) => {
                    const active = field.value === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => field.onChange(active ? '' : c)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: c,
                          borderWidth: 2,
                          borderColor: active ? C.text : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {active && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />

            <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
              Opening Balance
            </Text>
            <Controller
              control={control}
              name="opening_balance"
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
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
                    Currency
                  </Text>
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
                      backgroundColor: C.inputBg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: C.border,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      marginBottom: 20,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="archive-outline" size={16} color={C.sub} />
                      <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }}>Archived</Text>
                    </View>
                    <Switch
                      value={field.value}
                      onValueChange={field.onChange}
                      trackColor={{ false: C.border, true: C.accent }}
                      thumbColor="#fff"
                    />
                  </View>
                )}
              />
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={onSaveAccount}
                disabled={upsertAccount.isPending}
                style={{
                  flex: 1,
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
                {upsertAccount.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                )}
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                  {upsertAccount.isPending ? 'Saving...' : editingAccount === 'new' ? 'Add Account' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>

            {editingAccount !== 'new' && editingAccount && (
              <Pressable
                onPress={confirmDeleteAccount}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 13,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.expense + '40',
                  backgroundColor: C.expense + '10',
                  marginTop: 10,
                }}
              >
                <Ionicons name="trash-outline" size={16} color={C.expense} />
                <Text style={{ color: C.expense, fontWeight: '600', fontSize: 14 }}>Delete Account</Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

/* ── Helper Components ── */

function SectionHeader({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Ionicons name={icon} size={15} color={C.accent} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}

function AccountCard({
  account,
  balance,
  onPress,
  onEdit,
  onMoveUp,
  onMoveDown,
  dimmed,
}: {
  account: Account;
  balance?: number;
  onPress: () => void;
  onEdit: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  dimmed?: boolean;
}) {
  const meta = accountMeta(account.type);
  const displayColor = account.color || meta.color;
  const displayBalance = balance ?? account.opening_balance;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: C.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
        opacity: pressed ? 0.85 : dimmed ? 0.5 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: displayColor + '15',
          borderWidth: 1,
          borderColor: displayColor + '30',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {account.icon ? (
          <Text style={{ fontSize: 18 }}>{account.icon}</Text>
        ) : (
          <Ionicons name={meta.icon} size={18} color={displayColor} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{account.name}</Text>
        <Text style={{ fontSize: 11, color: C.muted, marginTop: 2, textTransform: 'capitalize' }}>{account.type}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.3 }}>
          {formatMoney(displayBalance, account.currency)}
        </Text>
        <View
          style={{
            marginTop: 4,
            backgroundColor: C.inputBg,
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: '700', color: C.muted, letterSpacing: 0.4 }}>{account.currency}</Text>
        </View>
      </View>
      {!dimmed && (onMoveUp || onMoveDown) && (
        <View style={{ gap: 2 }}>
          <Pressable onPress={onMoveUp} disabled={!onMoveUp} style={{ padding: 4, opacity: onMoveUp ? 1 : 0.2 }}>
            <Ionicons name="chevron-up" size={14} color={C.muted} />
          </Pressable>
          <Pressable onPress={onMoveDown} disabled={!onMoveDown} style={{ padding: 4, opacity: onMoveDown ? 1 : 0.2 }}>
            <Ionicons name="chevron-down" size={14} color={C.muted} />
          </Pressable>
        </View>
      )}
      <Pressable onPress={onEdit} style={{ padding: 4 }}>
        <Ionicons name="create-outline" size={16} color={C.muted} />
      </Pressable>
    </Pressable>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
      <Ionicons name={icon} size={18} color={C.sub} />
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: C.text }}>{label}</Text>
      <Text style={{ fontSize: 13, color: C.sub }}>{value}</Text>
    </View>
  );
}

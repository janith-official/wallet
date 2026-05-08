import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/Text';
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/supabase/client';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
      return;
    }
    if (!data.session) {
      // Email confirmation is required — session won't exist yet
      Alert.alert(
        'Check your email',
        'Click the confirmation link we sent you, then sign in.',
        [{ text: 'Go to sign in', onPress: () => router.replace('/(auth)/sign-in') }],
      );
    }
    // If data.session exists (email confirmation disabled), AuthGate automatically
    // redirects to /(tabs) — no extra navigation needed here.
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#0f0f0f' }}
    >
      <Text style={{ fontSize: 32, fontWeight: '800', color: '#f9fafb', marginBottom: 8, letterSpacing: -0.5 }}>Create account</Text>
      <Text style={{ fontSize: 14, color: '#9ca3af', marginBottom: 4 }}>Start tracking your finances</Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor="#6b7280"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={input}
      />
      <TextInput
        placeholder="Password (min 8 chars)"
        placeholderTextColor="#6b7280"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={input}
      />
      <Pressable onPress={onSubmit} disabled={busy} style={btn}>
        <Text style={btnText}>{busy ? 'Creating…' : 'Create account'}</Text>
      </Pressable>
      <Link href="/(auth)/sign-in" style={{ textAlign: 'center', marginTop: 12, color: '#dc2626', fontSize: 14 }}>
        Already have an account? Sign in
      </Link>
    </KeyboardAvoidingView>
  );
}

const input = {
  borderWidth: 1,
  borderColor: '#2a2a2a',
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 14,
  fontSize: 16,
  color: '#f9fafb',
  backgroundColor: '#1a1a1a',
} as const;

const btn = {
  backgroundColor: '#dc2626',
  paddingVertical: 15,
  borderRadius: 10,
  alignItems: 'center' as const,
  shadowColor: '#dc2626',
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 4,
};

const btnText = { color: 'white', fontSize: 16, fontWeight: '700' } as const;

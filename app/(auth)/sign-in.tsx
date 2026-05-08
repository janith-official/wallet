import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Text } from '@/components/Text';
import { Link } from 'expo-router';
import { supabase } from '@/supabase/client';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) Alert.alert('Sign in failed', error.message);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#0f0f0f' }}
    >
      <Text style={{ fontSize: 32, fontWeight: '800', color: '#f9fafb', marginBottom: 8, letterSpacing: -0.5 }}>Welcome back</Text>
      <Text style={{ fontSize: 14, color: '#9ca3af', marginBottom: 4 }}>Sign in to continue</Text>
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
        placeholder="Password"
        placeholderTextColor="#6b7280"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={input}
      />
      <Pressable onPress={onSubmit} disabled={busy} style={btn}>
        <Text style={btnText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>
      <Link href="/(auth)/sign-up" style={{ textAlign: 'center', marginTop: 12, color: '#dc2626', fontSize: 14 }}>
        Create an account
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

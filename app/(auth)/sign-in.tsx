import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
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
      style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}
    >
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 12 }}>Welcome back</Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={input}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={input}
      />
      <Pressable onPress={onSubmit} disabled={busy} style={btn}>
        <Text style={btnText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>
      <Link href="/(auth)/sign-up" style={{ textAlign: 'center', marginTop: 12, color: '#2563eb' }}>
        Create an account
      </Link>
    </KeyboardAvoidingView>
  );
}

const input = {
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 12,
  fontSize: 16,
} as const;

const btn = {
  backgroundColor: '#111827',
  paddingVertical: 14,
  borderRadius: 8,
  alignItems: 'center' as const,
};

const btnText = { color: 'white', fontSize: 16, fontWeight: '600' } as const;

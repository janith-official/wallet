import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/supabase/client';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) Alert.alert('Sign up failed', error.message);
    else Alert.alert('Check your email', 'Confirm your address to finish signing up.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}
    >
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 12 }}>Create account</Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={input}
      />
      <TextInput
        placeholder="Password (min 8 chars)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={input}
      />
      <Pressable onPress={onSubmit} disabled={busy} style={btn}>
        <Text style={btnText}>{busy ? 'Creating…' : 'Create account'}</Text>
      </Pressable>
      <Link href="/(auth)/sign-in" style={{ textAlign: 'center', marginTop: 12, color: '#2563eb' }}>
        Already have an account? Sign in
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

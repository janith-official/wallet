import { Alert, Pressable, Text, View } from 'react-native';
import { supabase } from '@/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export default function Settings() {
  const { session } = useAuth();

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Sign out failed', error.message);
  };

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Settings</Text>
      <Text style={{ color: '#6b7280' }}>Signed in as {session?.user.email}</Text>
      <Pressable
        onPress={signOut}
        style={{ backgroundColor: '#dc2626', padding: 14, borderRadius: 8, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

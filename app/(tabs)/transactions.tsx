import { Text, View } from 'react-native';

export default function Transactions() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Transactions</Text>
      <Text style={{ color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
        Add, edit, and filter transactions here.
      </Text>
    </View>
  );
}

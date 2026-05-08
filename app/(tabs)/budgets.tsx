import { Text, View } from 'react-native';

export default function Budgets() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Budgets</Text>
      <Text style={{ color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
        Set monthly limits per category and get alerted near the cap.
      </Text>
    </View>
  );
}

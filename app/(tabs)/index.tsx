import { Text, View } from 'react-native';

export default function Dashboard() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Dashboard</Text>
      <Text style={{ color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
        Charts and monthly totals will appear here.
      </Text>
    </View>
  );
}

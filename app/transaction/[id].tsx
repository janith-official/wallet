import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18 }}>Transaction {id}</Text>
      <Text style={{ color: '#6b7280', marginTop: 8 }}>Detail / edit form goes here.</Text>
    </View>
  );
}

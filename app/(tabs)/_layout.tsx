import { ActivityIndicator, Dimensions, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import { TabBar } from '@/components/TabBar';

const { Navigator } = createMaterialTopTabNavigator();
const Tabs = withLayoutContext(Navigator);

const SCREEN_WIDTH = Dimensions.get('window').width;

function LazyPlaceholder() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0c', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#dc2626" size="large" />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      tabBarPosition="bottom"
      initialLayout={{ width: SCREEN_WIDTH }}
      lazyPreloadDistance={1}
      screenOptions={{
        swipeEnabled: true,
        lazy: true,
        animationEnabled: true,
        lazyPlaceholder: LazyPlaceholder,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

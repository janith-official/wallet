import { useCallback } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';
import { Text } from '@/components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAccounts, useAccountBalances } from '@/features/profile/useProfile';
import { useTransactions } from '@/features/transactions/useTransactions';
import { TransactionRow } from '@/components/TransactionRow';
import { formatMoney } from '@/lib/currency';
import type { TransactionRowData } from '@/components/TransactionRow';
import { useTheme } from '@/features/theme/ThemeContext';

function groupByDate(items: TransactionRowData[]) {
  const map = new Map<string, TransactionRowData[]>();
  for (const item of items) {
    const key = format(new Date(item.occurred_at), 'MMM d, yyyy');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

export default function AccountDetailScreen() {
  const C = useTheme();
  const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    bank: { icon: 'business-outline', color: C.blue },
    cash: { icon: 'cash-outline', color: C.income },
    card: { icon: 'card-outline', color: C.purple },
    wallet: { icon: 'wallet-outline', color: C.amber },
  };
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const accountsQuery = useAccounts(userId);
  const balancesQuery = useAccountBalances(userId);
  const account = accountsQuery.data?.find((a) => a.id === id);
  const balance = balancesQuery.data?.get(id ?? '');

  // Load all transactions for this account (current month scope via large date range)
  const txQuery = useTransactions(userId, new Date(), 'all', id ?? null);
  const allItems: TransactionRowData[] = (txQuery.data?.pages ?? []).flat();
  const sections = groupByDate(allItems);

  const onEndReached = useCallback(() => {
    if (txQuery.hasNextPage && !txQuery.isFetchingNextPage) {
      txQuery.fetchNextPage();
    }
  }, [txQuery]);

  if (!account && accountsQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!account) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="alert-circle-outline" size={40} color={C.muted} />
        <Text style={{ color: C.muted, fontSize: 15, marginTop: 12 }}>Account not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20, padding: 10 }}>
          <Text style={{ color: C.accent, fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const meta = TYPE_META[account.type] ?? { icon: 'wallet-outline' as const, color: C.sub };
  const displayColor = account.color || meta.color;
  const displayBalance = balance ?? account.opening_balance;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 10, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </Pressable>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: displayColor + '18',
              borderWidth: 1,
              borderColor: displayColor + '30',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {account.icon ? (
              <Text style={{ fontSize: 16 }}>{account.icon}</Text>
            ) : (
              <Ionicons name={meta.icon} size={16} color={displayColor} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>
              {account.name}
            </Text>
            <Text style={{ fontSize: 11, color: C.muted, textTransform: 'capitalize' }}>
              {account.type} · {account.currency}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Balance Card ── */}
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 20,
          backgroundColor: C.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.border,
          overflow: 'hidden',
        }}
      >
        <View style={{ height: 3, backgroundColor: displayColor }} />
        <View style={{ padding: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: displayColor }} />
            <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Current Balance
            </Text>
          </View>
          <Text
            style={{
              fontSize: 36,
              fontWeight: '800',
              color: C.text,
              letterSpacing: -1.5,
              marginBottom: 12,
            }}
          >
            {formatMoney(displayBalance, account.currency)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flag-outline" size={12} color={C.muted} />
            <Text style={{ fontSize: 12, color: C.muted }}>
              Opening balance: {formatMoney(account.opening_balance, account.currency)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Transactions Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 20,
          marginBottom: 8,
        }}
      >
        <Ionicons name="time-outline" size={15} color={C.accent} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          Recent Transactions
        </Text>
      </View>

      {/* ── Transaction List ── */}
      {txQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.accent} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                backgroundColor: C.bg,
                paddingHorizontal: 20,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 3, height: 14, backgroundColor: displayColor, borderRadius: 2 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub, letterSpacing: 0.3 }}>
                  {section.title}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: C.muted }}>
                {section.data.length} item{section.data.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TransactionRow
              item={item}
              onPress={(txId) => router.push(`/transaction/${txId}`)}
              showDate
            />
          )}
          stickySectionHeadersEnabled
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            txQuery.isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={C.accent} /> : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="receipt-outline" size={40} color={C.border} />
              <Text style={{ color: C.muted, fontSize: 14, marginTop: 12 }}>No transactions this month</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      )}
    </View>
  );
}

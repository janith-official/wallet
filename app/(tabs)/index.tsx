import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, format, subMonths } from 'date-fns';
import { BarChart } from 'react-native-gifted-charts';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBaseCurrency } from '@/features/profile/ProfileContext';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { TransactionRow } from '@/components/TransactionRow';
import { formatMoney } from '@/lib/currency';

const C = {
  bg: '#0f0f0f',
  card: '#1a1a1a',
  border: '#2a2a2a',
  text: '#f9fafb',
  muted: '#9ca3af',
  income: '#22c55e',
  expense: '#ef4444',
  accent: '#dc2626',
};

const card = {
  backgroundColor: C.card,
  borderRadius: 14,
  shadowColor: '#000',
  shadowOpacity: 0.4,
  shadowRadius: 10,
  elevation: 4,
};

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <View style={{ width: 3, height: 16, backgroundColor: C.accent, borderRadius: 2 }} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{title}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const [month, setMonth] = useState(new Date());

  const baseCurrency = useBaseCurrency();

  const { transactions, accounts, income, expenses, net, categoryTotals, recentTransactions } =
    useDashboard(userId, month);

  const barData = categoryTotals.map((c) => ({
    value: Math.round(c.total),
    label: c.name.length > 6 ? c.name.slice(0, 5) + '…' : c.name,
    frontColor: c.color ?? C.accent,
  }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 12, color: C.muted, letterSpacing: 0.4 }}>{session?.user.email}</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginTop: 3 }}>
              {format(month, 'MMMM yyyy')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => setMonth((m) => subMonths(m, 1))}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, color: C.text, lineHeight: 24 }}>‹</Text>
            </Pressable>
            <Pressable
              onPress={() => setMonth((m) => addMonths(m, 1))}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, color: C.text, lineHeight: 24 }}>›</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Balance Hero Card */}
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 20,
          borderRadius: 16,
          backgroundColor: C.card,
          shadowColor: C.accent,
          shadowOpacity: 0.22,
          shadowRadius: 22,
          elevation: 8,
        }}
      >
        <View style={{ height: 3, backgroundColor: C.accent, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Net Balance
          </Text>
          {transactions.isLoading ? (
            <ActivityIndicator style={{ paddingVertical: 20 }} color={C.accent} />
          ) : (
            <>
              <Text
                style={{ fontSize: 42, fontWeight: '800', color: C.text, letterSpacing: -2, marginBottom: 20, lineHeight: 50 }}
              >
                {formatMoney(net, baseCurrency)}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: C.income + '18',
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: C.income + '40',
                  }}
                >
                  <Text style={{ fontSize: 10, color: C.income, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 }}>
                    ↑ INCOME
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.income }}>
                    {formatMoney(income, baseCurrency)}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: C.expense + '18',
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: C.expense + '40',
                  }}
                >
                  <Text style={{ fontSize: 10, color: C.expense, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 }}>
                    ↓ EXPENSES
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.expense }}>
                    {formatMoney(expenses, baseCurrency)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Spending by Category */}
      <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
        <SectionHeader title="Spending by Category" />
        <View style={{ ...card, padding: 16, overflow: 'hidden' }}>
          {barData.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>📊</Text>
              <Text style={{ color: C.muted, fontSize: 14 }}>No expenses this month</Text>
            </View>
          ) : (
            <BarChart
              data={barData}
              barWidth={32}
              spacing={14}
              hideRules={false}
              xAxisLabelTextStyle={{ fontSize: 10, color: C.muted }}
              yAxisTextStyle={{ fontSize: 10, color: C.muted }}
              yAxisTextColor={C.muted}
              backgroundColor={C.card}
              noOfSections={4}
              maxValue={Math.max(...barData.map((d) => d.value)) * 1.2}
            />
          )}
        </View>
      </View>

      {/* Accounts Strip */}
      {(accounts.data?.length ?? 0) > 0 && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ marginHorizontal: 16 }}>
            <SectionHeader title="Accounts" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {accounts.data?.map((acc) => (
              <View
                key={acc.id}
                style={{
                  width: 152,
                  borderRadius: 12,
                  backgroundColor: C.card,
                  borderWidth: 1,
                  borderColor: C.border,
                  shadowColor: '#000',
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 3,
                  overflow: 'hidden',
                }}
              >
                <View style={{ height: 2, backgroundColor: C.accent }} />
                <View style={{ padding: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: C.muted, marginTop: 2, textTransform: 'capitalize' }}>
                    {acc.type}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: C.accent, marginTop: 10, letterSpacing: -0.5 }}>
                    {formatMoney(acc.opening_balance, acc.currency)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Transactions */}
      <View style={{ marginHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 3, height: 16, backgroundColor: C.accent, borderRadius: 2 }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Recent</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/transactions' as never)}>
            <Text style={{ fontSize: 13, color: C.accent, fontWeight: '600' }}>See all ›</Text>
          </Pressable>
        </View>
        <View style={{ ...card, overflow: 'hidden' }}>
          {recentTransactions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>💸</Text>
              <Text style={{ color: C.muted, fontSize: 14 }}>No transactions this month</Text>
            </View>
          ) : (
            recentTransactions.map((t, i) => (
              <TransactionRow
                key={t.id ?? i}
                item={t}
                onPress={(id) => router.push(`/transaction/${id}` as never)}
                showDate
              />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

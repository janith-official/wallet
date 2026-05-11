import { useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { Text } from '@/components/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, format, getDaysInMonth, subMonths } from 'date-fns';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBaseCurrency } from '@/features/profile/ProfileContext';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { useAccountBalances } from '@/features/profile/useProfile';
import { TransactionRow } from '@/components/TransactionRow';
import { formatMoney } from '@/lib/currency';

const SCREEN_W = Dimensions.get('window').width;
const CARD_MARGIN = 16;
const CARD_INNER = SCREEN_W - CARD_MARGIN * 2 - 40; // chart usable width (card padding 20*2)

/* ── palette ── */
const C = {
  bg: '#0a0a0c',
  card: '#141416',
  border: '#1e1e24',
  text: '#f0f0f5',
  sub: '#b0b0be',
  muted: '#5c5c70',
  income: '#34d399',
  expense: '#f87171',
  accent: '#dc2626',
  purple: '#a78bfa',
  blue: '#60a5fa',
  cyan: '#22d3ee',
};

/* ── simple card ── */
function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </View>
  );
}

function SectionLabel({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Ionicons name={icon as any} size={15} color={C.accent} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        {title}
      </Text>
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
  const balancesQuery = useAccountBalances(userId);
  const balances = balancesQuery.data;

  /* ── derived data ── */
  const pieData = useMemo(() => {
    const inc = income || 0;
    const exp = expenses || 0;
    if (inc === 0 && exp === 0) return [];
    return [
      { value: inc, color: C.income },
      { value: exp, color: C.expense },
    ];
  }, [income, expenses]);

  const savingsRate = useMemo(() => {
    if (!income || income === 0) return 0;
    return Math.max(0, Math.round(((income - expenses) / income) * 100));
  }, [income, expenses]);

  const dailySpending = useMemo(() => {
    const txs = transactions.data ?? [];
    const days = getDaysInMonth(month);
    const map = new Map<number, number>();
    txs.forEach((t: any) => {
      if (t.type === 'expense') {
        const day = new Date(t.occurred_at).getDate();
        map.set(day, (map.get(day) ?? 0) + Math.abs(Number(t.amount_in_base) || Number(t.amount)));
      }
    });
    return Array.from({ length: days }, (_, i) => ({
      value: Math.round(map.get(i + 1) ?? 0),
      label: (i + 1) % 7 === 0 || i === 0 ? String(i + 1) : '',
    }));
  }, [transactions.data, month]);

  const barData = categoryTotals.map((c, i) => ({
    value: Math.round(c.total),
    label: c.name.length > 5 ? c.name.slice(0, 4) + '…' : c.name,
    frontColor: [C.accent, C.purple, C.blue, C.cyan, C.income, C.expense, '#f59e0b'][i % 7],
  }));

  const maxBar = Math.max(...barData.map((d) => d.value), 1);
  const isLoading = transactions.isLoading;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 18,
        }}
      >
        {/* Brand: logo + name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 68, height: 68, borderRadius: 20 }}
          />
          <View style={{ gap: 1 }}>
            <RNText style={{ fontSize: 36, fontFamily: 'RussoOne_400Regular', letterSpacing: 2, lineHeight: 42 }}>
              <RNText style={{ color: C.text }}>Sav</RNText>
              <RNText style={{ color: C.accent }}>vo</RNText>
            </RNText>
            <RNText style={{ fontSize: 13, fontFamily: 'Exo2_300Light', color: C.muted, letterSpacing: 1.0, lineHeight: 17 }}>
              Your money, your story.
            </RNText>
          </View>
        </View>

        {/* Month navigator */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: C.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.border,
            overflow: 'hidden',
          }}
        >
          <Pressable
            onPress={() => setMonth((m) => subMonths(m, 1))}
            style={({ pressed }) => ({
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: pressed ? C.border : 'transparent',
            })}
          >
            <Ionicons name="chevron-back" size={16} color={C.sub} />
          </Pressable>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.sub, minWidth: 80, textAlign: 'center' }}>
            {format(month, 'MMM yyyy')}
          </Text>
          <Pressable
            onPress={() => setMonth((m) => addMonths(m, 1))}
            style={({ pressed }) => ({
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: pressed ? C.border : 'transparent',
            })}
          >
            <Ionicons name="chevron-forward" size={16} color={C.sub} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ paddingVertical: 60 }} color={C.accent} size="large" />
      ) : (
        <>
          {/* ── Balance Hero ── */}
          <View style={{ marginHorizontal: CARD_MARGIN, marginBottom: 20 }}>
            <Card>
              <LinearGradient
                colors={[C.accent + '14', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={{ height: 3, backgroundColor: C.accent, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
                <View style={{ padding: 22 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent }} />
                    <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                      Net Balance
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 42,
                      fontWeight: '800',
                      color: C.text,
                      letterSpacing: -2,
                      marginBottom: 20,
                      lineHeight: 50,
                    }}
                  >
                    {formatMoney(net, baseCurrency)}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: C.income + '12',
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: C.income + '28',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Ionicons name="trending-up" size={14} color={C.income} />
                        <Text style={{ fontSize: 10, color: C.income, fontWeight: '700', letterSpacing: 0.8 }}>
                          INCOME
                        </Text>
                      </View>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: C.income, letterSpacing: -0.5 }}>
                        {formatMoney(income, baseCurrency)}
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                        backgroundColor: C.expense + '12',
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: C.expense + '28',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Ionicons name="trending-down" size={14} color={C.expense} />
                        <Text style={{ fontSize: 10, color: C.expense, fontWeight: '700', letterSpacing: 0.8 }}>
                          EXPENSES
                        </Text>
                      </View>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: C.expense, letterSpacing: -0.5 }}>
                        {formatMoney(expenses, baseCurrency)}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Card>
          </View>

          {/* ── Donut + Savings ── */}
          <View style={{ marginHorizontal: CARD_MARGIN, marginBottom: 20 }}>
            <Card>
              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {/* Donut */}
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        color: C.muted,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        marginBottom: 16,
                      }}
                    >
                      Breakdown
                    </Text>
                    {pieData.length > 0 ? (
                      <PieChart
                        data={pieData}
                        donut
                        radius={52}
                        innerRadius={34}
                        innerCircleColor={C.card}
                        centerLabelComponent={() => (
                          <Ionicons name="wallet" size={16} color={C.muted} />
                        )}
                      />
                    ) : (
                      <View style={{ width: 104, height: 104, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: C.muted, fontSize: 12 }}>No data</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 14, marginTop: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.income }} />
                        <Text style={{ fontSize: 10, color: C.muted }}>Income</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.expense }} />
                        <Text style={{ fontSize: 10, color: C.muted }}>Expense</Text>
                      </View>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={{ width: 1, backgroundColor: C.border, marginHorizontal: 16, alignSelf: 'stretch' }} />

                  {/* Savings Rate */}
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        color: C.muted,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        marginBottom: 16,
                      }}
                    >
                      Saved
                    </Text>
                    <Text
                      style={{
                        fontSize: 38,
                        fontWeight: '800',
                        color: savingsRate > 0 ? C.income : C.expense,
                        letterSpacing: -2,
                      }}
                    >
                      {savingsRate}
                      <Text style={{ fontSize: 16, fontWeight: '600' }}>%</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>savings rate</Text>

                    {/* Progress bar with fixed width */}
                    <View
                      style={{
                        width: 100,
                        height: 6,
                        backgroundColor: C.border,
                        borderRadius: 3,
                        marginTop: 14,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: 6,
                          width: Math.min(savingsRate, 100),
                          backgroundColor: savingsRate > 0 ? C.income : C.expense,
                          borderRadius: 3,
                        }}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          </View>

          {/* ── Spending Trend ── */}
          <View style={{ marginHorizontal: CARD_MARGIN, marginBottom: 20 }}>
            <SectionLabel title="Spending Trend" icon="analytics-outline" />
            <Card>
              <View style={{ padding: 20 }}>
                {dailySpending.some((d) => d.value > 0) ? (
                  <LineChart
                    data={dailySpending}
                    width={CARD_INNER}
                    height={140}
                    color={C.accent}
                    thickness={2}
                    startFillColor={C.accent + '30'}
                    endFillColor={C.accent + '05'}
                    areaChart
                    curved
                    hideDataPoints
                    startOpacity={0.6}
                    endOpacity={0.05}
                    spacing={Math.max(6, Math.floor(CARD_INNER / dailySpending.length))}
                    backgroundColor="transparent"
                    rulesColor={C.border}
                    rulesType="dashed"
                    yAxisColor="transparent"
                    xAxisColor={C.border}
                    yAxisTextStyle={{ fontSize: 9, color: C.muted }}
                    xAxisLabelTextStyle={{ fontSize: 9, color: C.muted }}
                    noOfSections={3}
                    initialSpacing={0}
                    endSpacing={0}
                  />
                ) : (
                  <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="analytics-outline" size={28} color={C.border} />
                    <Text style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>No spending data yet</Text>
                  </View>
                )}
              </View>
            </Card>
          </View>

          {/* ── Category Breakdown ── */}
          <View style={{ marginHorizontal: CARD_MARGIN, marginBottom: 20 }}>
            <SectionLabel title="Top Categories" icon="grid-outline" />
            <Card>
              <View style={{ padding: 20 }}>
                {barData.length > 0 ? (
                  <BarChart
                    data={barData}
                    barWidth={24}
                    spacing={14}
                    roundedTop
                    roundedBottom
                    hideRules
                    xAxisLabelTextStyle={{ fontSize: 9, color: C.muted }}
                    yAxisTextStyle={{ fontSize: 9, color: C.muted }}
                    yAxisColor="transparent"
                    xAxisColor={C.border}
                    noOfSections={4}
                    maxValue={maxBar * 1.3}
                    backgroundColor="transparent"
                    barBorderRadius={4}
                    isAnimated
                    animationDuration={500}
                  />
                ) : (
                  <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="pie-chart-outline" size={28} color={C.border} />
                    <Text style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>No expenses this month</Text>
                  </View>
                )}
              </View>
            </Card>
          </View>

          {/* ── Accounts ── */}
          {(accounts.data?.length ?? 0) > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ marginHorizontal: CARD_MARGIN }}>
                <SectionLabel title="Accounts" icon="wallet-outline" />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: CARD_MARGIN, gap: 10 }}
              >
                {accounts.data?.filter((a) => !a.archived).map((acc, i) => {
                    const fallbackColor = [C.purple, C.blue, C.accent, C.cyan][i % 4];
                    const accColor = acc.color || fallbackColor;
                    const displayBalance = balances?.get(acc.id) ?? acc.opening_balance;
                    return (
                      <Pressable
                        key={acc.id}
                        onPress={() => router.push(`/account/${acc.id}`)}
                        style={({ pressed }) => ({
                          width: 156,
                          backgroundColor: C.card,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: C.border,
                          overflow: 'hidden',
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <View style={{ height: 3, backgroundColor: accColor }} />
                        <View style={{ padding: 14 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                backgroundColor: accColor + '18',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {acc.icon ? (
                                <Text style={{ fontSize: 14 }}>{acc.icon}</Text>
                              ) : (
                                <Ionicons
                                  name={acc.type === 'bank' ? 'business' : acc.type === 'card' ? 'card' : acc.type === 'cash' ? 'cash' : 'wallet'}
                                  size={14}
                                  color={accColor}
                                />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }} numberOfLines={1}>
                                {acc.name}
                              </Text>
                              <Text style={{ fontSize: 10, color: C.muted, textTransform: 'capitalize' }}>
                                {acc.type}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: accColor, letterSpacing: -0.5 }}>
                            {formatMoney(displayBalance, acc.currency)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
              </ScrollView>
            </View>
          )}

          {/* ── Recent Transactions ── */}
          <View style={{ marginHorizontal: CARD_MARGIN }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="time-outline" size={15} color={C.accent} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Recent
                </Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/transactions' as never)}>
                <Text style={{ fontSize: 12, color: C.accent, fontWeight: '600' }}>See all</Text>
              </Pressable>
            </View>
            <Card>
              {recentTransactions.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Ionicons name="receipt-outline" size={28} color={C.border} />
                  <Text style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>No transactions this month</Text>
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
            </Card>
          </View>
        </>
      )}
    </ScrollView>
  );
}

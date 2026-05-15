import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const C = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 8 }}>
      <Ionicons name={icon} size={15} color={C.accent} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}

// ── Guide card ────────────────────────────────────────────────────────────────
function GuideCard({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  const C = useTheme();
  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: C.accent + '18',
            borderWidth: 1,
            borderColor: C.accent + '35',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={16} color={C.accent} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, flex: 1 }}>{title}</Text>
      </View>
      <Text style={{ fontSize: 13, color: C.sub, lineHeight: 20 }}>{body}</Text>
    </View>
  );
}

// ── Tip callout ───────────────────────────────────────────────────────────────
function Tip({ children }: { children: string }) {
  const C = useTheme();
  return (
    <View
      style={{
        backgroundColor: C.inputBg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.border,
        borderLeftWidth: 3,
        borderLeftColor: C.accent,
        paddingHorizontal: 14,
        paddingVertical: 11,
        marginBottom: 10,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <Ionicons name="bulb-outline" size={15} color={C.accent} style={{ marginTop: 1 }} />
      <Text style={{ fontSize: 13, color: C.sub, lineHeight: 19, flex: 1 }}>{children}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function UserGuide({ visible, onClose }: Props) {
  const C = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>

        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: insets.top + 10,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>
                User Guide
              </Text>
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                Everything you need to know about Savvo
              </Text>
            </View>
            <View
              style={{
                backgroundColor: C.accent + '18',
                borderRadius: 10,
                padding: 8,
                borderWidth: 1,
                borderColor: C.accent + '35',
              }}
            >
              <Ionicons name="book-outline" size={18} color={C.accent} />
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 32 }}
        >

          {/* ── 1. Dashboard ── */}
          <SectionHeader icon="stats-chart-outline" label="Dashboard" />

          <GuideCard
            icon="wallet-outline"
            title="Net Balance"
            body="The large number at the top is your net balance for the selected month — total income minus total expenses. Green means you're ahead, red means you've overspent."
          />
          <GuideCard
            icon="pie-chart-outline"
            title="Income vs Expenses Donut"
            body="The ring chart shows the split between money coming in (green) and money going out (red) for the month. Tap the month arrows to compare different periods."
          />
          <GuideCard
            icon="trending-up-outline"
            title="Spending Trend"
            body="The line chart plots your daily cumulative spending through the month so you can spot if you're front-loading expenses or spending evenly."
          />
          <GuideCard
            icon="podium-outline"
            title="Top Categories"
            body="A bar chart of your highest-spend categories this month. Use this to identify where most of your money goes and whether to set a budget there."
          />
          <GuideCard
            icon="card-outline"
            title="Accounts Carousel"
            body="Swipe horizontally through your accounts to see the current balance of each one. Balances are calculated from the opening balance plus all recorded transactions."
          />
          <Tip>
            Use the chevron arrows next to the month name to navigate back and compare your spending across previous months.
          </Tip>

          {/* ── 2. Transactions ── */}
          <SectionHeader icon="swap-horizontal-outline" label="Transactions" />

          <GuideCard
            icon="add-circle-outline"
            title="Adding a Transaction"
            body="Tap the red + button (bottom-right) to open the Add Transaction sheet. Choose a type (Expense, Income, or Transfer), enter the amount, pick an account, optionally assign a category and currency, and add a note."
          />
          <GuideCard
            icon="options-outline"
            title="Filters"
            body="Use the chips at the top to show only Expenses, Income, or Transfers. Tap an account pill to see transactions for that account only. Filters stack — you can show all income from a specific account."
          />
          <GuideCard
            icon="create-outline"
            title="Editing & Deleting"
            body="Tap any transaction row to open the Edit Transaction screen. Change any field and tap Save in the top-right. To delete, scroll to the bottom of the edit screen and tap Delete Transaction."
          />
          <GuideCard
            icon="swap-horizontal-outline"
            title="Transfers"
            body="A Transfer moves money between two of your own accounts. Choose Transfer as the type, then pick a From Account and a To Account. The amount is deducted from one and added to the other — it does not count as income or expense."
          />
          <Tip>
            Currency is per-transaction. If you pay in USD but your base currency is LKR, Savvo converts the amount automatically using live exchange rates so your totals stay accurate.
          </Tip>

          {/* ── 3. Budgets ── */}
          <SectionHeader icon="pie-chart-outline" label="Budgets" />

          <GuideCard
            icon="calendar-outline"
            title="Monthly vs Weekly"
            body="Use the toggle at the top to switch between monthly and weekly budget views. Each period calculates independently — a monthly budget resets on the 1st, a weekly budget resets every Monday."
          />
          <GuideCard
            icon="add-circle-outline"
            title="Creating a Budget"
            body="Tap + New, optionally give it a name, link it to a category, set the amount limit and currency, and save. Savvo will automatically track spending in that category against your limit."
          />
          <GuideCard
            icon="bar-chart-outline"
            title="Progress Bar Colours"
            body="Green means you're under 80% of your limit. Amber means 80–99% — getting close. Red means you've hit or exceeded the limit. The percentage badge in each card shows exactly where you stand."
          />
          <GuideCard
            icon="refresh-outline"
            title="Reset Date"
            body="Each budget card shows when the current period ends and the budget resets. Monthly budgets reset on the first of each month; weekly budgets reset every Monday."
          />
          <Tip>
            Long-press a budget card to delete it instantly without opening the edit sheet.
          </Tip>

          {/* ── 4. Categories ── */}
          <SectionHeader icon="pricetags-outline" label="Categories" />

          <GuideCard
            icon="pricetags-outline"
            title="What Are Categories?"
            body="Categories let you label transactions (e.g. Food, Rent, Salary). Each category has a kind — Expense or Income — which controls which transactions it can be applied to."
          />
          <GuideCard
            icon="add-circle-outline"
            title="Creating a Category"
            body="Go to Budgets → tap the tag icon (top-right) → tap + New. Enter a name, choose Expense or Income, pick an emoji icon and a colour. The icon and colour appear on transaction rows and charts."
          />
          <GuideCard
            icon="trash-outline"
            title="Deleting a Category"
            body="Open the category from the Categories list and tap Delete. Existing transactions linked to that category are preserved — they simply become uncategorised. You will not lose any transaction data."
          />

          {/* ── 5. Accounts ── */}
          <SectionHeader icon="wallet-outline" label="Accounts" />

          <GuideCard
            icon="business-outline"
            title="Account Types"
            body="Bank — for bank accounts and savings.\nCash — for physical cash you carry.\nCard — for credit or debit cards.\nWallet — for digital wallets, PayPal, etc.\nThe type is visual only and does not affect calculations."
          />
          <GuideCard
            icon="cash-outline"
            title="Opening Balance"
            body="When you add an account, enter the current real-world balance as the opening balance. Savvo adds or subtracts transactions from this figure to keep the balance up to date."
          />
          <GuideCard
            icon="globe-outline"
            title="Per-Account Currency"
            body="Each account has its own currency. You can hold a USD savings account and an LKR current account at the same time. The Dashboard converts all balances to your base currency for the total."
          />
          <GuideCard
            icon="archive-outline"
            title="Archiving"
            body="Archive an account to hide it from pickers and the accounts carousel without deleting it or its transaction history. You can unarchive at any time from the Settings account list."
          />
          <GuideCard
            icon="reorder-two-outline"
            title="Reordering"
            body="Use the up/down arrows on each account card in Settings to change the display order in the Dashboard carousel and transaction pickers."
          />

          {/* ── 6. Multi-currency & FX ── */}
          <SectionHeader icon="globe-outline" label="Multi-currency & FX Rates" />

          <GuideCard
            icon="globe-outline"
            title="Base Currency"
            body="Your base currency (set in Settings → Preferences) is the currency used for all totals, charts, and budget comparisons on the Dashboard. Every other currency is converted to this for display."
          />
          <GuideCard
            icon="swap-horizontal-outline"
            title="Recording Foreign Transactions"
            body="When adding a transaction, change the Currency field to match what you actually paid in. Savvo looks up the exchange rate for that day and stores the equivalent amount in your base currency automatically."
          />
          <GuideCard
            icon="refresh-outline"
            title="Exchange Rate Updates"
            body="Rates are fetched daily from open.er-api.com (free, no API key required). If you add a transaction and rates haven't been refreshed yet, Savvo falls back to a 1:1 conversion and the amount can be corrected later by editing the transaction."
          />
          <Tip>
            To change your base currency, go to Settings → Preferences → Base Currency. Existing transaction amounts in base currency are not retroactively recalculated — only new transactions use the new base.
          </Tip>

        </ScrollView>
      </View>
    </Modal>
  );
}

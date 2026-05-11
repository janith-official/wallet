# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start        # Start Expo dev server (Metro bundler)
npm run android      # Launch Android emulator
npm run ios          # Launch iOS simulator
npm run web          # Launch web build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking (no emit)
npm run test         # Run Jest tests
npx expo start --clear  # Start with cache cleared (use after dep changes)
```

**Supabase edge functions:**
```bash
npx supabase functions deploy fx-refresh
npx supabase functions deploy run-recurring
```

**EAS builds:**
```bash
eas build --profile preview --platform android   # Internal APK
eas build --profile production --platform android # Play Store AAB
eas update --channel production                   # OTA JS-only update
```

**Adding packages:** Always use `npx expo install <pkg>` for native Expo packages so versions stay SDK-compatible. For pure JS packages, `npm install <pkg>` works (`.npmrc` has `legacy-peer-deps=true`).

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `EXPO_PUBLIC_SUPABASE_URL` — project URL (ends in `.supabase.co`, no trailing slash or path)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — publishable key (starts with `sb_publishable_` on new projects)

Restart Metro after changing `.env` — Expo reads env vars only at startup.

## Architecture

**Tech stack:** Expo SDK 54 (managed) + React Native 0.81 + Supabase + TanStack React Query + Zustand + react-hook-form + zod

**Path alias:** `@/*` resolves to `src/*` (configured in `tsconfig.json`).

### Navigation (Expo Router, file-based)

Two route groups controlled by the auth gate in `app/_layout.tsx`:
- `app/(auth)/` — sign-in and sign-up screens (unauthenticated)
- `app/(tabs)/` — Dashboard, Transactions, Budgets, Settings (authenticated)
- `app/transaction/[id].tsx` — transaction detail route (placeholder)

The tabs use `@react-navigation/material-top-tabs` (via `createMaterialTopTabNavigator` + `withLayoutContext`) positioned at the bottom, enabling native swipe-between-tabs. The `position` animated value from `MaterialTopTabBarProps` drives the pill indicator in real-time during swipes.

### Provider hierarchy (app/_layout.tsx)

`GestureHandlerRootView` → `SafeAreaProvider` → `QueryClientProvider` (30s staleTime, 1 retry) → `AuthProvider` → `ProfileProvider` → `AuthGate` (Stack)

Custom font: SpaceGrotesk (400/500/600/700) loaded via `@expo-google-fonts/space-grotesk`, with a custom `Text` component (`src/components/Text.tsx`) that maps `fontWeight` to the correct font family.

### Auth

React Context in `src/features/auth/AuthProvider.tsx`. Supabase session is persisted via `expo-secure-store` on mobile and `localStorage` on web. Auth token auto-refreshes on AppState change (`src/supabase/client.ts`).

### Data layer pattern

Each feature module in `src/features/<name>/` exports React Query hooks that wrap Supabase calls:
- **profile:** `useProfile`, `useUpdateProfile`, `useAccounts`, `useUpsertAccount`
- **transactions:** `useTransactions` (infinite query, 30/page), `useAddTransaction`
- **budgets:** `useBudgets` (with spend calculation), `useAddBudget`, `useUpdateBudget`, `useDeleteBudget`
- **categories:** `useCategories`, `useUpsertCategory`, `useDeleteCategory`
- **dashboard:** `useDashboard` (aggregates monthly income/expense/net, top categories, recent transactions)

`ProfileContext` (`src/features/profile/ProfileContext.tsx`) provides `useBaseCurrency()` globally.

### Backend

Supabase (PostgreSQL + RLS + Edge Functions). All tables have Row Level Security — users only see their own rows. Soft deletes via `deleted_at`. The Supabase client is initialized in `src/supabase/client.ts`.

## Database Schema

Migrations live in `supabase/migrations/`. Key tables:
- `profiles` — user metadata (display name, base currency). Auto-created on signup via `handle_new_user()` trigger.
- `accounts` — bank/wallet accounts (currency, opening balance, archived flag)
- `categories` — income/expense categories, hierarchical via `parent_id`, with icon (emoji) and color
- `transactions` — core records (amount, currency, `amount_in_base` for FX, type enum: income/expense/transfer)
- `budgets` — per-category spending limits (weekly/monthly period)
- `recurring_rules` — recurring transaction templates with `next_run`, cadence enum, interval, and jsonb template
- `fx_rates` — USD-pivoted exchange rates by date (shared table, readable by any authenticated user)

All `updated_at` columns are maintained by DB triggers. Enums: `tx_kind`, `cat_kind`, `budget_period`, `cadence`.

## Edge Functions

Both edge functions are Deno-based (`supabase/functions/`), use `SUPABASE_SERVICE_ROLE_KEY`:
- **fx-refresh** — fetches daily FX rates from `open.er-api.com` (free, no API key) and upserts into `fx_rates`
- **run-recurring** — materializes due recurring transactions where `next_run <= today` and advances `next_run`

Both should be scheduled via Supabase Dashboard → Database → Cron (daily). Edge functions are excluded from `tsconfig.json` (they run in Deno, not the RN runtime).

## Shared Components

- `Text` — wraps RN Text with SpaceGrotesk font mapping
- `AmountText` — formatted currency display with income/expense color coding
- `CategoryIcon` — circular emoji icon with background color
- `CategoryPicker` — pill-based category selector
- `CurrencyPicker` — toggle between supported currencies (USD, LKR, SGD)
- `ProgressBar` — budget progress with red/amber/green color coding
- `SettingsRow` / `SettingsSeparator` — iOS-style settings list items
- `TabBar` — custom animated tab bar (`MaterialTopTabBarProps`): sliding accent pill + top-line indicator driven by `position` anim value, per-icon bounce on tap, `LinearGradient` 3D bar, safe-area aware
- `TransactionRow` — transaction list item with category, amount, date

## UI Theme

Dark theme with color constants defined per-screen (not yet extracted to a shared theme). Common palette:
- Background: `#0f0f0f`, Card: `#1a1a1a`, Border: `#2a2a2a`
- Text: `#f9fafb`, Muted: `#9ca3af`
- Income: `#22c55e`, Expense: `#ef4444`, Accent: `#dc2626`

## Implementation Status

**Complete:** Auth, navigation, Supabase integration, Dashboard (charts + aggregates), Transactions list (infinite scroll + add modal), Budgets (CRUD + spend tracking + progress bars), Categories (CRUD with icon/color), Settings (profile, accounts, currency picker, sign out), custom tab bar.

**Remaining:** Local SQLite offline cache (`src/db/`), push/pull sync engine (`src/sync/`), CSV export/import (`src/features/csv/`), FX rate client-side wiring (`src/features/fx/`), recurring transaction UI (`src/features/recurring/`), transaction detail/edit screen, push notifications for budget alerts.

## Code Style

- Prettier: single quotes, trailing commas (all), 100-char print width, semicolons
- `legacy-peer-deps=true` in `.npmrc` — pass `--legacy-peer-deps` if adding packages manually
- Babel config uses `react-native-worklets/plugin` (Reanimated v4 split)

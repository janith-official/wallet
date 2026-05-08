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

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Architecture

**Tech stack:** Expo (managed) + React Native + Supabase + TanStack React Query + Zustand

**Navigation:** Expo Router (file-based). Two route groups:
- `app/(auth)/` — sign-in and sign-up screens (unauthenticated)
- `app/(tabs)/` — main tab UI: Dashboard, Transactions, Budgets, Settings

`app/_layout.tsx` is the auth gate — it reads auth state from `AuthProvider` and redirects between groups.

**Auth:** React Context in [src/features/auth/AuthProvider.tsx](src/features/auth/AuthProvider.tsx). Supabase session is persisted via `expo-secure-store` on mobile and `localStorage` on web.

**Backend:** Supabase (PostgreSQL + RLS + Edge Functions). All tables have Row Level Security — users only see their own rows. Soft deletes via `deleted_at`. The Supabase client is initialized in [src/supabase/client.ts](src/supabase/client.ts).

**Data fetching:** TanStack React Query (30s stale time) wraps all Supabase calls.

**Path alias:** `@/*` resolves to `src/*`.

## Database Schema

Migrations live in `supabase/migrations/`. Key tables:
- `profiles` — user metadata (display name, base currency)
- `accounts` — bank/wallet accounts (currency, opening balance, archived flag)
- `categories` — income/expense categories, hierarchical via `parent_id`
- `transactions` — core records (amount, currency, `amount_in_base` for FX, type, optional `recurring_rule_id`)
- `budgets` — per-category spending limits (weekly/monthly)
- `recurring_rules` — recurring transaction templates with `next_run` and cadence
- `fx_rates` — USD-pivoted exchange rates by date

All `updated_at` columns are maintained by DB triggers.

## Edge Functions

Both edge functions are Deno-based (`supabase/functions/`):
- **fx-refresh** — fetches daily FX rates from `open.er-api.com` and upserts into `fx_rates`
- **run-recurring** — materializes due recurring transactions and advances `next_run`

## Implementation Status

Phase A (authentication, navigation shell, Supabase integration) is complete. The tab screens (Dashboard, Transactions, Budgets) are currently placeholders awaiting Phase B/C implementation: transaction CRUD, budget tracking, multi-currency FX conversion, CSV import, local SQLite sync, and recurring transaction UI.

## Code Style

- Prettier: single quotes, trailing commas (all), 100-char print width, semicolons
- `legacy-peer-deps=true` in `.npmrc` — pass `--legacy-peer-deps` if adding packages manually

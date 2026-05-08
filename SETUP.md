# Wallet — Setup

A zero-cost cross-platform expense tracker. **Phase A bootstrap complete.** Subsequent phases (local SQLite + sync engine, transactions, dashboard, budgets, multi-currency, recurring, CSV) are scaffolded directories with TODO modules to fill in next.

## 1. Prerequisites

- Node 20+ and npm 10+ (this machine has Node 25 + npm 11 — fine).
- Xcode (iOS Simulator) and/or Android Studio (Emulator). Or just use the **Expo Go** app on your phone — easiest path.
- A free [Supabase](https://supabase.com) account.

## 2. First run

```bash
cp .env.example .env       # then fill in real values from your Supabase project
npm install                # already done — only needed on a fresh clone
npm run start              # opens Metro; press i for iOS, a for Android, or scan QR with Expo Go
```

If you get peer-dep errors on a fresh `npm install`, the project ships an `.npmrc` with `legacy-peer-deps=true` to avoid them.

## 3. Supabase project

1. Create a new project at https://supabase.com/dashboard (free tier).
2. Go to **Project Settings → API**, copy the **Project URL** and **anon public** key into `.env`.
3. Open **SQL Editor**, paste the contents of [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql), and run.
4. Optional CLI flow:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-ref>
   npx supabase db push
   ```

## 4. Edge functions (multi-currency + recurring)

```bash
npx supabase functions deploy fx-refresh
npx supabase functions deploy run-recurring
```

In the Supabase dashboard, **Database → Cron**:
- `fx-refresh` — daily at 04:00 UTC.
- `run-recurring` — daily at 06:00 UTC.

## 5. Project layout

```
app/                 # expo-router screens (auth + tabs)
src/
  supabase/          # Supabase client + generated types
  features/          # auth, transactions, budgets, recurring, fx, csv, categories
  db/                # local SQLite schema + repos (Phase C)
  sync/              # push/pull sync engine (Phase C)
  components/        # shared UI
  hooks/, lib/       # helpers (currency, dates, notifications)
supabase/
  migrations/        # SQL migrations
  functions/         # Deno edge functions (fx-refresh, run-recurring)
```

## 6. Building releases

```bash
npm install -g eas-cli
eas login
eas build --profile preview  --platform android   # free internal APK
eas build --profile production --platform android  # AAB for Play Store
eas build --profile production --platform ios      # needs Apple Dev account ($99/yr)
eas submit --profile production --platform <ios|android>
```

OTA JS-only updates: `eas update --channel production`.

## 7. Cost recap

| Item | Cost |
|---|---|
| Supabase free tier (500 MB DB, 50K MAU) | $0 |
| EAS Build free tier (30 builds/mo) | $0 |
| FX rates (open.er-api.com) | $0 |
| Google Play Console (one-time) | $25 |
| Apple Developer Program | $99/yr |

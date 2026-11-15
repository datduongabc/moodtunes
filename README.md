# MoodTunes

Mood-tagged music player for Android, built for CO3043 Mobile Application Development (HCMUT, semester 261).
Listeners tag songs with moods, get recommendations for how they feel, follow weekly mood charts, track a daily listening battery, share songs to other apps and run Pomodoro focus sessions that play and pause music on their own.

- Specification: Assignment 01 report (FR, NFR, architecture, data and API, UI/UX).
- Changes to the specification: [CHANGELOG-spec.md](CHANGELOG-spec.md).
- API contract: [docs/openapi.yaml](docs/openapi.yaml), with a Postman collection in [docs/moodtunes.postman_collection.json](docs/moodtunes.postman_collection.json).
- Test report: [docs/test-report.md](docs/test-report.md).
- Design: [Figma file](https://www.figma.com/design/ldKFvReiSfET2ObxAV62o5)

## Stack

| Layer | Technology |
|---|---|
| App | Expo SDK 58, React Native 0.88, TypeScript (strict), expo-router |
| State | Redux Toolkit, RTK Query |
| Audio | expo-audio (playlist, background playback, lock-screen controls) |
| Local storage | expo-sqlite (cache, outbox, settings), expo-secure-store (tokens) |
| UI | React Native Paper (Material Design 3), FlashList, Be Vietnam Pro |
| Backend | Supabase: Auth, PostgreSQL with row-level security, Edge Function `api` (Deno, Hono), pg_cron |
| Music | Jamendo (Creative Commons) |
| CI | GitHub Actions: lint, type check, tests, secret scan, release APK |

## Run the app

Requirements: Node.js 22, and either an Android device with USB debugging or an Android emulator (API 29 or later) with Android Studio and JDK 17.

```bash
git clone <repository-url> moodtunes
cd moodtunes
cp .env.example .env        # then fill in the two Supabase values, see below
npm ci
npx expo run:android        # builds a development build and starts Metro
```

### Supabase keys

`.env.example` is committed without values; the backend is hosted, so no local server is needed, but `.env` must contain the URL and the publishable key of the Supabase project.
Without them the app stops at start-up with `Missing EXPO_PUBLIC_SUPABASE_URL`.

- **Team members:** open the project in the [Supabase dashboard](https://supabase.com/dashboard), go to **Project Settings → API Keys**, and copy the project URL into `EXPO_PUBLIC_SUPABASE_URL` and the **publishable** key (`sb_publishable_...`) into `EXPO_PUBLIC_SUPABASE_KEY`.
- **Assessors:** the two values are provided with the assignment submission. Paste them into `.env` as above.
- **Your own backend:** create a project as described in [Backend](#backend) and use its URL and publishable key.

Both values are public by design and every table is protected by row-level security (NFR-SEC-03).
Never put the **secret** or **service_role** key in `.env`: it bypasses row-level security, and every `EXPO_PUBLIC_` variable is bundled into the app.
After editing `.env`, restart Metro so that the new values are picked up.

The release APK does not need `.env`: the release workflow reads the same two values from the GitHub repository variables.

The app needs a development build because it uses native modules (background audio, SQLite, SecureStore); it does not run in Expo Go.

### Install the release APK instead

Download `MoodTunes-<version>.apk` from the latest [GitHub release](../../releases) (or the `MoodTunes-apk` artifact of the **Android release** workflow) and open it on the device. Allow installation from unknown sources when asked.

## Checks

```bash
npm run lint           # ESLint (expo config)
npm run typecheck      # tsc --noEmit
npm test               # Jest unit tests (domain rules and Edge Function validators)
npm run test:coverage  # coverage of the domain layer (threshold 70%)
```

## Project structure

```
src/
  app/            expo-router screens and layouts (presentation)
  presentation/   components, view-model hooks, theme
  domain/         entities, rules (battery, Pomodoro, sharing, charts, statistics, outbox, check-in), use cases
  data/           remote (RTK Query API), local (SQLite), player (expo-audio), sync (outbox engine)
  store/          Redux store, slices and service wiring
  core/           configuration, HTTP client, errors, Supabase client
supabase/
  migrations/     schema, row-level security, SQL functions, cron jobs
  functions/api/  Edge Function with the /v1 endpoints (validator tests in __tests__)
scripts/          catalogue import and seed data
```

## Backend

The Supabase project is hosted. To recreate it:

1. Create a Supabase project and run the files in `supabase/migrations` in order (SQL editor or `supabase db push`).
2. Deploy the Edge Function: `supabase functions deploy api`.
3. In Authentication settings, turn off **Confirm email** (AC-01.1.1 opens the app directly after sign-up).
4. Import the catalogue: set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `JAMENDO_CLIENT_ID`, then run `node scripts/import-catalogue.mjs 300`.

GitHub configuration used by the workflows:

| Name | Kind | Used by |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `EXPO_PUBLIC_SENTRY_DSN` | Variables | Android release, keep-alive |
| `SUPABASE_SERVICE_ROLE_KEY`, `JAMENDO_CLIENT_ID` | Secrets | Import catalogue |

## Music and licences

All tracks come from [Jamendo](https://www.jamendo.com) under Creative Commons licences and are used for non-commercial purposes. The title, artist, source and licence of each song are shown in **Song info** on the Now Playing screen.

## Team

| Member | Student ID |
|---|---|
| Dương Nguyễn Tấn Đạt | 2352222 |
| Nguyễn Ngọc Gia Hân | 2452320 |

AI tools were used during development; see the declaration in the report.

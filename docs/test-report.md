# MoodTunes — Test Report (Assignment 02)

This document records the automated test results and the manual test cases mapped to the Assignment 01 acceptance criteria (`AC-01` to `AC-11`, plus `AC-19` onboarding) to satisfy **Rubric Criterion 2.5 (Testing)**.

---

## 1. Automated Verification Results

Executed against `moodtunes` (`HEAD` commit `f42cf74`):

| Check | Command | Scope | Result |
| :--- | :--- | :--- | :--- |
| TypeScript | `npm run typecheck` (`tsc --noEmit`) | Entire `src/` codebase | **Pass** (0 errors) |
| ESLint | `npx eslint .` | `src/` and `scripts/` | **Pass** (0 errors) |
| Prettier | `npm run format:check` | `src/`, `scripts/`, `supabase/functions/` | **Pass** |
| Domain Unit Tests | `npm run test:coverage` (`jest --coverage`) | `src/domain/` (7 suites, 26 tests) | **Pass** (26/26 passed) |

### Domain Layer Coverage (`npm run test:coverage`)

| File | % Stmts | % Branch | % Funcs | % Lines | Covered Behaviour |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `domain/battery.ts` | 97.36 | 95.65 | 100 | 100 | Listening goal bounds (`30–480` min), level thresholds (`20%`, `0%`), midnight reset |
| `domain/checkin.ts` | 100 | 100 | 100 | 100 | 30-minute background threshold, playback suppression, time-of-day greeting |
| `domain/diary.ts` | 100 | 100 | 100 | 100 | Day grouping, mood filtering, reverse-chronological sort |
| `domain/game.ts` | 100 | 100 | 100 | 100 | Streak scoring (`100 + 20*(k-1)`), max 1,900, normal/extended timer (20s/40s) |
| `domain/outbox.ts` | 100 | 100 | 100 | 100 | Coalescing repeated offline toggles on the same `(songId, mood)` |
| `domain/recommendations.ts` | 100 | 100 | 100 | 100 | Demoting songs played within the last 2 hours |
| `domain/usecases/toggleTag.ts` | 100 | 95.23 | 100 | 100 | Optimistic toggle, online/offline outbox queuing |
| **All files (`src/domain/`)** | **92.23** | **94.2** | **93.54** | **93.9** | Exceeds NFR-MAINT-01 (≥ 70% domain coverage) |

---

## 2. Manual Test Cases Mapped to Acceptance Criteria

> **Note:** Mark `Status` as `Pass` or `Fail` with the tested build/device (e.g., `Android Emulator API 34` or `Release APK`) when running the manual verification pass.

### FR-01: Account Management & FR-19: Onboarding

| TC ID | AC ID | Screen | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-01 | AC-19.1.1 | SCR-01 | Launch app for the first time. | 3 onboarding pages (check-in, charts, listening battery) appear with Skip button. | Pending |
| TC-02 | AC-01.1.3 | SCR-03 | Enter invalid email or password `< 8` chars and blur field. | Error message appears below field; `Create account` button stays disabled. | Pending |
| TC-03 | AC-01.1.1 | SCR-03 | Enter valid new email + password `≥ 8` chars and tap `Create account`. | Account created; navigates to Mood Check-in (`SCR-04`) within 3s. | Pending |
| TC-04 | AC-01.1.2 | SCR-03 | Sign up with an already registered email. | Error message *"An account with this email already exists"* is shown. | Pending |
| TC-05 | AC-01.2.1 | SCR-02 | Sign in, close the app completely, and reopen it. | Sign-in screen is skipped; user stays authenticated. | Pending |
| TC-06 | AC-01.3.1 | SCR-16 | Change display name (1–30 chars) or daily goal; restart app. | Saved immediately without a Save button; persists after restart. | Pending |
| TC-07 | AC-01.2.2 | SCR-16 | Tap `Sign out` in Profile. | Tokens, cached personal data, and pending outbox cleared; returns to Sign-in. | Pending |
| TC-08 | AC-01.3.2 | SCR-16 | Tap `Delete account`, type `DELETE`, and confirm. | Account and all user data deleted on server; user is signed out. | Pending |

### FR-02: Song Catalogue & Search

| TC ID | AC ID | Screen | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-09 | AC-02.1.5 | SCR-06 | Open Library without entering a search query. | Skeleton rows show while loading; songs listed A–Z, 20 per page. | Pending |
| TC-10 | AC-02.1.1 | SCR-06 | Type `≥ 2` characters in the search bar and stop typing. | Results update after ~300 ms showing title, artist, cover, and duration. | Pending |
| TC-11 | AC-02.1.2 | SCR-06 | Scroll to the bottom of a list with `> 20` songs. | Next 20 results load with a bottom loading indicator. | Pending |
| TC-12 | AC-02.1.3 | SCR-06 | Search a non-existent keyword (e.g. `zzzzqqq`). | Empty state *"No results for ..."* with `Clear search` button. | Pending |
| TC-13 | AC-02.1.4 | SCR-06 | Disable network and trigger a fresh search. | Error state *"Couldn't load songs"* with `Try again` button; no crash. | Pending |

### FR-03: Music Player & Queue

| TC ID | AC ID | Screen | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-14 | AC-03.1.1 | SCR-05/06 | Tap any song row. | Playback starts within 3s on Wi-Fi; MiniPlayer shows title, artist, play/pause. | Pending |
| TC-15 | AC-03.1.2 | SCR-07 | Tap play/pause, next, and previous on Now Playing. | Controls respond visibly within 200 ms. | Pending |
| TC-16 | AC-03.1.3 | SCR-07 | Drag and release the seek bar on Now Playing. | Playback jumps and continues from the selected timestamp. | Pending |
| TC-17 | AC-03.1.4 | SCR-07/Info | Tap `⋮` (Song info) on Now Playing. | Shows title, artist, source (Jamendo), CC licence name and clickable link. | Pending |
| TC-18 | AC-03.2.1 | SCR-07 | Press Home or lock the screen while a song is playing. | Audio continues in background; lock-screen media notification works. | Pending |
| TC-19 | AC-03.3.1 | SCR-08 | Play a song from a list; let it finish or open Queue. | Remaining list songs form the queue; next track auto-plays on completion. | Pending |
| TC-20 | AC-03.3.2 | SCR-08 | Swipe left or tap `×` on an upcoming song in Queue; tap `Undo`. | Song removed from queue; `Undo` snackbar restores it. | Pending |

### FR-04: Mood Tagging

| TC ID | AC ID | Screen | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-21 | AC-04.1.1 | SCR-09 | Tap `Tag mood` on Now Playing, then tap a mood chip. | Mood is selected within 200 ms. | Pending |
| TC-22 | AC-04.1.2 | SCR-09 | Tap an already selected mood chip again. | Tag is removed. | Pending |
| TC-23 | AC-04.1.4 | SCR-09 | Type a note in Tag Sheet up to 140 characters. | Character counter updates; input stops at 140 chars. | Pending |
| TC-24 | AC-04.1.5 | SCR-09 | Send `> 30` tag mutations within 1 minute. | Server returns HTTP 429; app displays rate-limit snackbar message. | Pending |

### FR-05: Mood Check-in & FR-06: Recommendations

| TC ID | AC ID | Screen | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-25 | AC-05.1.1 | SCR-04 | Cold-start the app while signed in. | Mood Check-in displays 8 moods and 4 optional contexts. | Pending |
| TC-26 | AC-05.1.2 | SCR-04 | Select a mood (+ optional context) and tap `Play ... mix`. | Recommendations load and first song starts within 5s on Wi-Fi. | Pending |
| TC-27 | AC-05.1.3 | SCR-04 | Tap `Not now` on Check-in. | Navigates to Home (`SCR-05`) without starting playback. | Pending |
| TC-28 | AC-05.1.5 | SCR-04 | Return to app from background while music is playing. | Check-in screen is NOT shown; player stays active. | Pending |
| TC-29 | AC-06.1.1 | SCR-05 | Select a mood and view `Picked for <Mood>` on Home. | Up to 20 songs ordered by recommendation score; sample note shown if `isSample=true`. | Pending |

### FR-07: Music Diary

| TC ID | AC ID | Screen | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-30 | AC-07.1.1 | SCR-11 | Tag a song with a mood and note, then open Diary tab. | Entry appears under today's date with song, mood chip, note, and `hh:mm`. | Pending |
| TC-31 | AC-07.1.2 | SCR-11 | Tap a mood filter chip at the top of Diary. | Only entries matching that mood are shown. | Pending |
| TC-32 | AC-07.1.4 | SCR-11 | Open Diary with an account that has 0 tags. | Empty state *"Your diary is empty"* with `Browse songs` button. | Pending |

### FR-08: Listening Battery

| TC ID | AC ID | Screen | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-33 | AC-08.1.1 | SCR-12 | Play music for 1–2 minutes, then pause. | Listened time increases only while playing, not when paused/buffering. | Pending |
| TC-34 | AC-08.1.2 | SCR-12 | Move the daily goal slider in Listening Battery. | Accepts 30 min to 8 hr in 15-min steps; saves immediately. | Pending |
| TC-35 | AC-08.1.3 | SCR-05/12 | Reach ≤ 20% and 0% remaining battery. | Banner shown once per threshold; playback continues uninterrupted. | Pending |

### FR-09: Weekly Mood Charts

| TC ID | AC ID | Screen | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-36 | AC-09.1.1 | SCR-10 | Open Charts tab and switch mood chips. | Up to 20 ranked songs load with vote counts and `Updated hh:mm` footer. | Pending |
| TC-37 | AC-09.1.5 | SCR-10 | Tap the circular `Play` button on Charts. | All chart songs are queued in rank order and playback starts. | Pending |
| TC-38 | AC-09.2.1–2 | SCR-10 | Tap `Vote` on a chart row. | Button changes to `Voted` immediately; snackbar shows next recomputation time. | Pending |

### FR-10: Offline Support

| TC ID | AC ID | Screen | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-39 | AC-10.1.1 | Any | Turn off Wi-Fi/mobile data. | Offline banner appears within 2s; cached Home/Charts/Diary remain usable. | Pending |
| TC-40 | AC-10.1.2–3 | SCR-09/11 | Add or remove a tag while offline, then turn network back on. | Shows *"Waiting to sync"* offline; syncs in order within 10s online without duplicates. | Pending |
| TC-41 | AC-10.1.4 | SCR-09 | Toggle the same `(song, mood)` multiple times offline, then reconnect. | Only the final state is sent to the server. | Pending |

### FR-11: Artist Guess Game

| TC ID | AC ID | Screen | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-42 | AC-11.1.1–2 | SCR-14 | Tap `Start game` on Game tab. | 10-question round starts; plays 15s clip; shows 4 distinct artist options. | Pending |
| TC-43 | AC-11.1.3–4 | SCR-14 | Answer a question within 20s (or 40s with Extended answer time). | Within 1s shows correct/incorrect, points (`100 + 20*(k-1)`), song title, and `artist_name`. | Pending |
| TC-44 | AC-11.1.5 | SCR-13/14/16 | Complete all 10 questions. | Summary shows total score, correct count, and personal best (also updated in Profile). | Pending |
| TC-45 | AC-11.1.6 | SCR-13 | Turn off network and open Game tab. | Shows *"You're offline"* message explaining answers are checked online + `Try again`. | Pending |

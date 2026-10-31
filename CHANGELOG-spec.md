# Specification change log

Changes to the Assignment 01 specification made during Assignment 02. Each entry gives the reason and the affected identifiers.

| # | Date | Change | Rationale | Affected IDs |
|---|------|--------|-----------|--------------|
| 1 | 2026-10-31 | Audio library changed from `react-native-track-player` to `expo-audio` (playlist, background playback, lock-screen controls with next and previous). | `react-native-track-player` has had no stable release since August 2025 and is not maintained for Expo SDK 58 and React Native 0.88. `expo-audio` is maintained with the SDK and provides the required features. The required permissions are unchanged. | CMP-APP-03, table 5.5 (Audio), SD-01 |
| 2 | 2026-10-31 | `game_questions` gains the columns `answered` and `clip_start_sec`. | `answered_mood` is null both before an answer and after a timeout, so a separate flag is needed to reject a second answer (409); the clip start is stored so that the same clip is played if a round is resumed. | ENT-10, API-11, API-12 |
| 3 | 2026-10-31 | Songs played in the last two hours are moved to the end of the list on the device. | The data model has no play history table; the device already stores the last played songs (AC-10.1.5), so no personal listening history is sent to the server (NFR-PRIV-01). | AC-06.1.3, CMP-APP-06 |
| 4 | 2026-10-31 | Only the development Supabase project is created at this stage; the demonstration project will be created before the final submission. | The free plan allows two active projects per organisation and one slot is already in use. | Section 5.10 |

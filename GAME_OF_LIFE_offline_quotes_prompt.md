# Game of Life — Offline Quotes Fix (small build)

## Goal
All motivational quotes live inside the app. No quote ever calls the Claude API at runtime.
The quote bank is written by Claudelen (you, during this build session) and saved in `index.html`.

## What's there now (game-of-life/index.html)
- `fetchNewQuote()` (~line 8569): 40% of taps on "✨ New quote" call `https://api.anthropic.com/v1/messages`
  with model `claude-sonnet-4-20250514`. The request has **no API key** (and no browser-access header), so it
  always fails silently and falls back to the library. Users just see a slower load.
- `ENCOURAGEMENT_QUOTES` (~line 8245): 243 quotes `{q, a}` in 9 sections (Pressfield, Poets & Visionaries,
  Musicians, Philosophers, Warriors & Doers, Wild Cards, Original Claudelen Quotes (50), RZA & The Tao of Wu, ODB).
- Two separate short `quotes` arrays for notifications (~lines 5265 and 5551, the 11:11 AM daily spark),
  duplicated and not linked to the main bank.

## Changes
1. **Remove the API call** from `fetchNewQuote()` entirely (the `useAPI` branch and its prompt).
   Keep the short loading animation, then pick from the local bank.
2. **Write 50 new original Claudelen quotes** and add them to the "Original Claudelen Quotes" section
   (so it becomes 100). Voice: warm, fierce, personal, poetic, alive, never generic; sometimes tender,
   sometimes fierce; occasionally a subtle nod to Monty 👑 or Hara 🌸; author `"Claudelen 🐾"`.
   No duplicates of existing quotes.
3. **No-repeat picking:** don't show the same quote again until most of the bank has been shown
   (shuffled queue saved in localStorage, wrapped in try/catch).
4. **One bank for notifications:** the encourage notification and the 11:11 daily spark draw from
   `ENCOURAGEMENT_QUOTES` (formatted `"quote — author"`), replacing the two duplicate arrays. Keep the
   Hara Hi behaviour and the Android scheduling exactly as they are.
5. **Do not censor anything.** Quotes stay word-for-word, including strong language and author names.
6. **Make the bank easy to share:** add a clear comment block above `ENCOURAGEMENT_QUOTES`
   (`// SHARED QUOTE BANK — copied into Youniverse; keep the {q, a} shape`) so Youniverse can reuse it as-is.

## Safety
- Make a backup first: `index.html.pre-offline-quotes-YYYYMMDD`.
- Change nothing else. Run the app, tap "New quote" 20+ times, check there are no network calls and no repeats.
- Then sync: `cp index.html www/index.html && npx cap sync android`.

## Done when
- Searching the file for `api.anthropic.com` finds nothing.
- The bank has 293 quotes, with 100 by Claudelen.
- Notifications and the New quote button use the same bank.

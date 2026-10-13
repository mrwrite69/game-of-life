# Squad Life — Dev Reference Prompt
*Carry these lessons forward from Game of Life. Written after a deep bug-fix + feature session on 2026-06-30.*

---

## ⚠️ THE UNICODE MINUS BUG — CRITICAL

When copying any `−` stepper button from Game of Life's index.html, the button **label** uses a Unicode minus sign `−` (U+2212). This looks identical to a regular hyphen but **JavaScript does not recognise it as an operator**. If it sneaks into an `onclick` argument, the button silently does nothing.

**Rule: button labels can use `−` for display. onclick JS args MUST use ASCII `-`.**

✅ Correct:
```html
<button type="button" class="num-btn" onclick="stepNum('my-field',-1,0)">−</button>
```
❌ Broken (looks the same, kills the button):
```html
<button type="button" class="num-btn" onclick="stepNum('my-field',−1,0)">−</button>
```

To audit any file for this bug, run:
```bash
grep -n "onclick" index.html | cat -v | grep "M-bM-^HM-^R"
```
If that returns onclick lines (not just button label lines), you have broken buttons. Fix with:
```bash
perl -i -pe 's/stepNum\(([^,]+),\xe2\x88\x92(\d+)/stepNum($1,-$2/g' index.html
```

---

## `stepNum()` — The Standard Stepper Helper

All +/− buttons in Game of Life use one shared function. Copy it into Squad Life:

```js
function stepNum(id, delta, min=1, max=9999) {
  const inp = document.getElementById(id);
  const disp = document.getElementById(id + '-display');
  let val = Math.max(min, Math.min(max, (parseInt(inp.value) || 0) + delta));
  inp.value = val;
  if (disp) disp.textContent = val;
}
```

**Never use `<input type="number">` for visible steppers.** Use a hidden input + display span + `.num-btn` buttons. This avoids mobile keyboard pop-ups and Android rendering issues.

HTML pattern:
```html
<div class="num-stepper">
  <button type="button" class="num-btn" onclick="stepNum('my-field',-1,1)">−</button>
  <span class="num-display" id="my-field-display">10</span>
  <button type="button" class="num-btn" onclick="stepNum('my-field',1,1)">+</button>
  <input type="hidden" id="my-field" value="10" />
</div>
```

### Agreed step sizes (from Game of Life):
| Field type | Step |
|---|---|
| Points (any) | ±5 |
| Days | ±1 |
| Hours | ±1 |
| Minutes | ±1 |
| Everything else | ±1 |

---

## Custom Mission Builder

When building a custom mission form, give players **full control** — single-day increments on the day stepper. Don't default to ±7 (week jumps).

Key fields:
- `cm-days` — defaults to 30, step ±1, min 1
- `cm-icon` — emoji input, max-width 70px
- `cm-name` — mission name
- `cm-desc` — description
- `cm-category` — select (physical / mind / creative / life / etc.)

On save, read days as: `const days = parseInt(document.getElementById('cm-days').value) || 30;`

Reset form after save:
```js
['cm-icon','cm-name','cm-desc'].forEach(id => document.getElementById(id).value = '');
document.getElementById('cm-days').value = '30';
document.getElementById('cm-days-display').textContent = '30';
```

---

## Night Owl Mode

Players grinding late should be able to pre-arm Night Owl **before midnight**. Don't make them catch the exact post-midnight moment.

### How it works:
- **Before midnight (11:11 PM–11:59 PM):** Button press schedules activation for midnight via a `setTimeout`. Button updates to "🦉 Set for midnight ✓" and disables.
- **After midnight (12:00 AM–2:22 AM):** Activates immediately — locks `todayKey()` to yesterday's date so all points/activities log to the previous day.
- **2:22 AM:** Auto-expires. New day begins fresh at zero.
- **Toast on activate:** `'🦉 Night Owl on — logging to Mon Jun 30 · expires 2:22 AM'`

### Key variables:
```js
let nightOwlActive = false;
let nightOwlDateKey = '';       // the date being kept alive
let nightOwlExpireTimer = null;
let nightOwlBannerTimer = null;
let nightOwlScheduled = false;  // pre-midnight arm flag
let nightOwlScheduleTimer = null;
```

### `todayKey()` must respect Night Owl:
```js
function todayKey() {
  if (nightOwlActive && nightOwlDateKey) return nightOwlDateKey;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
```

### Clean up ALL timers on sign-out:
```js
if (nightOwlBannerTimer)   { clearInterval(nightOwlBannerTimer);   nightOwlBannerTimer = null; }
if (nightOwlExpireTimer)   { clearTimeout(nightOwlExpireTimer);    nightOwlExpireTimer = null; }
if (nightOwlScheduleTimer) { clearTimeout(nightOwlScheduleTimer);  nightOwlScheduleTimer = null; nightOwlScheduled = false; }
```

---

## Copy-to-Clipboard on Quote/Encouragement Overlays

Players love to share inspiration quotes. Add a copy button that appears once a quote loads.

```html
<button class="enc-copy-btn" id="enc-copy-btn" onclick="copyQuoteToClipboard()" style="display:none">📋 Copy quote</button>
```

```js
function copyQuoteToClipboard() {
  const quoteEl = document.getElementById('enc-quote');
  const sourceEl = document.getElementById('enc-source');
  if (!quoteEl || quoteEl.style.display === 'none') return;
  const text = `${quoteEl.textContent}\n${sourceEl.textContent}`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('enc-copy-btn');
    if (!btn) return;
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋 Copy quote'; btn.classList.remove('copied'); }, 2000);
  });
}
```

- Hide the button while loading, show it in `showEncQuote()` after quote renders.
- Reset it (hide + restore text) at the top of `fetchNewQuote()`.

---

## Wu-Tang Easter Egg — C.R.E.A.M. Trigger

Fire from **Excellent tier onward** (not just the narrow window right before Elite). This means players see it on most good days.

```js
// fires once per day when pts >= Excellent threshold (350 in normal mode)
if (!muted && pts >= t.excellent && creamShownToday !== todayKey()) {
  creamShownToday = todayKey();
  setTimeout(() => showCream(pts, t.elite), 400);
}
```

Make the sub-message dynamic so it's accurate at any point level:
```js
// In showCream():
const gap = elite - pts;
ptsMsg.textContent = gap > 0 ? gap + ' pts to Elite 👑' : 'ELITE. You did it. 👑';
subMsg.innerHTML = gap > 0
  ? `You are <span style="color:var(--gold)">${gap} points</span> from Elite. GO GET IT.`
  : `You hit <span style="color:var(--gold)">Elite</span>. Cash rules everything. 💰`;
```

---

## Android / Capacitor Workflow

After **any** change to `index.html`:

```bash
cd ~/Documents/Claude/Projects/Game\ of\ Life/game-of-life
cp index.html www/index.html
npx cap sync android
```

`capacitor.config.ts` sets `webDir: 'www'` — Capacitor syncs from `www/`, not the root. Always copy first or Android gets stale code.

Open Android Studio:
```bash
open -a "Android Studio" ~/Documents/Claude/Projects/Game\ of\ Life/game-of-life/android
```

---

## General Reminders

- **Never hardcode point values** — always use threshold helpers like `getThresholds()` and `getBossPoints()` so difficulty multipliers apply correctly.
- **`saveCalEdit()` must apply combo multiplier** before writing points: `if(editHadCombo) pts = Math.round(pts * 1.15)`.
- **`autosave()` must preserve `locked` state** — never call with hardcoded `locked: false`.
- **Side quest completions** have `sideQuest: true` on the activity object — filter them out anywhere you populate `todayChecked`.
- **Foreground sync** — reload from Supabase if app was hidden >30s OR last sync was >60s ago.
- **Midnight save** — use `await saveToSupabase()` directly, not `debouncedSave()`.
- **Font consistency** — calendar text uses `var(--font-heading)` (Syne), NOT `var(--font-mono)` (Space Mono clips descenders on lowercase "g").

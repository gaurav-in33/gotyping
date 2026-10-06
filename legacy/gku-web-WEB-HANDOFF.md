# Gku Type — WEBSITE handoff (LIVE)

## 0. Claude ke liye PEHLE YEH PADHO
- User: **Gaurav**. Hinglish, **chhota, mobile-friendly** jawab. Sirf **Android phone** (Brave browser, laptop nahi). Wired USB keyboard bhi hai.
- Naam **Gku Type**, tagline **Train. Type. Improve.** — rename mat karna. Light theme default. Koi ads/tracking/sign-in nahi.
- Pehle design/idea suggest karo, user chunta hai, phir lagao. Bada kaam tabhi jab user "go" bole. Har baar "next step chahiye?" mat puchho.
- Claude ke paas browser nahi hai: **site kabhi browser me test nahi hui** (sirf JS syntax check + keymap check). Bug aaye to user screenshot dega.
- Chhote badlav ke liye `website/index.html` hi edit karo, phir poori **deploy zip** dobara do (chaaron files seedhi top level pe, koi folder nahi).

## 1. Live site
- URL: **https://gkutype.gowith.workers.dev** (Cloudflare Workers static assets, free; account subdomain `gowith`, worker name `gkutype`).
- Cloudflare account Google login (gaurav.in33@gmail.com). Login ke time **Desktop site mode OFF** rakhna (ON me login loop hota hai). Brave Shields dikkat kare to DOWN.
- Update: dash.cloudflare.com -> Workers & Pages -> `gkutype` -> naya zip upload (Account home pe "Drop a folder, or a zip" dabba bhi hai). Exact button naam dashboard badalne par alag ho sakte hain; user screenshot dega.
- Custom domain nahi hai (free lifetime asli domain nahi milta). Baad me kharid kar Domains & Routes se jod sakte hain.

## 2. Files
- `website/index.html` — poori site ek file (CSS+JS inline). Source of truth.
- `website/favicon.svg`, `404.html`, `_headers`.
- `website/gkutype-site-DEPLOY.zip` — ready zip, seedha Cloudflare pe upload.
- `app-original/` — purana Android app ka handoff, preview, Kotlin starter, build.yml. Sirf reference.
- `assets/` — final logo PNG + svg. Dark logo use nahi karna.

## 3. Website vs app
Hataya: rotate screen, landscape lock, fullscreen, USB/OTG "connect keyboard" messages, "APP DEVELOPER" (ab "DEVELOPER"), "Offline" chip (ab "Free"), sample stats, zen/custom-text mode.
Joda: phone pe neeche nav bar (<=700px) / left rail (bada screen), responsive cards, localStorage save, "Reset all data", on-screen keyboard se English typing (hidden input #mi, text pe tap), SEO meta + favicon, real day streak + "7-day streak", "Copy result", 404 page.
Nav: Typing, Learn, Stats, aur Settings sirf **gear icon**.

## 4. Features
- Typing: config bar [@ punctuation, # numbers, ✦ weak keys] [time/words/quote] [15/30/60/120 ya 10/25/50/100 + custom time 5-600s, words 5-500]; language english/hindi/hinglish; restart (Tab/Esc); live wpm/acc/err; 3 line text.
- Galat key default keep going; Settings me "stop on error". Space beech shabd me = baaki akshar skip (dotted), Space sahi keystroke, skipped chars WPM me nahi.
- Metrics: WPM=(correct chars/5)/min, Raw=(keystrokes/5)/min, Accuracy=(ks-mis)/ks.
- Result: bada WPM, "New best" (pehle test pe nahi), raw, accuracy, wrong, skipped, keystrokes, correct, time, graph (WPM line, raw dashed, red error dots), weak keys top 3, Restart/Back/Copy result.
- Learn: English 12 + Hindi 6, sab unlocked, 60s lesson, target 95% (accuracy training 98%), finger-guide keyboard, Continue card, "Passed N% / Best N%". Record sirf >=30 keystrokes pe.
- Stats: last/best/avg/tests/day streak, last-7 chart, most mistyped keys, achievements (7-day streak, 20/30/50 WPM, 10 tests, 99% accuracy).
- Settings: theme (light default/dark), text size 20-40, finger guide (lessons/always/off), cursor, Hindi layout (Inscript fixed), wrong key, low motion, reset data. About card (dot-grid, "DEVELOPER / Gaurav.", chips v1.0 Free No ads No tracking, "Made with ♥ in India", logo).
- Word lists asli: English 638, Hinglish 513, Hindi 594 + quotes (10/9/8): `const EN/HG/HI/Q`.
- Hindi Inscript: e.code -> Devanagari, object `L`. Z key (ॆ/ऎ) maine jodi, **unverified**. Digits 1-0 -> १-०.

## 5. Code notes (index.html)
- State: `S` (settings/mode), `G` (current test), `H` (history, max 200), `LB` (lesson best, key "en:0"), `LAST`.
- localStorage key **`gkutype`** = `{S:{theme,err,low,size,guide,cur,track,mode,dur,wc,pun,num,tab}, H, LB, LAST}`. Save: test end + settings change + render. History entry `{d:"YYYY-MM-DD", w, a, mis, miss}`.
- Views: object `V` (learn/stats/settings/type/result); `render()` rebuilds #main and the nav rail.
- Keys: window keydown (physical keyboard; Hindi via e.code) + hidden `#mi` input for soft keyboard (English only).
- Heat: timer 1s only while typing, no save per keystroke, only 3 chars repainted per key.

## 6. Known risks
- Browser-tested nahi; layout / Hindi guide visually verify nahi.
- Hindi soft/on-screen keyboard typing nahi (physical keyboard chahiye).
- Cloudflare dashboard UI badalta rehta hai.
- localStorage = same browser/device only; data clear = reset.

## 7. Ideas (user ne maange nahi)
Hindi on-screen keyboard; daily goal; sahi-key flash hint; custom domain; PWA install (offline); more lessons/achievements; bigger quote list; leaderboard (server chahiye, "no tracking" se takraata hai).

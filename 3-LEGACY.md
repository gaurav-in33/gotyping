# LEGACY Gku Type documents (reference only). Split at FILE markers into legacy/.

---
<!-- FILE: legacy/gku-app-HANDOFF.md -->

# Gku Type — FULL HANDOFF (v1.0, sab features ban chuke hain)

## 0. Claude ke liye PEHLE YEH PADHO
- User: **Gaurav**. Hinglish me, **chhota aur mobile-friendly** jawab do. Sirf **Android phone** hai (laptop nahi) + wired Prodot KB-207S USB keyboard (OTG).
- User ka level: thoda touch typing aata hai. Tech samjhane me simple raho, steps numbered rakho.
- Bada kaam/build tabhi shuru karo jab user "go"/"next part" bole. Har baar "next step chahiye?" mat puchho. Zaroorat ho to ek chhota sawaal ya suggestion do.
- Design pehle image/preview me suggest karo, user chunta hai, phir lagao.
- **Zero heating ka daava mat karna.** Heat kam rakhne ke tareeke neeche hain.
- Naam **Gku Type**, tagline **Train. Type. Improve.** — rename mat karna.
- Build **tested nahi** hota (Claude ke paas Android SDK/kotlinc nahi). Isliye code compile-safe likho. User APK GitHub Actions se banata hai; fail ho to user error log paste karega -> uska fix do.
- Chhote badlav ke liye pura project dobara mat banao: sirf jo file badalni hai wo badlo, phir poora `gkutype.zip` dobara do (root me gradle files) aur HANDOFF/PROGRESS update karo.
- Use limit bachana zaroori hai: ek baar me ek hi kaam/part.

## 1. Metrics (galat mat samajhna)
- WPM = (sahi characters / 5) / minutes
- Raw WPM = (total keystrokes / 5) / minutes
- Accuracy = sahi keystrokes / total keystrokes
- Errors (wrong) = total galat keystrokes

## 2. App kya hai
Native Android (Kotlin + Jetpack Compose), offline, **koi ads/tracking/INTERNET permission nahi**. Sirf hardware (USB OTG) keyboard se typing practice. Package `com.gkutype.app`, versionName 1.0 (versionCode 5), minSdk 24, target/compile 34.
- Orientation: `fullUser`. Portrait me **Rotate screen** dikhti hai, app UI sirf landscape me. Fullscreen (system bars hidden).
- Theme: **default LIGHT** (bg #F3F1EC, panel white, accent #C77700 text / #F2A33A brand). Dark: bg #14120F, panel #1F1C17, accent #F2A33A. Settings se badalta hai.
- 3 practice languages: **English, Hindi (Inscript), Hinglish (Roman Hindi)**.
- Data sirf phone me (SharedPreferences). Backup/export NAHI chahiye. Uninstall = reset.

### Screens
- **Rail** (left): logo + Type, Learn, Stats, Settings. App seedha Type pe khulta hai. Typing shuru hote hi rail/config bar fade-out; touch se wapas.
- **Type**: Monkeytype jaisa config bar: [@ punctuation, # numbers, ✦ weak keys] [time, words, quote] [15/30/60/120 ya 10/25/50/100 + custom (time 5-600s, words 5-500)]. Language switch (english/hindi/hinglish), restart ↻ (Tab/Esc bhi). 3 line text, smooth scroll, live WPM/acc/err. Zen aur custom-text **hata diye** gaye (nahi chahiye).
  - Galat key: default **keep going**; Settings me "stop on error".
  - **SKIP**: shabd ke beech Space = baaki akshar skip (dotted/dim); Space sahi keystroke; skipped chars WPM me nahi; Backspace skip undo karta hai.
  - Keyboard na ho to "Connect a USB keyboard (OTG) to start typing".
- **Result**: bada WPM + "New best" (pehle test pe nahi), raw, accuracy, wrong, skipped, keystrokes, correct, time, graph (WPM line, raw dashed, laal error dots), weak keys (top 3), Restart/Back. Enter/Tab = restart, Esc = back.
- **Learn**: English 12 levels (F/J, home, top, bottom, numbers, symbols, capitals/shift, words, sentences, paragraphs, speed building, accuracy training) + Hindi 6 (home, top, bottom, matras, words, sentences). **Sab unlocked.** Lesson = fixed 60s, target 95% (accuracy training 98%). Finger-guide keyboard (pinky/ring/middle/index/thumb alag rang, next key amber). Continue card + "Passed N% / Best N% · continue / Open". Pass sirf >=30 keystrokes pe.
- **Stats**: last/best/average/tests, last-7 bar chart, most mistyped keys (top 6), achievements (20/30/50 WPM, 10 tests, 99% accuracy). Khali ho to "No tests yet".
- **Settings**: theme, text size (20-40, −/+), finger guide (lessons/always/off), cursor (block/underline), Hindi layout (Inscript, fixed), wrong key, low motion + **About card** (dot-grid, "APP DEVELOPER / Gaurav.", chips v1.0/Offline/No ads/No tracking, "Made with ♥ in India", logo).
- **Rotate screen** (portrait): logo, "Rotate your phone", ghumta phone + "type_", 3 steps. Low motion ON = static.

### Hindi Inscript
Physical key (KeyEvent keyCode) -> Devanagari. Table: `engine/Inscript.kt` (= preview ka object L). Numbers ON (1..0 -> १..०). **Z key aur kuch rare keys mapped/verify nahi.** Hindi word list + quotes ka typability check pass hai (sab chars mapped).

### Word lists (offline, engine/Words.kt)
English 638, Hinglish 513, Hindi 594 (sab unique) + quotes (English 10, Hindi 9, Hinglish 8).

## 3. Heat kam karne ke design rules (rakhna)
- Timer sirf typing ke dauran, **1 second** ka. Har keystroke pe disk write nahi; sirf test khatam hone par save.
- Engine me per-char "stamp"; UI sirf badli hui lines rebuild karti hai (3-line window). Rotate animation graphicsLayer me (recomposition nahi). Low motion = animations band (snap).

## 4. Brand / Logo (FINAL)
Cream rounded tile, "Gku" kaala bold, "Type" amber gradient, neeche 3 keycaps (kaale, beech wala amber). Colors: #14120F, #2A2721 keys, #F2A33A accent, #F5F1E8 light bg. Android adaptive icon (squircle/circle/monochrome) usi se bana hai (`ic_launcher_foreground.xml` vector paths + `LogoPaths.kt`). `logo-reference-light-FINAL.png` final hai. Dark logo purana tha, use nahi karna.

## 5. Code map (`gkutype.zip`, root me gradle files)
```
build.gradle.kts, settings.gradle.kts, gradle.properties, gku.jks (fixed keystore)
app/build.gradle.kts           AGP 8.5.2, Kotlin 1.9.24, compose compiler 1.5.14, BOM 2024.06.00, deps: ui, foundation, animation, activity-compose (material3 NAHI)
MainActivity.kt                fullscreen, dispatchKeyEvent -> KeyRouter, window bg theme se
data/Prefs.kt                  settings (theme,size,guide,cursor,stop,low)
data/StatsStore.kt             history(200), misses per key, tests/best/avg/bestAcc; record() sirf test end pe
data/LessonStore.kt            best accuracy per level ("en:0"), lastKey
engine/TypingEngine.kt         pure logic: keep going/stop, skip, backspace, wpm/raw/acc
engine/TextGen.kt              test text (words/time/quote, punctuation, numbers, weak keys)
engine/Words.kt                word lists + quotes
engine/Inscript.kt             Hindi layout map (+ reverse map for finger guide)
engine/Lessons.kt              English 12 + Hindi 6 level generators
engine/KeyRouter.kt            hardware key handler
ui/TypeSession.kt              Game, TestResult, TypeSession (config, lessons, complete(), onKey)
ui/App.kt                      Shell, Rail, navigation, tabs
ui/TypeScreen.kt               config bar, stats row, 3-line text area
ui/ResultScreen.kt, StatsScreen.kt, LearnScreen.kt, SettingsScreen.kt, RotateScreen.kt
ui/FingerGuide.kt              finger-guide keyboard
ui/Logo.kt, LogoPaths.kt, Theme.kt, Components.kt
res/                           adaptive icon vectors + png fallback, themes.xml, colors.xml
```
Preview (`gkutype-preview.html`) design ka source of truth hai: koi UI badlav pehle wahan dekho/suggest karo.

## 6. Build + install (phone-only, GitHub web)
1. github.com -> repo (private!) `gkutype`.
2. `.github/workflows/build.yml` banao (build.yml ka text paste). Workflow: `gkutype.zip` unzip -> Gradle 8.7 (Java 17) -> `assembleRelease` -> APK ko GitHub Release me daalta hai (tag build-N). Trigger: zip push ya manual.
3. `gkutype.zip` upload (**unzip mat karna**; same naam se replace).
4. Actions me hara tick (~5-10 min). Laal X = error log copy karke Claude ko do.
5. Releases -> `app-release.apk` -> install.
- Signing: fixed keystore `gku.jks` (alias gku, password gkutype123 — app/build.gradle.kts me). Isse har naya APK purane ke upar install hota hai. Repo **private** rakho. Agar pehle debug-key wala APK installed ho to ek baar uninstall karna padega.
- Badlav ka tareeka: nayi zip upload -> workflow naya APK banata hai.

## 7. Known risks / notes
- Build asli compiler pe test nahi hua (Claude ke paas SDK nahi). Compile error aaye to log se fix.
- Stats chips me FlowRow (experimental, @OptIn). Config bar glyphs (◷ ✦ ❝ ↻ ✎) kuch phones pe font fallback.
- Hindi `Z` aur rare keys unverified. Hindi layout sirf Inscript.
- Stats achievements "99% accuracy" ke liye >=30 keystrokes chahiye.

## 8. Possible next kaam (user ne maange nahi, sirf suggestions)
Hindi rare keys verify; word lists badhana; bug/heat fix; build error fix; naye lesson ya achievements.


---
<!-- FILE: legacy/gku-app-PROGRESS-history.md -->

# Gku Type — PROGRESS (checkpoint after Part 5 of 5 (ALL PARTS DONE))

## NEW CHAT KE LIYE (Gaurav yeh paste karega)
Upload: 00-continue-handoff.txt, gkutype-preview.html, build.yml, gku-logo.svg, logo-reference-light-FINAL.png + yeh PROGRESS.md + LATEST gkutype.zip (Part 4 wala, `ui/LearnScreen.kt` hai). Phir bolna: "Part 6: <jo fix/badlav chahiye>" (ya build ka error log paste karo).

### Claude ke liye instructions
- Gaurav se Hinglish me, chhota jawab. Wo sirf Android phone se kaam karta hai.
- SIRF agla part karo (neeche "NEXT"). Part khatam hone par: updated `gkutype.zip` + naya `PROGRESS.md`. Phir ruk jao.
- Source of truth: `gkutype-preview.html` aur `00-continue-handoff.txt`.
- Build tested nahi hai (Android SDK/kotlinc nahi). Compile-safe Kotlin 1.9.24, Compose BOM 2024.06.00, sirf compose ui + foundation + animation + activity-compose (material3 nahi).

## PLAN
1. [DONE] Foundation  2. [DONE] Typing engine + Type screen  3. [DONE] Result + stats + weak keys
4. [DONE] Learn course
5. [DONE] Settings full + About card + rotate animation + polish + final build steps

## PART 4 — kya bana (package com.gkutype.app)
```
engine/Lessons.kt     LessonDef(title,target,make). Lessons.english (12), Lessons.hindi (6), defs(track), name(track). track = "en"/"hi".
                      Har attempt pe naya random text. Target 95%, English level 12 = 98%.
data/LessonStore.kt   SharedPreferences "gku_lessons": best accuracy per level ("en:0"), lastKey (Continue card). Sirf lesson khatam/start par write.
engine/Inscript.kt    + keyFor(char) (reverse map), normalChar(keyCode) (keycap label).
ui/FingerGuide.kt     GuideHost(game) -> FingerKeyboard(hindi, nextKeyCode). Pinky/ring/middle/index/thumb alag rang, next key amber.
                      Hindi me keycaps pe Devanagari (matra ke aage ◌). Chhoti screen (<420dp height) pe keys chhoti.
ui/LearnScreen.kt     Continue card (progress bar = best accuracy), English/Hindi chips, sab levels open, "Passed N%" / "Best N% · continue" / "Open".
ui/TypeSession.kt     TypeSession(prefs, store, lessons). lesson: LessonRef?, startLesson/exitLesson/leaveLesson, onLeaveLesson (Shell set karta hai).
                      Lesson = fixed 60 s, label "English · level N". TestResult me target + targetMet.
                      Accuracy record/pass sirf >=30 keystrokes par. Result par Enter/Tab = restart, Esc = Learn list.
ui/TypeScreen.kt      Lesson me config bar ki jagah label, language switch hidden, finger guide (prefs.guide: lessons/always/off).
ui/ResultScreen.kt    "Target met. Move on to the next level." / "Target is N% accuracy. Try once more."
ui/App.kt             Learn tab = LearnScreen. Rail me Type tab dabane par lesson band -> normal test.
app/build.gradle.kts  versionName 0.4.0
```

## Gaurav ko Part 4 test karna hai
Repo me `gkutype.zip` replace upload (same naam) -> Actions build -> Releases se APK install. Check:
1. Learn tab: Continue card, English/Hindi chips, levels list.
2. Level kholo: upar label, finger-guide keyboard, next key amber; Hindi me Devanagari keycaps.
3. 60 s baad result: target message; Learn me "Passed/Best %" dikhe; app band karke kholo, progress rahe.
4. Result par Esc/Back = Learn list. Rail me Type = normal test.
5. Settings me "Finger guide" abhi UI me nahi hai (Part 5); default "lessons" hai.
Fail ho to Actions ka error log do.

## Known risks / notes
- Build tested nahi. FlowRow (Stats) experimental @OptIn; config bar glyphs font fallback.
- Signing abhi debug key hai (fresh runner pe har baar nayi key). Agar update install pe "App not installed" aaye, purana app uninstall karna padega (stats reset). Fixed keystore Part 5 me add kar sakte hain.
- Hindi 'Z' key aur rare keys verify nahi.

## PART 5 — kya bana
```
ui/SettingsScreen.kt  Theme, text size (- / +, 20-40), finger guide (lessons/always/off), cursor, Hindi layout (Inscript, fixed), wrong key, low motion + About card
                      (dot-grid, "APP DEVELOPER / Gaurav.", keycap chips v1.0/Offline/No ads/No tracking, "Made with ♥ in India", logo).
ui/RotateScreen.kt    Portrait screen: ghumta phone + "type_" (graphicsLayer, recomposition nahi), 3 step cards. Low motion ON = static.
ui/App.kt             Purane Placeholder/Settings/Rotate hata diye. Window background theme ke hisaab se set (flash fix).
MainActivity.kt       Start par window background theme se.
app/build.gradle.kts  versionName 1.0, versionCode 5, fixed keystore (gku.jks, zip ke root me) -> har build same signature.
```

## Final build/install steps
1. GitHub repo (gkutype): `.github/workflows/build.yml` + `gkutype.zip` (zip ko unzip mat karna, replace upload).
2. Actions tab -> "Build Gku Type" green tick (5-10 min). Laal X ho to run ka error log Claude ko do.
3. Code page -> Releases -> latest build -> app-release.apk -> install.
4. PEHLI BAAR: purana Gku Type uninstall karo (signature badal gayi; stats/progress reset). Iske baad har nayi build seedhi upar install hogi.
5. Repo PRIVATE rakho (keystore zip me hai).

## Known risks
- Build tested nahi hai. FlowRow (Stats) experimental @OptIn; config bar glyphs (◷ ✦ ❝ ↻ ✎) font fallback.
- Hindi 'Z' aur rare keys unverified. Hindi word lists me typability check kiya nahi gaya (Part 2 ka kaam).
- Word lists size (500+) Part 2 me banayi thi; count verify nahi kiya.


---
<!-- FILE: legacy/gku-web-WEB-HANDOFF.md -->

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

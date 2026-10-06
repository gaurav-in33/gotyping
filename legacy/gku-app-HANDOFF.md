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

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

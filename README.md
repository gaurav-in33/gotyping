# GoTyping

Free, private typing practice for English, Hindi and Hinglish.
No ads. No tracking. No sign-in. Everything stays on your device.

Live site: https://gotyping.vercel.app

## What it has
- Typing tests (time and words) with a finger-colour keyboard guide
- 36 lessons, drills for your weakest keys, exam-style practice
- Stats with a keyboard heatmap and an activity calendar
- Light, dark and four accent colours; many typing settings

## How this repo works
This is a plain static site. There is no build step.

- `public/index.html` is the whole app (HTML, CSS and JavaScript in one file)
- `public/favicon.svg`, `public/404.html`, `public/sw.js` are small helpers
- `vercel.json` tells Vercel to serve the `public` folder with security headers

To change the site, replace `public/index.html` (GitHub: open the `public` folder, Add file, Upload files, Commit). Vercel redeploys on its own.

Made by Gaurav.

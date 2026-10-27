# EVFlow — submission build

This is a real, working app matching the EVFlow planning deck (UCS503): a
rolling-horizon-style charging scheduler with a site power cap, an
earliest-deadline-first + fairness allocation rule, plain-language decision
explanations, an operator dashboard, and an event log — with a multilingual
driver UI (English, Hindi, Punjabi, Gujarati) and WhatsApp booking.

It's built as a PWA (the same architecture your own deck specifies on slide
10), which is the only realistic way to get a genuinely functioning app into
a sub-100MB `.apk` without a native Android build pipeline. Wrapped, it comes
out to roughly 3–15MB — nowhere near the cap.

## What's real vs. simulated

- **Real and working:** the scheduling algorithm (site power cap, EDF
  ordering, fairness rule, feasibility check, generated explanations), the
  full driver flow, the operator dashboard, the event log, all four
  languages, offline support, and WhatsApp booking (via `wa.me` click-to-chat
  links — see note below).
- **Simulated for the demo:** there's no backend server or database — all
  state lives on-device (`localStorage`). Your deck's ACN-Sim/ACN-Data
  integration, the actual optimization solver, and multi-user sync across
  devices are semester-long research components, not something to fake in a
  demo app. If you need a shared backend later, the scheduling logic in
  `scheduler.js` is written as pure functions so it can be lifted into a real
  API without a rewrite.

## About the WhatsApp booking

A genuine automated WhatsApp bot (someone messages "book" and a server
replies) needs a Meta-verified WhatsApp Business API account, which no one
can set up on your behalf without your business details. What's implemented
instead is the standard, legitimate alternative small businesses use: a
`wa.me` **click-to-chat** link that opens WhatsApp with a pre-filled booking
message addressed to the site's number. A driver taps "Open WhatsApp," the
message is already written, they hit send. It's a real, working booking
channel — just human-confirmed on the operator's end rather than bot-confirmed.

**Before you submit:** open `app.js` and replace the placeholder number:
```js
const WHATSAPP_NUMBER = "911234567890"; // put the real number here, country code + number, no + or spaces
```

## Step 1 — Try it locally first

No build step needed. From this folder:
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000` in a browser. Click through both the
driver flow and the operator dashboard, and test all four languages via the
pill in the top-right corner.

## Step 2 — Put it online (required before making the APK)

PWABuilder (next step) needs a live HTTPS URL to scan — it can't read files
off your laptop. Easiest free options, pick one:

**Netlify (fastest, no account tricks needed):**
1. Go to https://app.netlify.com/drop
2. Drag this whole folder onto the page
3. You'll get a URL like `https://random-name-123.netlify.app` — that's your
   site.

**GitHub Pages (if you already use GitHub):**
1. Create a new repo, push this folder's contents to it
2. Repo Settings → Pages → Deploy from branch → `main` / root
3. Your URL will be `https://<username>.github.io/<repo>`

## Step 3 — Generate the signed APK

1. Go to https://www.pwabuilder.com
2. Paste your live URL from Step 2 and click **Start**
3. Wait for it to score your manifest/service worker (it should score well —
   both are already set up correctly)
4. Click **Package for stores** → choose **Android**
5. Leave the defaults (it will offer to generate a signing key for you —
   keep that keystore file somewhere safe, you'll need it for future updates)
6. Download the generated package — it contains your signed `.apk`
   (typically 3–15MB, well under your 100MB limit)

That `.apk` is what you submit. It installs and runs like any Android app,
works offline after first launch (via the service worker), and needs no
backend server to demo the full driver + operator flow.

## File map

| File | Purpose |
|---|---|
| `index.html` | App shell |
| `style.css` | All styling |
| `i18n.js` | English/Hindi/Punjabi/Gujarati translation strings |
| `scheduler.js` | The scheduling engine — site model, allocation logic, event log |
| `app.js` | Screen rendering and navigation |
| `manifest.json` | PWA metadata (name, icons, theme color) — what PWABuilder reads |
| `sw.js` | Service worker — enables offline use after first load |
| `icons/` | App icons (192px, 512px) |

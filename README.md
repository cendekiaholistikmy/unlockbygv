# UNLOCK by GengVolunteers

**Gen-Z, Level Up!** The official site for UNLOCK: one expert conversation every weekend (Jumaat, Sabtu or Ahad, 9 PM), live in GV Familia on Telegram.

Live at **https://cendekiaholistikmy.github.io/unlockbygv/**

A GengVolunteers 2.0 programme under Persatuan Belia Cendekia Holistik (HLSTK).

---

## What the site does

| Page | What's on it |
|---|---|
| **Home** (`#/`) | Curved, streaming band of session posters and photos; a "next session" spotlight with a live countdown; the lineup; the Open → Unlock → Ask → Act format; the four tracks; weekend slots; a call for speakers; FAQ |
| **Sessions** (`#/sessions`) | Every session, with filters for Live, Upcoming and Recordings, track chips and search. Each session opens a sheet with the poster or recording video, the speaker, a countdown, Add to Google Calendar, photos (with a lightbox) and "What we unlocked" |
| **Share at UNLOCK** (`#/speak`) | A form for guests to **offer to give a sharing**, **suggest a speaker** or **suggest a topic**, with up to 4 photos, a preferred night and PDPA consent |
| **Admin** (`#/admin`, link in the footer) | Behind the admin key: Overview, Sessions (add/edit, upload poster, speaker photo and gallery, recording link), Guests (pipeline, statuses, notes, "Make a session"), Planning (standard run sheet per session), Settings |

The **dynamic island** at the top shows the next session's countdown, turns into a red **LIVE** pill during the session, expands into a mini player when tapped, and morphs into a toast when something is saved or sent.

Sessions marked **Upcoming** switch to **Live** during their slot and to **Recording** afterwards by themselves, so nobody has to edit anything at 9 PM.

---

## Editing content (no code)

Everything you'd normally change lives in the Google Sheet and is edited from **Admin** on the website:

1. Go to the site, scroll to the footer, click **Admin**, enter the admin key.
2. **Sessions** → New session. Fill the title, track, date (Jumaat/Sabtu/Ahad) and speaker. Upload the poster (or leave it empty for an automatic UNLOCK poster), speaker photo and photos after the session. Paste the YouTube or Drive recording link when ready. Tick **Show on website**.
3. **Guests** → everything sent from *Share at UNLOCK* arrives as **New**. Move it through To invite → Invited → Confirmed → Done. **Make a session** turns a confirmed guest into a hidden draft session with their photo and abstract, plus a run sheet.
4. **Planning** → tick tasks off; overdue ones turn red.
5. **Settings** → the island message, GV Familia Telegram link, optional registration link, and a manual LIVE switch.

You can also edit the sheet directly. Don't rename tabs or headers. See the *How to Use* tab.

---

## One-time setup: connect the Google Sheet

Until this is done the site runs in **demo mode** with sample sessions (demo admin key: `demo`, changes stay in that browser).

1. **Sheet**: upload `sheet/UNLOCK_Guests_and_Planning.xlsx` to Google Drive and open it with Google Sheets (File → Save as Google Sheets).
2. **Script**: Extensions → Apps Script. Replace everything with [`apps-script/Code.gs`](apps-script/Code.gs). Save.
3. Choose the function **setup** and press **Run**. Approve the permissions (Sheets, Drive for photos, Mail for the "new request" email).
4. Reload the sheet → **UNLOCK** menu → **Set admin key** (at least 8 characters, keep it private).
5. Apps Script → **Deploy → New deployment → Web app**. Execute as **Me**, access **Anyone**. Copy the URL ending in `/exec`.
6. In this repo, edit [`src/config.ts`](src/config.ts) and paste it:
   ```ts
   export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXX/exec";
   ```
   Commit. GitHub Actions rebuilds and redeploys in about a minute.

After any change to `Code.gs`: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy** (the URL stays the same).

Photos are saved in a Drive folder called **UNLOCK Uploads** (`Guests/` and `Sessions/`). Guest photos stay private; a photo becomes viewable by link only when it's used on a published session.

### Before you announce the link (silent failures are the risk)

- [ ] `APPS_SCRIPT_URL` pasted, site no longer shows "Demo mode" in Admin
- [ ] Send a real test request from **Share at UNLOCK** with a photo, on **iPhone Safari** and **Android Chrome**; confirm the row lands in *Guests* and the photo in Drive
- [ ] In Admin, upload a poster and save a session; check it shows on the public Sessions page
- [ ] Replace `telegramUrl` (Settings) with the real GV Familia invite
- [ ] Replace every `[placeholder]` in the sample sessions and delete the example guest

---

## For developers

Stack: **Vite + React 18 + TypeScript + Tailwind CSS v4**, shadcn project structure (`components.json`, `@/` alias, `src/components/ui`, `src/lib/utils.ts`), **motion** for animation, **lucide-react** icons. Hosted on GitHub Pages via `.github/workflows/deploy.yml` (push to `main` → build → deploy).

```bash
npm install
npm run dev      # http://localhost:5173/unlockbygv/
npm run build    # outputs dist/
```

```
src/
  config.ts                 ← APPS_SCRIPT_URL and fallback links (the only file to hand-edit)
  components/ui/            ← shadcn-style primitives, incl. tilted-grid-hero.tsx (the curved band)
  components/               ← DynamicIsland, Nav, SessionCard, SessionModal, Footer, Reveal
  pages/                    ← Home, Sessions, Speak, Admin
  lib/api.ts                ← demo store + Apps Script calls
  lib/format.ts             ← Malaysia-time dates, auto Live/Recorded, calendar links, Drive/YouTube links
  lib/poster.ts             ← auto-generated SVG posters for sessions without an upload
  data/seed.ts              ← sample content for demo mode
apps-script/Code.gs         ← backend for the Google Sheet
sheet/                      ← the spreadsheet template
```

**Why `components/ui` matters:** shadcn's CLI (`npx shadcn add …`) and every component copied from shadcn/21st.dev assume primitives live in `@/components/ui` and import `cn` from `@/lib/utils`. Keeping that folder means new components drop in without rewriting imports.

Routing is hash-based (`#/sessions/unlock-02`) so deep links work on GitHub Pages with no server config.

/**
 * ─────────────────────────────────────────────────────────────
 *  UNLOCK SITE SETTINGS — the only file you need to edit by hand
 * ─────────────────────────────────────────────────────────────
 *
 * APPS_SCRIPT_URL
 *   Paste the Web App URL from Apps Script (Deploy → Manage deployments)
 *   between the quotes. It ends in /exec.
 *
 *   While it is empty the site runs in DEMO MODE: it shows the sample
 *   sessions in src/data/seed.ts, and anything saved in Admin or sent
 *   through the speaker form stays in that one browser only.
 *   The demo admin key is: demo
 */
export const APPS_SCRIPT_URL = "";

/** Fallback links, used until Settings in the sheet says otherwise. */
export const DEFAULTS = {
  telegramUrl: "https://t.me/",
  registerUrl: "",
  contactEmail: "persatuanbeliacendekiaholistik@gmail.com",
  announcement: "One session every weekend · Jumaat, Sabtu or Ahad · 9 PM",
  defaultTime: "21:00",
};

/** Organisation shown in the footer. */
export const ORG = {
  programme: "GengVolunteers 2.0",
  association: "Persatuan Belia Cendekia Holistik",
  short: "HLSTK",
  motto: "Membina Generasi Holistik, Berilmu, Berakhlak dan Berbakti",
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/gengvolunteers" },
    { label: "TikTok", href: "https://www.tiktok.com/@gengvolunteers" },
    { label: "Threads", href: "https://www.threads.net/@gengvolunteers" },
    { label: "Facebook", href: "https://www.facebook.com/gengvolunteers" },
    { label: "YouTube", href: "https://www.youtube.com/@gengvolunteers" },
  ],
};

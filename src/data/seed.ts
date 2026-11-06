import type { AdminData, PlanTask, Session } from "@/lib/types";
import { STANDARD_TASKS } from "@/lib/types";
import { DEFAULTS } from "@/config";

/**
 * Sample content for DEMO MODE only (when APPS_SCRIPT_URL is empty).
 * Once the Google Sheet is connected, everything comes from the sheet.
 * Anything in [square brackets] is a placeholder to replace.
 */
const base = {
  speakerPhoto: "",
  poster: "",
  gallery: [] as string[],
  recordingUrl: "",
  liveUrl: "",
  published: true,
  updatedAt: "2026-11-06T00:00:00+08:00",
};

export const SEED_SESSIONS: Session[] = [
  {
    ...base,
    id: "unlock-01",
    episode: 1,
    title: "The resume that makes employers stop scrolling",
    track: "CAREER",
    status: "Recorded",
    date: "2026-10-30",
    time: "21:00",
    speaker: "[Speaker Name]",
    speakerTitle: "[Position, Organisation]",
    summary:
      "What recruiters actually read in the first six seconds, and how to rebuild a student resume around proof instead of adjectives.",
    takeaways: [
      "[Takeaway one from the session]",
      "[Takeaway two from the session]",
      "[Takeaway three from the session]",
    ],
  },
  {
    ...base,
    id: "unlock-02",
    episode: 2,
    title: "[Session title]",
    track: "LEAD",
    status: "Upcoming",
    date: "2026-11-13",
    time: "21:00",
    speaker: "[Speaker Name]",
    speakerTitle: "[Position, Organisation]",
    summary: "[One or two lines on what this conversation unlocks.]",
    takeaways: [],
  },
  {
    ...base,
    id: "unlock-03",
    episode: 3,
    title: "[Session title]",
    track: "TECH",
    status: "Upcoming",
    date: "2026-11-21",
    time: "21:00",
    speaker: "[Speaker Name]",
    speakerTitle: "[Position, Organisation]",
    summary: "[One or two lines on what this conversation unlocks.]",
    takeaways: [],
  },
  {
    ...base,
    id: "unlock-04",
    episode: 4,
    title: "[Session title]",
    track: "LIFE",
    status: "Upcoming",
    date: "2026-11-29",
    time: "21:00",
    speaker: "[Speaker Name]",
    speakerTitle: "[Position, Organisation]",
    summary: "[One or two lines on what this conversation unlocks.]",
    takeaways: [],
  },
];

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00+08:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Date(d.getTime() + 8 * 3600e3).toISOString().slice(0, 10);
}

export function standardTasks(session: Session): PlanTask[] {
  return STANDARD_TASKS.map((t, i) => ({
    id: `${session.id}-t${i + 1}`,
    sessionId: session.id,
    task: t.task,
    owner: "",
    due: addDays(session.date, t.offsetDays),
    status: "Not started",
    link: "",
    notes: "",
  }));
}

export const SEED: AdminData = {
  sessions: SEED_SESSIONS,
  settings: {
    announcement: DEFAULTS.announcement,
    telegramUrl: DEFAULTS.telegramUrl,
    registerUrl: DEFAULTS.registerUrl,
    contactEmail: DEFAULTS.contactEmail,
    liveOverride: "auto",
    defaultTime: DEFAULTS.defaultTime,
  },
  guests: [
    {
      id: "g-sample",
      timestamp: "2026-11-05T20:15:00+08:00",
      type: "Offer to share",
      name: "[Sample Guest]",
      email: "guest@example.com",
      phone: "",
      organisation: "[Organisation]",
      role: "[Role]",
      topic: "[Proposed topic]",
      track: "CAREER",
      abstract: "[What they want to share, in their own words.]",
      preferredSlot: "Sabtu",
      preferredDate: "",
      links: "",
      photos: [],
      source: "Website",
      status: "New",
      sessionId: "",
      notes: "Sample row. Delete once real requests arrive.",
      consent: true,
    },
  ],
  plan: standardTasks(SEED_SESSIONS[1]),
};

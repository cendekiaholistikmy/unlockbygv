export const TRACKS = ["CAREER", "LEAD", "TECH", "LIFE"] as const;
export type Track = (typeof TRACKS)[number];

export const SESSION_STATUSES = [
  "Draft",
  "Upcoming",
  "Live",
  "Recorded",
  "Cancelled",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export type Session = {
  id: string;
  episode: number;
  title: string;
  track: Track;
  status: SessionStatus;
  /** YYYY-MM-DD, Malaysia time */
  date: string;
  /** HH:mm, 24 hour, Malaysia time */
  time: string;
  /** Minutes. Sets the Live window and the calendar invite length. */
  duration: number;
  /** Where it happens. Empty = online in GV Familia (Telegram). */
  venue: string;
  speaker: string;
  speakerTitle: string;
  speakerPhoto: string;
  poster: string;
  gallery: string[];
  recordingUrl: string;
  liveUrl: string;
  summary: string;
  takeaways: string[];
  published: boolean;
  updatedAt: string;
};

export const GUEST_TYPES = [
  "Offer to share",
  "Suggest a speaker",
  "Suggest a topic",
] as const;
export type GuestType = (typeof GUEST_TYPES)[number];

export const GUEST_STATUSES = [
  "New",
  "To invite",
  "Invited",
  "Confirmed",
  "Declined",
  "Done",
] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

export const GUEST_SOURCES = ["Website", "Network", "Referral"] as const;

export type Guest = {
  id: string;
  timestamp: string;
  type: GuestType;
  name: string;
  email: string;
  phone: string;
  organisation: string;
  role: string;
  topic: string;
  track: Track | "";
  abstract: string;
  preferredSlot: string;
  preferredDate: string;
  links: string;
  photos: string[];
  source: string;
  status: GuestStatus;
  sessionId: string;
  notes: string;
  consent: boolean;
};

export const PLAN_STATUSES = ["Not started", "In progress", "Done"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export type PlanTask = {
  id: string;
  sessionId: string;
  task: string;
  owner: string;
  due: string;
  status: PlanStatus;
  link: string;
  notes: string;
};

export type Settings = {
  announcement: string;
  telegramUrl: string;
  registerUrl: string;
  contactEmail: string;
  /** auto = follow session times, on = force LIVE badge, off = never */
  liveOverride: "auto" | "on" | "off";
  defaultTime: string;
};

export type PublicData = { sessions: Session[]; settings: Settings };
export type AdminData = PublicData & { guests: Guest[]; plan: PlanTask[] };

/** The standard run sheet for every session (H = session day). */
export const STANDARD_TASKS: { task: string; offsetDays: number }[] = [
  { task: "Lock the night (Jumaat / Sabtu / Ahad) and confirm speaker", offsetDays: -10 },
  { task: "Poster designed and uploaded to the site", offsetDays: -8 },
  { task: "H-7 teaser post on all socials", offsetDays: -7 },
  { task: "H-3 speaker video", offsetDays: -3 },
  { task: "H-1 reminder in GV Familia", offsetDays: -1 },
  { task: "LIVE post and run the session", offsetDays: 0 },
  { task: "H+1 What We Unlocked recap and photos", offsetDays: 1 },
  { task: "Thank the speaker and upload the recording", offsetDays: 3 },
];

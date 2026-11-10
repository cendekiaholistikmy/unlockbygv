import type { Session, SessionStatus, Settings, Track } from "./types";

const HARI = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Session start as a real instant (all times are Malaysia time, UTC+8). */
export function startOf(s: Pick<Session, "date" | "time">): Date {
  const t = /^\d{1,2}:\d{2}$/.test(s.time) ? s.time.padStart(5, "0") : "21:00";
  return new Date(`${s.date}T${t}:00+08:00`);
}

/** Parts of a date as seen in Malaysia, whatever the viewer's own zone. */
function myt(d: Date) {
  const m = new Date(d.getTime() + 8 * 3600e3);
  return {
    day: m.getUTCDay(),
    date: m.getUTCDate(),
    month: m.getUTCMonth(),
    year: m.getUTCFullYear(),
    h: m.getUTCHours(),
    min: m.getUTCMinutes(),
  };
}

export function hari(s: Pick<Session, "date" | "time">) {
  return HARI[myt(startOf(s)).day];
}

function clock(d: Date) {
  const { h, min } = myt(d);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function timeLabel(s: Pick<Session, "date" | "time">) {
  return clock(startOf(s));
}

/** "3:00 PM to 5:00 PM" */
export function timeRange(s: Pick<Session, "date" | "time" | "duration">) {
  const start = startOf(s);
  return `${clock(start)} to ${clock(new Date(start.getTime() + durationOf(s) * 60e3))}`;
}

export function durationOf(s: Partial<Pick<Session, "duration">>) {
  const d = Number(s.duration);
  return d > 0 ? d : 60;
}

export const ONLINE_VENUE = "GV Familia (Telegram)";
export function venueOf(s: Partial<Pick<Session, "venue">>) {
  return (s.venue || "").trim() || ONLINE_VENUE;
}
export function isOnline(s: Partial<Pick<Session, "venue">>) {
  return !(s.venue || "").trim();
}

export function dateLabel(s: Pick<Session, "date" | "time">, withYear = true) {
  const p = myt(startOf(s));
  return `${HARI[p.day]}, ${p.date} ${MONTHS[p.month]}${withYear ? ` ${p.year}` : ""}`;
}

export function shortDate(s: Pick<Session, "date" | "time">) {
  const p = myt(startOf(s));
  return `${String(p.date).padStart(2, "0")}.${String(p.month + 1).padStart(2, "0")}.${String(p.year).slice(2)}`;
}

/** Extra minutes the LIVE badge stays on after the planned end. */
export const LIVE_GRACE_MIN = 15;

/**
 * What the public sees. A session marked Upcoming switches to Live by itself
 * during its slot, and to Recorded after, so you never have to rush to the
 * sheet at 9 PM. Settings › liveOverride can force it.
 */
export function effectiveStatus(
  s: Session,
  settings?: Pick<Settings, "liveOverride">,
  now = Date.now(),
): SessionStatus {
  if (s.status === "Draft" || s.status === "Cancelled") return s.status;
  const start = startOf(s).getTime();
  const end = start + (durationOf(s) + LIVE_GRACE_MIN) * 60e3;
  if (s.status === "Live") return "Live";
  if (s.status === "Recorded") return "Recorded";
  // Upcoming
  if (now >= start && now < end) {
    if (settings?.liveOverride === "off") return "Upcoming";
    return "Live";
  }
  if (now >= end) return "Recorded";
  return "Upcoming";
}

export function episodeLabel(n: number) {
  return `UNLOCK ${String(n).padStart(2, "0")}`;
}

export const TRACK_COPY: Record<Track, { line: string; topics: string }> = {
  CAREER: { line: "Unlock your career.", topics: "Resume, interviews, networking, workplace skills and entrepreneurship." },
  LEAD: { line: "Unlock your leadership.", topics: "Leadership, volunteering, communication and project management." },
  TECH: { line: "Unlock what's next.", topics: "AI, STEM, digital skills and innovation." },
  LIFE: { line: "Unlock yourself.", topics: "Wellbeing, money, confidence, identity and personal growth." },
};

export const TRACK_COLOR: Record<Track, string> = {
  CAREER: "#D4500F",
  LEAD: "#0B0D14",
  TECH: "#F39A1E",
  LIFE: "#FFD23F",
};

/** Google Calendar "add event" link for one session. */
export function gcalUrl(s: Session) {
  const start = startOf(s);
  const end = new Date(start.getTime() + durationOf(s) * 60e3);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${episodeLabel(s.episode)}: ${s.title}`,
    dates: `${f(start)}/${f(end)}`,
    details: `UNLOCK by GengVolunteers 2.0. ${s.summary || ""}\n${isOnline(s) ? "Live in GV Familia on Telegram." : `At ${venueOf(s)}.`}`,
    location: venueOf(s),
    ctz: "Asia/Kuala_Lumpur",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Turns a Google Drive share link into a direct image URL. */
export function imageUrl(url: string, width = 1600) {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  const m = url.match(/\/d\/([\w-]{20,})/) || url.match(/[?&]id=([\w-]{20,})/);
  if (m && /drive\.google|googleusercontent/.test(url))
    return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w${width}`;
  return url;
}

/** Turns a YouTube or Drive link into something an iframe can play. */
export function embedUrl(url: string) {
  if (!url) return "";
  const yt =
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtube\.com\/(?:live|shorts|embed)\/([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]{20,})/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  return "";
}

export function countdownParts(target: number, now = Date.now()) {
  const s = Math.max(0, Math.floor((target - now) / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    done: s === 0,
  };
}

export function compactCountdown(target: number, now = Date.now()) {
  const c = countdownParts(target, now);
  if (c.d > 0) return `${c.d}d ${c.h}h`;
  if (c.h > 0) return `${c.h}h ${c.m}m`;
  return `${c.m}m ${String(c.s).padStart(2, "0")}s`;
}

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

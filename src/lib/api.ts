import { APPS_SCRIPT_URL } from "@/config";
import { SEED } from "@/data/seed";
import type { AdminData, Guest, PlanTask, PublicData, Session, Settings } from "./types";
import { uid } from "./format";

/**
 * One data layer for the whole site.
 *  - Live mode: talks to the Google Apps Script web app (APPS_SCRIPT_URL).
 *  - Demo mode: keeps a copy of the sample data in this browser only.
 *
 * Apps Script requests are sent as text/plain so the browser does not do a
 * CORS preflight, which Apps Script cannot answer.
 */

export const DEMO = !APPS_SCRIPT_URL;
const DEMO_KEY = "demo";
const STORE = "unlockbygv-demo-v1";

type Ok<T> = { ok: true } & T;

async function call<T>(action: string, data: unknown = {}, key = ""): Promise<Ok<T>> {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, key, data }),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Server replied ${res.status}. Check the Apps Script deployment.`);
  let json: { ok: boolean; error?: string } & T;
  try {
    json = await res.json();
  } catch {
    throw new Error("The server did not send JSON. Is the Web App deployed to 'Anyone'?");
  }
  if (!json.ok) throw new Error(json.error || "Something went wrong on the server.");
  return json as Ok<T>;
}

/* ── demo storage ─────────────────────────────────────────────── */

function load(): AdminData {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return JSON.parse(raw) as AdminData;
  } catch {
    /* private window or blocked storage: fall back to the seed */
  }
  return structuredClone(SEED);
}

function save(db: AdminData) {
  try {
    localStorage.setItem(STORE, JSON.stringify(db));
  } catch {
    throw new Error("This browser's demo storage is full. Remove some photos, or connect the Google Sheet.");
  }
}

function demoAdmin(key: string) {
  if (key !== DEMO_KEY) throw new Error("Wrong admin key.");
}

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));

function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item;
  else list.push(item);
}

/* ── public ───────────────────────────────────────────────────── */

export async function getPublic(): Promise<PublicData> {
  if (DEMO) {
    await wait(150);
    const db = load();
    return { sessions: db.sessions.filter((s) => s.published), settings: db.settings };
  }
  const res = await fetch(`${APPS_SCRIPT_URL}?action=public`, { redirect: "follow" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Could not load sessions.");
  return { sessions: json.sessions, settings: json.settings };
}

export type GuestSubmission = Omit<Guest, "id" | "timestamp" | "status" | "sessionId" | "notes" | "source" | "photos"> & {
  /** Compressed images as data URLs; the server turns them into Drive links. */
  photos: string[];
};

export async function submitGuest(g: GuestSubmission): Promise<{ id: string }> {
  if (DEMO) {
    await wait(700);
    const db = load();
    const id = uid("g");
    db.guests.unshift({
      ...g,
      id,
      timestamp: new Date().toISOString(),
      status: "New",
      sessionId: "",
      notes: "",
      source: "Website",
    });
    save(db);
    return { id };
  }
  const r = await call<{ id: string }>("submitGuest", g);
  return { id: r.id };
}

/* ── admin ────────────────────────────────────────────────────── */

export async function adminLoad(key: string): Promise<AdminData> {
  if (DEMO) {
    demoAdmin(key);
    await wait(200);
    return load();
  }
  const r = await call<AdminData>("adminLoad", {}, key);
  return { sessions: r.sessions, settings: r.settings, guests: r.guests, plan: r.plan };
}

export async function saveSession(key: string, s: Session) {
  if (DEMO) {
    demoAdmin(key);
    const db = load();
    upsert(db.sessions, { ...s, updatedAt: new Date().toISOString() });
    db.sessions.sort((a, b) => a.episode - b.episode);
    save(db);
    return;
  }
  await call("saveSession", s, key);
}

export async function deleteSession(key: string, id: string) {
  if (DEMO) {
    demoAdmin(key);
    const db = load();
    db.sessions = db.sessions.filter((s) => s.id !== id);
    db.plan = db.plan.filter((t) => t.sessionId !== id);
    save(db);
    return;
  }
  await call("deleteSession", { id }, key);
}

export async function saveGuest(key: string, g: Guest) {
  if (DEMO) {
    demoAdmin(key);
    const db = load();
    upsert(db.guests, g);
    save(db);
    return;
  }
  await call("saveGuest", g, key);
}

export async function deleteGuest(key: string, id: string) {
  if (DEMO) {
    demoAdmin(key);
    const db = load();
    db.guests = db.guests.filter((g) => g.id !== id);
    save(db);
    return;
  }
  await call("deleteGuest", { id }, key);
}

export async function savePlan(key: string, tasks: PlanTask[]) {
  if (DEMO) {
    demoAdmin(key);
    const db = load();
    for (const t of tasks) upsert(db.plan, t);
    save(db);
    return;
  }
  await call("savePlan", { tasks }, key);
}

export async function deletePlan(key: string, id: string) {
  if (DEMO) {
    demoAdmin(key);
    const db = load();
    db.plan = db.plan.filter((t) => t.id !== id);
    save(db);
    return;
  }
  await call("deletePlan", { id }, key);
}

export async function saveSettings(key: string, s: Settings) {
  if (DEMO) {
    demoAdmin(key);
    const db = load();
    db.settings = s;
    save(db);
    return;
  }
  await call("saveSettings", s, key);
}

/** Uploads one compressed image and returns a link to show it. */
export async function uploadPhoto(key: string, dataUrl: string, name: string): Promise<string> {
  if (DEMO) {
    demoAdmin(key);
    return dataUrl;
  }
  const r = await call<{ url: string }>("uploadPhoto", { dataUrl, name }, key);
  return r.url;
}

export function resetDemo() {
  try {
    localStorage.removeItem(STORE);
  } catch {
    /* nothing to clear */
  }
}

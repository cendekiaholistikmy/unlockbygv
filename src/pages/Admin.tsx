import * as React from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  CircleDot,
  ExternalLink,
  ImagePlus,
  KeyRound,
  ListChecks,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Users,
  Video,
  X,
  LayoutDashboard,
} from "lucide-react";
import * as api from "@/lib/api";
import { DEMO } from "@/lib/api";
import { useIsland } from "@/components/DynamicIsland";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusBadge } from "@/components/SessionCard";
import { useData } from "@/lib/store";
import { compressImage } from "@/lib/image";
import { dateLabel, effectiveStatus, episodeLabel, imageUrl, timeRange, uid, venueOf } from "@/lib/format";
import { posterFor } from "@/lib/poster";
import { standardTasks } from "@/data/seed";
import {
  GUEST_STATUSES,
  GUEST_TYPES,
  PLAN_STATUSES,
  SESSION_STATUSES,
  TRACKS,
  type AdminData,
  type Guest,
  type PlanTask,
  type Session,
  type Settings,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const KEY_STORE = "unlockbygv-admin-key";
type Tab = "overview" | "sessions" | "guests" | "planning" | "settings";

export default function Admin() {
  const { notify } = useIsland();
  const { refresh } = useData();
  const [key, setKey] = React.useState(() => {
    try {
      return sessionStorage.getItem(KEY_STORE) ?? "";
    } catch {
      return "";
    }
  });
  const [db, setDb] = React.useState<AdminData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("overview");

  const load = React.useCallback(
    async (k = key, quiet = false) => {
      setLoading(true);
      try {
        const d = await api.adminLoad(k);
        d.sessions.sort((a, b) => a.episode - b.episode);
        setDb(d);
        try {
          sessionStorage.setItem(KEY_STORE, k);
        } catch {
          /* storage blocked: stay signed in for this page only */
        }
        if (!quiet) notify("Admin unlocked.");
      } catch (e) {
        setDb(null);
        notify(e instanceof Error ? e.message : "Could not sign in.", "error");
        try {
          sessionStorage.removeItem(KEY_STORE);
        } catch {
          /* ignore */
        }
      } finally {
        setLoading(false);
      }
    },
    [key, notify],
  );

  React.useEffect(() => {
    if (key) load(key, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Runs a save, then reloads everything so the sheet stays the source of truth. */
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      notify(ok);
      await load(key, true);
      refresh();
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed.", "error");
      return false;
    }
  };

  if (!db) return <Login keyValue={key} setKey={setKey} onSubmit={() => load(key)} loading={loading} />;

  const newGuests = db.guests.filter((g) => g.status === "New").length;
  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
    { id: "sessions", label: "Sessions", icon: <Video size={16} /> },
    { id: "guests", label: "Guests", icon: <Users size={16} />, badge: newGuests },
    { id: "planning", label: "Planning", icon: <ListChecks size={16} /> },
    { id: "settings", label: "Settings", icon: <Settings2 size={16} /> },
  ];

  return (
    <main className="min-h-[100svh] bg-paper pb-24 pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            <div className="text-[13px] font-extrabold tracking-[0.18em] text-flame-a">UNLOCK ADMIN</div>
            <h1 className="font-display text-4xl leading-none sm:text-5xl">Control room</h1>
            {DEMO && (
              <p className="mt-2 max-w-xl text-sm font-semibold text-[#B54708]">
                Demo mode: changes stay in this browser. Paste your Apps Script URL in src/config.ts to save to the Google Sheet.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => load(key)} disabled={loading}>
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Reload
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  sessionStorage.removeItem(KEY_STORE);
                } catch {
                  /* ignore */
                }
                setDb(null);
                setKey("");
              }}
            >
              <LogOut size={15} /> Sign out
            </Button>
          </div>
        </div>

        <LayoutGroup id="admin-tabs">
          <div className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b-2 border-ink px-4 sm:mx-0 sm:px-0">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={cn("relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-extrabold", tab === t.id ? "text-ink" : "text-muted-foreground hover:text-ink")}>
                {t.icon} {t.label}
                {!!t.badge && <span className="rounded-full bg-flame-a px-1.5 text-[11px] text-white">{t.badge}</span>}
                {tab === t.id && <motion.span layoutId="admin-tab" className="absolute inset-x-2 -bottom-[2px] h-1 rounded-full bg-flame" />}
              </button>
            ))}
          </div>
        </LayoutGroup>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="pt-8">
            {tab === "overview" && <Overview db={db} go={setTab} />}
            {tab === "sessions" && <SessionsTab db={db} adminKey={key} run={run} />}
            {tab === "guests" && <GuestsTab db={db} adminKey={key} run={run} goSessions={() => setTab("sessions")} />}
            {tab === "planning" && <PlanningTab db={db} adminKey={key} run={run} />}
            {tab === "settings" && <SettingsTab db={db} adminKey={key} run={run} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

type RunFn = (fn: () => Promise<unknown>, ok: string) => Promise<boolean>;

/* ── Login ─────────────────────────────────────────────────────── */

function Login({ keyValue, setKey, onSubmit, loading }: { keyValue: string; setKey: (k: string) => void; onSubmit: () => void; loading: boolean }) {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-ink px-4 pt-16">
      <motion.form
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (keyValue.trim()) onSubmit();
        }}
        className="w-full max-w-sm rounded-[28px] border-2 border-ink bg-paper p-7 shadow-hard-flame"
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-flame">
          <KeyRound size={26} />
        </div>
        <h1 className="mt-5 font-display text-4xl leading-none">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the admin key to manage sessions, guests and planning.
          {DEMO && <span className="block pt-1 font-bold text-[#B54708]">Demo key: demo</span>}
        </p>
        <Field label="Admin key" className="mt-5" htmlFor="akey">
          <Input id="akey" type="password" autoFocus value={keyValue} onChange={(e) => setKey(e.target.value)} autoComplete="current-password" />
        </Field>
        <Button type="submit" className="mt-5 w-full" disabled={loading || !keyValue.trim()}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : "Unlock"}
        </Button>
      </motion.form>
    </main>
  );
}

/* ── Overview ──────────────────────────────────────────────────── */

function Overview({ db, go }: { db: AdminData; go: (t: Tab) => void }) {
  const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const status = (s: Session) => effectiveStatus(s, db.settings);
  const upcoming = db.sessions.filter((s) => status(s) === "Upcoming").length;
  const recorded = db.sessions.filter((s) => status(s) === "Recorded").length;
  const confirmed = db.guests.filter((g) => g.status === "Confirmed").length;
  const newG = db.guests.filter((g) => g.status === "New").length;
  const overdue = db.plan.filter((t) => t.status !== "Done" && t.due && t.due < today);
  const dueSoon = db.plan.filter((t) => t.status !== "Done" && t.due >= today).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);
  const stats = [
    { label: "Upcoming sessions", value: upcoming, tab: "sessions" as Tab },
    { label: "Recorded", value: recorded, tab: "sessions" as Tab },
    { label: "New guest requests", value: newG, tab: "guests" as Tab, hot: newG > 0 },
    { label: "Confirmed guests", value: confirmed, tab: "guests" as Tab },
    { label: "Overdue tasks", value: overdue.length, tab: "planning" as Tab, hot: overdue.length > 0 },
  ];
  const titleOf = (id: string) => {
    const s = db.sessions.find((x) => x.id === id);
    return s ? episodeLabel(s.episode) : "No session";
  };
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s, i) => (
          <motion.button
            key={s.label}
            onClick={() => go(s.tab)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -4 }}
            className={cn("rounded-3xl border-2 border-ink p-5 text-left shadow-hard", s.hot ? "bg-flame" : "bg-white")}
          >
            <div className="font-display text-5xl not-italic leading-none">{s.value}</div>
            <div className="mt-2 text-sm font-bold">{s.label}</div>
          </motion.button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border-2 border-ink bg-white p-6">
          <div className="flex items-center gap-2 font-display text-2xl"><CalendarClock size={22} /> Coming up</div>
          <div className="mt-4 flex flex-col divide-y divide-ink/10">
            {[...overdue, ...dueSoon].length === 0 && <p className="py-3 text-sm text-muted-foreground">No open tasks. Generate a run sheet in Planning.</p>}
            {[...overdue, ...dueSoon].map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-bold">{t.task}</div>
                  <div className="text-muted-foreground">{titleOf(t.sessionId)}{t.owner ? ` · ${t.owner}` : ""}</div>
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold", t.due < today ? "bg-[#FEE4E2] text-[#B42318]" : "bg-paper")}>{t.due}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border-2 border-ink bg-white p-6">
          <div className="flex items-center gap-2 font-display text-2xl"><Users size={22} /> Latest requests</div>
          <div className="mt-4 flex flex-col divide-y divide-ink/10">
            {db.guests.length === 0 && <p className="py-3 text-sm text-muted-foreground">No requests yet. Share the Share at UNLOCK page.</p>}
            {db.guests.slice(0, 6).map((g) => (
              <div key={g.id} className="flex items-center gap-3 py-3 text-sm">
                {g.photos[0] ? <img src={imageUrl(g.photos[0], 200)} alt="" className="h-10 w-10 rounded-full border-2 border-ink object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-paper font-bold">{g.name.slice(0, 1)}</div>}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{g.name} <span className="font-medium text-muted-foreground">· {g.type}</span></div>
                  <div className="truncate text-muted-foreground">{g.topic}</div>
                </div>
                <GuestStatusPill status={g.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Drawer ────────────────────────────────────────────────────── */

function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <motion.div className="fixed inset-0 z-[58] flex justify-end bg-ink/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside
        onClick={(e) => e.stopPropagation()}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="flex h-full w-full max-w-2xl flex-col border-l-2 border-ink bg-paper"
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b-2 border-ink px-5 pb-4 pt-16">
          <div className="font-display text-2xl">{title}</div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink bg-white px-5 py-4">{footer}</div>
      </motion.aside>
    </motion.div>
  );
}

/* ── Photo upload control ──────────────────────────────────────── */

function PhotoPicker({ adminKey, value, onChange, multiple, label, aspect = "aspect-video" }: { adminKey: string; value: string[]; onChange: (v: string[]) => void; multiple?: boolean; label: string; aspect?: string }) {
  const { notify } = useIsland();
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const add = async (files: FileList) => {
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, multiple ? 12 : 1)) {
        const data = await compressImage(f, DEMO ? 1000 : 1800, DEMO ? 0.72 : 0.84);
        urls.push(await api.uploadPhoto(adminKey, data, f.name));
      }
      onChange(multiple ? [...value, ...urls] : urls);
      notify(urls.length > 1 ? `${urls.length} photos uploaded.` : "Photo uploaded.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed.", "error");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-extrabold">{label}</div>
      <div className={cn("grid gap-2", multiple ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-1")}>
        {value.map((v, i) => (
          <div key={v.slice(-30) + i} className={cn("group relative overflow-hidden rounded-xl border-2 border-ink bg-ink", multiple ? "aspect-square" : aspect)}>
            <img src={imageUrl(v, 600)} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#B42318]" aria-label="Remove photo">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {(multiple || value.length === 0) && (
          <button type="button" onClick={() => ref.current?.click()} className={cn("flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink/40 bg-white text-sm font-bold text-muted-foreground hover:bg-flame-c/20", multiple ? "aspect-square" : aspect)}>
            {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {busy ? "Uploading…" : multiple ? "Add photos" : "Upload"}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => e.target.files && add(e.target.files)} />
      <Input placeholder="…or paste an image link (Google Drive share links work)" onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const v = (e.target as HTMLInputElement).value.trim();
          if (v) {
            onChange(multiple ? [...value, v] : [v]);
            (e.target as HTMLInputElement).value = "";
          }
        }
      }} className="h-10 text-sm" />
    </div>
  );
}

/* ── Sessions ──────────────────────────────────────────────────── */

function blankSession(db: AdminData): Session {
  const ep = Math.max(0, ...db.sessions.map((s) => s.episode)) + 1;
  return {
    id: `unlock-${String(ep).padStart(2, "0")}-${Math.random().toString(36).slice(2, 5)}`,
    episode: ep,
    title: "",
    track: TRACKS[(ep - 1) % 4],
    status: "Upcoming",
    date: "",
    time: db.settings.defaultTime || "21:00",
    duration: 60,
    venue: "",
    speaker: "",
    speakerTitle: "",
    speakerPhoto: "",
    poster: "",
    gallery: [],
    recordingUrl: "",
    liveUrl: "",
    summary: "",
    takeaways: ["", "", ""],
    published: false,
    updatedAt: "",
  };
}

function SessionsTab({ db, adminKey, run }: { db: AdminData; adminKey: string; run: RunFn }) {
  const [edit, setEdit] = React.useState<Session | null>(null);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Upcoming sessions switch to Live and then Recording by themselves at the session time.</p>
        <Button onClick={() => setEdit(blankSession(db))}>
          <Plus size={18} /> New session
        </Button>
      </div>
      <div className="grid gap-4">
        {db.sessions.map((s, i) => (
          <motion.button
            key={s.id}
            layout
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setEdit(structuredClone(s))}
            className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-ink bg-white p-3 text-left hover:shadow-hard sm:flex-nowrap"
          >
            <img src={posterFor(s)} alt="" className="aspect-video w-32 shrink-0 rounded-2xl border-2 border-ink object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg leading-none text-flame">{episodeLabel(s.episode)}</span>
                <StatusBadge status={effectiveStatus(s, db.settings)} />
                {!s.published && <span className="rounded-full border border-ink px-2 py-0.5 text-[11px] font-extrabold">HIDDEN</span>}
              </div>
              <div className="mt-1 truncate font-extrabold">{s.title || "Untitled"}</div>
              <div className="truncate text-sm text-muted-foreground">
                {s.date ? `${dateLabel(s)} · ${timeRange(s)}` : "No date"} · {venueOf(s)} · {s.speaker || "No speaker"}
              </div>
            </div>
            <span className="text-xs font-extrabold tracking-[0.12em] text-flame-a">{s.track}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {edit && (
          <SessionEditor
            key={edit.id}
            initial={edit}
            exists={db.sessions.some((s) => s.id === edit.id)}
            hasPlan={db.plan.some((t) => t.sessionId === edit.id)}
            adminKey={adminKey}
            onClose={() => setEdit(null)}
            onSave={async (s, makePlan) => {
              const ok = await run(async () => {
                await api.saveSession(adminKey, s);
                if (makePlan) await api.savePlan(adminKey, standardTasks(s));
              }, `${episodeLabel(s.episode)} saved.`);
              if (ok) setEdit(null);
            }}
            onDelete={async (id) => {
              if (!confirm("Delete this session and its planning tasks? This cannot be undone.")) return;
              const ok = await run(() => api.deleteSession(adminKey, id), "Session deleted.");
              if (ok) setEdit(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SessionEditor({ initial, exists, hasPlan, adminKey, onClose, onSave, onDelete }: { initial: Session; exists: boolean; hasPlan: boolean; adminKey: string; onClose: () => void; onSave: (s: Session, makePlan: boolean) => void; onDelete: (id: string) => void }) {
  const [s, setS] = React.useState<Session>({ ...initial, takeaways: initial.takeaways.length ? initial.takeaways : ["", "", ""] });
  const [saving, setSaving] = React.useState(false);
  const [makePlan, setMakePlan] = React.useState(!hasPlan);
  const set = <K extends keyof Session>(k: K, v: Session[K]) => setS((p) => ({ ...p, [k]: v }));
  const valid = s.title.trim() && s.date;
  return (
    <Drawer
      title={exists ? `Edit ${episodeLabel(s.episode)}` : "New session"}
      onClose={onClose}
      footer={
        <>
          {exists ? (
            <Button variant="danger" size="sm" onClick={() => onDelete(s.id)}>
              <Trash2 size={15} /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {!hasPlan && (
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={makePlan} onChange={(e) => setMakePlan(e.target.checked)} className="h-4 w-4 accent-[#D4500F]" /> Create run sheet
              </label>
            )}
            <Button
              disabled={!valid || saving}
              onClick={async () => {
                setSaving(true);
                await onSave({ ...s, takeaways: s.takeaways.map((t) => t.trim()).filter(Boolean) }, makePlan && !hasPlan);
                setSaving(false);
              }}
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : "Save"}
            </Button>
          </div>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Episode number" htmlFor="ep">
          <Input id="ep" type="number" min={1} value={s.episode} onChange={(e) => set("episode", Number(e.target.value) || 1)} />
        </Field>
        <Field label="Track" htmlFor="tr">
          <Select id="tr" value={s.track} onChange={(e) => set("track", e.target.value as Session["track"])}>
            {TRACKS.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Title" required className="sm:col-span-2" htmlFor="ti">
          <Input id="ti" value={s.title} onChange={(e) => set("title", e.target.value)} placeholder="The resume that makes employers stop scrolling" />
        </Field>
        <Field label="Date" required hint="Jumaat, Sabtu or Ahad" htmlFor="dt">
          <Input id="dt" type="date" value={s.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Time (Malaysia)" htmlFor="tm">
          <Input id="tm" type="time" value={s.time} onChange={(e) => set("time", e.target.value)} />
        </Field>
        <Field label="Duration (minutes)" hint="The LIVE badge stays on until 15 min after this." htmlFor="du">
          <Input id="du" type="number" min={15} step={15} value={s.duration || 60} onChange={(e) => set("duration", Number(e.target.value) || 60)} />
        </Field>
        <Field label="Venue" hint="Leave empty for online in GV Familia (Telegram)." htmlFor="ve">
          <Input id="ve" value={s.venue || ""} onChange={(e) => set("venue", e.target.value)} placeholder="e.g. IRC Level 5, UNITEN" />
        </Field>
        <Field label="Status" hint="Leave on Upcoming; it goes Live and then Recording by itself." htmlFor="st">
          <Select id="st" value={s.status} onChange={(e) => set("status", e.target.value as Session["status"])}>
            {SESSION_STATUSES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Show on website">
          <label className="flex h-12 items-center gap-3 rounded-xl border-2 border-ink bg-white px-4 font-bold">
            <input type="checkbox" checked={s.published} onChange={(e) => set("published", e.target.checked)} className="h-5 w-5 accent-[#D4500F]" />
            {s.published ? "Published" : "Hidden"}
          </label>
        </Field>
        <Field label="Speaker name" htmlFor="sp">
          <Input id="sp" value={s.speaker} onChange={(e) => set("speaker", e.target.value)} />
        </Field>
        <Field label="Speaker title" htmlFor="spt">
          <Input id="spt" value={s.speakerTitle} onChange={(e) => set("speakerTitle", e.target.value)} placeholder="Position, Organisation" />
        </Field>
        <Field label="Summary" className="sm:col-span-2" htmlFor="sum">
          <Textarea id="sum" value={s.summary} onChange={(e) => set("summary", e.target.value)} className="min-h-[90px]" />
        </Field>
        <div className="sm:col-span-2">
          <PhotoPicker adminKey={adminKey} label="Poster (16:9). Leave empty to use the automatic UNLOCK poster." value={s.poster ? [s.poster] : []} onChange={(v) => set("poster", v[0] ?? "")} />
        </div>
        <div>
          <PhotoPicker adminKey={adminKey} label="Speaker photo" aspect="aspect-square" value={s.speakerPhoto ? [s.speakerPhoto] : []} onChange={(v) => set("speakerPhoto", v[0] ?? "")} />
        </div>
        <div className="flex flex-col gap-5">
          <Field label="Live link" hint="Telegram or Meet link, or a Google Maps link for a physical venue" htmlFor="ll">
            <Input id="ll" value={s.liveUrl} onChange={(e) => set("liveUrl", e.target.value)} placeholder="https://t.me/…" />
          </Field>
          <Field label="Recording link" hint="YouTube or Google Drive video" htmlFor="rl">
            <Input id="rl" value={s.recordingUrl} onChange={(e) => set("recordingUrl", e.target.value)} placeholder="https://youtu.be/…" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <PhotoPicker adminKey={adminKey} multiple label="Session photos (gallery)" value={s.gallery} onChange={(v) => set("gallery", v)} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <div className="text-sm font-extrabold">What we unlocked (takeaways)</div>
          {s.takeaways.map((t, i) => (
            <div key={i} className="flex gap-2">
              <Input value={t} onChange={(e) => set("takeaways", s.takeaways.map((x, k) => (k === i ? e.target.value : x)))} placeholder={`Takeaway ${i + 1}`} />
              <button type="button" onClick={() => set("takeaways", s.takeaways.filter((_, k) => k !== i))} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-ink bg-white" aria-label="Remove takeaway">
                <X size={16} />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={() => set("takeaways", [...s.takeaways, ""])}>
            <Plus size={15} /> Add takeaway
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ── Guests ────────────────────────────────────────────────────── */

function GuestStatusPill({ status }: { status: Guest["status"] }) {
  const map: Record<Guest["status"], string> = {
    New: "bg-flame text-ink",
    "To invite": "bg-[#FFF4D6] text-[#7A4B00]",
    Invited: "bg-[#E0EAFF] text-[#1D3A8A]",
    Confirmed: "bg-[#D1FADF] text-[#05603A]",
    Declined: "bg-[#F2F4F7] text-[#475467]",
    Done: "bg-ink text-white",
  };
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]", map[status])}>{status}</span>;
}

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "60");
  return digits ? `https://wa.me/${digits}` : "";
}

function GuestsTab({ db, adminKey, run, goSessions }: { db: AdminData; adminKey: string; run: RunFn; goSessions: () => void }) {
  const [filter, setFilter] = React.useState<string>("");
  const [type, setType] = React.useState<string>("");
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<Guest | null>(null);
  const list = db.guests
    .filter((g) => !filter || g.status === filter)
    .filter((g) => !type || g.type === type)
    .filter((g) => !q || `${g.name} ${g.organisation} ${g.topic} ${g.role}`.toLowerCase().includes(q.toLowerCase()));

  const quickStatus = (g: Guest, status: Guest["status"]) => run(() => api.saveGuest(adminKey, { ...g, status }), `${g.name}: ${status}`);

  const blank: Guest = { id: uid("g"), timestamp: new Date().toISOString(), type: "Offer to share", name: "", email: "", phone: "", organisation: "", role: "", topic: "", track: "", abstract: "", preferredSlot: "", preferredDate: "", links: "", photos: [], source: "Network", status: "To invite", sessionId: "", notes: "", consent: true };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
          {["", ...GUEST_STATUSES].map((s) => (
            <button key={s || "all"} onClick={() => setFilter(s)} className={cn("shrink-0 rounded-full border-2 border-ink px-3 py-1.5 text-xs font-extrabold", filter === s ? "bg-ink text-white" : "bg-white")}>
              {s || "All"} <span className="opacity-60">{s ? db.guests.filter((g) => g.status === s).length : db.guests.length}</span>
            </button>
          ))}
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-auto text-sm">
          <option value="">All types</option>
          {GUEST_TYPES.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-10 w-full text-sm sm:w-52" />
        <Button size="sm" className="ml-auto" onClick={() => setOpen(blank)}>
          <Plus size={15} /> Add guest
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {list.map((g) => (
            <motion.div key={g.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col gap-3 rounded-3xl border-2 border-ink bg-white p-4">
              <div className="flex items-start gap-3">
                {g.photos[0] ? <img src={imageUrl(g.photos[0], 240)} alt="" className="h-14 w-14 shrink-0 rounded-2xl border-2 border-ink object-cover" /> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-paper font-display text-2xl">{g.name.slice(0, 1) || "?"}</div>}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-extrabold">{g.name || "Unnamed"}</span>
                    <GuestStatusPill status={g.status} />
                  </div>
                  <div className="text-xs font-bold text-flame-a">{g.type}{g.track ? ` · ${g.track}` : ""} · {g.source}</div>
                  <div className="mt-1 line-clamp-2 text-sm">{g.topic}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={g.status} onChange={(e) => quickStatus(g, e.target.value as Guest["status"])} className="h-9 w-auto text-sm" aria-label="Status">
                  {GUEST_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </Select>
                {g.email && <a href={`mailto:${g.email}?subject=UNLOCK%20by%20GengVolunteers`} className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink" aria-label="Email"><Mail size={15} /></a>}
                {waLink(g.phone) && <a href={waLink(g.phone)} target="_blank" rel="noopener" className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink" aria-label="WhatsApp"><MessageCircle size={15} /></a>}
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setOpen(structuredClone(g))}>Open</Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {list.length === 0 && <p className="text-sm text-muted-foreground">No guests match.</p>}
      </div>

      <AnimatePresence>
        {open && (
          <GuestEditor
            key={open.id}
            initial={open}
            db={db}
            exists={db.guests.some((g) => g.id === open.id)}
            onClose={() => setOpen(null)}
            onSave={async (g) => {
              if (await run(() => api.saveGuest(adminKey, g), "Guest saved.")) setOpen(null);
            }}
            onDelete={async (id) => {
              if (!confirm("Delete this guest? Their photos stay in Drive.")) return;
              if (await run(() => api.deleteGuest(adminKey, id), "Guest deleted.")) setOpen(null);
            }}
            onMakeSession={async (g) => {
              const ep = Math.max(0, ...db.sessions.map((s) => s.episode)) + 1;
              const s: Session = {
                ...blankSession(db),
                episode: ep,
                title: g.type === "Offer to share" ? g.topic : "",
                track: (g.track || TRACKS[(ep - 1) % 4]) as Session["track"],
                speaker: g.type === "Offer to share" ? g.name : "",
                speakerTitle: [g.role, g.organisation].filter(Boolean).join(", "),
                speakerPhoto: g.photos[0] ?? "",
                summary: g.abstract,
                published: false,
              };
              const ok = await run(async () => {
                await api.saveSession(adminKey, s);
                await api.saveGuest(adminKey, { ...g, sessionId: s.id, status: g.status === "New" || g.status === "To invite" || g.status === "Invited" ? "Confirmed" : g.status });
                await api.savePlan(adminKey, standardTasks({ ...s, date: s.date || new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10) }));
              }, `Draft ${episodeLabel(ep)} created (hidden). Add the date in Sessions.`);
              if (ok) {
                setOpen(null);
                goSessions();
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GuestEditor({ initial, db, exists, onClose, onSave, onDelete, onMakeSession }: { initial: Guest; db: AdminData; exists: boolean; onClose: () => void; onSave: (g: Guest) => void; onDelete: (id: string) => void; onMakeSession: (g: Guest) => void }) {
  const [g, setG] = React.useState(initial);
  const set = <K extends keyof Guest>(k: K, v: Guest[K]) => setG((p) => ({ ...p, [k]: v }));
  return (
    <Drawer
      title={exists ? g.name || "Guest" : "Add guest"}
      onClose={onClose}
      footer={
        <>
          {exists ? <Button variant="danger" size="sm" onClick={() => onDelete(g.id)}><Trash2 size={15} /> Delete</Button> : <span />}
          <div className="flex gap-2">
            {exists && !g.sessionId && <Button variant="outline" size="sm" onClick={() => onMakeSession(g)}>Make a session</Button>}
            <Button onClick={() => onSave(g)} disabled={!g.name.trim()}>Save</Button>
          </div>
        </>
      }
    >
      {g.photos.length > 0 && (
        <div className="mb-5 grid grid-cols-4 gap-2">
          {g.photos.map((p, i) => (
            <a key={i} href={imageUrl(p, 2000)} target="_blank" rel="noopener" className="aspect-square overflow-hidden rounded-xl border-2 border-ink">
              <img src={imageUrl(p, 400)} alt="" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type"><Select value={g.type} onChange={(e) => set("type", e.target.value as Guest["type"])}>{GUEST_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Status"><Select value={g.status} onChange={(e) => set("status", e.target.value as Guest["status"])}>{GUEST_STATUSES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Name" required><Input value={g.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Source"><Select value={g.source} onChange={(e) => set("source", e.target.value)}>{["Website", "Network", "Referral"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Email"><Input value={g.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Phone"><Input value={g.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Organisation"><Input value={g.organisation} onChange={(e) => set("organisation", e.target.value)} /></Field>
        <Field label="Role"><Input value={g.role} onChange={(e) => set("role", e.target.value)} /></Field>
        <Field label="Topic / title" className="sm:col-span-2"><Input value={g.topic} onChange={(e) => set("topic", e.target.value)} /></Field>
        <Field label="Track"><Select value={g.track} onChange={(e) => set("track", e.target.value as Guest["track"])}><option value="">Not set</option>{TRACKS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Assigned session">
          <Select value={g.sessionId} onChange={(e) => set("sessionId", e.target.value)}>
            <option value="">None</option>
            {db.sessions.map((s) => <option key={s.id} value={s.id}>{episodeLabel(s.episode)}: {s.title || "Untitled"}</option>)}
          </Select>
        </Field>
        <Field label="Preferred night"><Input value={g.preferredSlot} onChange={(e) => set("preferredSlot", e.target.value)} /></Field>
        <Field label="Preferred date"><Input type="date" value={g.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} /></Field>
        <Field label="Abstract" className="sm:col-span-2"><Textarea value={g.abstract} onChange={(e) => set("abstract", e.target.value)} /></Field>
        <Field label="Links" className="sm:col-span-2">
          <div className="flex gap-2">
            <Input value={g.links} onChange={(e) => set("links", e.target.value)} />
            {/^https?:/.test(g.links) && <a href={g.links} target="_blank" rel="noopener" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-ink bg-white" aria-label="Open link"><ExternalLink size={16} /></a>}
          </div>
        </Field>
        <Field label="Team notes (private)" className="sm:col-span-2"><Textarea value={g.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-[90px]" /></Field>
        {exists && <p className="text-xs text-muted-foreground sm:col-span-2">Received {new Date(g.timestamp).toLocaleString("en-MY")} · PDPA consent: {g.consent ? "yes" : "no"}</p>}
      </div>
    </Drawer>
  );
}

/* ── Planning ──────────────────────────────────────────────────── */

function PlanningTab({ db, adminKey, run }: { db: AdminData; adminKey: string; run: RunFn }) {
  const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const upcomingFirst = [...db.sessions].sort((a, b) => (a.date || "9").localeCompare(b.date || "9"));
  const defaultId = upcomingFirst.find((s) => s.date >= today)?.id ?? upcomingFirst[0]?.id ?? "";
  const [sid, setSid] = React.useState(defaultId);
  const session = db.sessions.find((s) => s.id === sid);
  const tasks = db.plan.filter((t) => t.sessionId === sid).sort((a, b) => a.due.localeCompare(b.due));
  const done = tasks.filter((t) => t.status === "Done").length;
  const [newTask, setNewTask] = React.useState("");

  const cycle = (t: PlanTask) => {
    const next = PLAN_STATUSES[(PLAN_STATUSES.indexOf(t.status) + 1) % PLAN_STATUSES.length];
    run(() => api.savePlan(adminKey, [{ ...t, status: next }]), `${next}: ${t.task.slice(0, 40)}`);
  };

  if (!db.sessions.length) return <p className="text-sm text-muted-foreground">Create a session first.</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={sid} onChange={(e) => setSid(e.target.value)} className="w-auto min-w-[260px]">
          {upcomingFirst.map((s) => <option key={s.id} value={s.id}>{episodeLabel(s.episode)}: {s.title || "Untitled"} {s.date ? `(${s.date})` : ""}</option>)}
        </Select>
        {session && tasks.length === 0 && (
          <Button onClick={() => run(() => api.savePlan(adminKey, standardTasks({ ...session, date: session.date || today })), "Run sheet created.")} disabled={!session.date}>
            <ListChecks size={18} /> Create standard run sheet
          </Button>
        )}
        {tasks.length > 0 && (
          <div className="ml-auto flex items-center gap-3 text-sm font-bold">
            {done}/{tasks.length} done
            <div className="h-2.5 w-40 overflow-hidden rounded-full border-2 border-ink bg-white">
              <motion.div className="h-full bg-flame" animate={{ width: `${(done / tasks.length) * 100}%` }} />
            </div>
          </div>
        )}
      </div>
      {session && !session.date && <p className="text-sm font-bold text-[#B54708]">Give this session a date first so due dates can be worked out.</p>}

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {tasks.map((t) => {
            const overdue = t.status !== "Done" && t.due < today;
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} className={cn("flex flex-wrap items-center gap-3 rounded-2xl border-2 border-ink bg-white p-3", t.status === "Done" && "opacity-60")}>
                <button onClick={() => cycle(t)} className="grid h-9 w-9 place-items-center rounded-full" aria-label={`Status: ${t.status}. Change`}>
                  {t.status === "Done" ? <CheckCircle2 className="text-[#039855]" /> : t.status === "In progress" ? <CircleDot className="text-flame-a" /> : <Circle />}
                </button>
                <div className={cn("min-w-[180px] flex-1 font-bold", t.status === "Done" && "line-through")}>{t.task}</div>
                <Input defaultValue={t.owner} placeholder="Owner" className="h-9 w-32 text-sm" onBlur={(e) => e.target.value !== t.owner && run(() => api.savePlan(adminKey, [{ ...t, owner: e.target.value }]), "Owner updated.")} />
                <Input type="date" defaultValue={t.due} className={cn("h-9 w-40 text-sm", overdue && "border-[#B42318] text-[#B42318]")} onBlur={(e) => e.target.value !== t.due && run(() => api.savePlan(adminKey, [{ ...t, due: e.target.value }]), "Due date updated.")} />
                <Input defaultValue={t.link} placeholder="Link" className="h-9 w-36 text-sm" onBlur={(e) => e.target.value !== t.link && run(() => api.savePlan(adminKey, [{ ...t, link: e.target.value }]), "Link saved.")} />
                <button onClick={() => run(() => api.deletePlan(adminKey, t.id), "Task removed.")} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:text-[#B42318]" aria-label="Delete task">
                  <Trash2 size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {session && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTask.trim()) return;
            const t: PlanTask = { id: uid("t"), sessionId: session.id, task: newTask.trim(), owner: "", due: session.date || today, status: "Not started", link: "", notes: "" };
            run(() => api.savePlan(adminKey, [t]), "Task added.").then((ok) => ok && setNewTask(""));
          }}
        >
          <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a custom task (e.g. Book certificate design)" />
          <Button type="submit" variant="ink"><Plus size={18} /></Button>
        </form>
      )}
    </div>
  );
}

/* ── Settings ──────────────────────────────────────────────────── */

function SettingsTab({ db, adminKey, run }: { db: AdminData; adminKey: string; run: RunFn }) {
  const [s, setS] = React.useState<Settings>(db.settings);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));
  return (
    <form
      className="grid max-w-3xl gap-5 rounded-3xl border-2 border-ink bg-white p-6 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => api.saveSettings(adminKey, s), "Settings saved.");
      }}
    >
      <Field label="Dynamic island message" hint="Shown in the island when there is no upcoming session." className="sm:col-span-2">
        <Input value={s.announcement} onChange={(e) => set("announcement", e.target.value)} />
      </Field>
      <Field label="GV Familia Telegram link"><Input value={s.telegramUrl} onChange={(e) => set("telegramUrl", e.target.value)} /></Field>
      <Field label="Registration form link" hint="Optional. Adds a Register button to every upcoming session."><Input value={s.registerUrl} onChange={(e) => set("registerUrl", e.target.value)} /></Field>
      <Field label="Contact email"><Input value={s.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></Field>
      <Field label="Default session time"><Input type="time" value={s.defaultTime} onChange={(e) => set("defaultTime", e.target.value)} /></Field>
      <Field label="Live badge" className="sm:col-span-2">
        <div className="flex flex-wrap gap-2">
          {([
            ["auto", "Automatic (session time)"],
            ["on", "Force LIVE now"],
            ["off", "Never show live"],
          ] as const).map(([v, l]) => (
            <button type="button" key={v} onClick={() => set("liveOverride", v)} aria-pressed={s.liveOverride === v} className={cn("h-11 rounded-xl border-2 border-ink px-4 text-sm font-extrabold", s.liveOverride === v ? "bg-ink text-white" : "bg-white")}>
              {l}
            </button>
          ))}
        </div>
      </Field>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        {DEMO ? (
          <button type="button" className="text-sm font-bold text-muted-foreground underline underline-offset-4" onClick={() => { api.resetDemo(); window.location.reload(); }}>
            Reset demo data
          </button>
        ) : <span />}
        <Button type="submit">Save settings</Button>
      </div>
    </form>
  );
}

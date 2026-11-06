import * as React from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Search, SearchX } from "lucide-react";
import { TiltedGridHero } from "@/components/ui/tilted-grid-hero";
import { SessionCard } from "@/components/SessionCard";
import { SessionModal } from "@/components/SessionModal";
import { useData, go } from "@/lib/store";
import { bandImages } from "@/lib/poster";
import { startOf } from "@/lib/format";
import { TRACKS, type SessionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { key: "all" | SessionStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Live", label: "Live" },
  { key: "Upcoming", label: "Upcoming" },
  { key: "Recorded", label: "Recordings" },
];

export default function Sessions({ openId }: { openId?: string }) {
  const { data, statusOf, loading } = useData();
  const [tab, setTab] = React.useState<(typeof TABS)[number]["key"]>("all");
  const [track, setTrack] = React.useState<string>("");
  const [q, setQ] = React.useState("");

  const sessions = data.sessions.filter((s) => s.status !== "Draft");
  const images = React.useMemo(() => bandImages(sessions), [sessions]);
  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: sessions.length };
    for (const s of sessions) c[statusOf(s)] = (c[statusOf(s)] ?? 0) + 1;
    return c;
  }, [sessions, statusOf]);

  const list = sessions
    .filter((s) => tab === "all" || statusOf(s) === tab)
    .filter((s) => !track || s.track === track)
    .filter((s) => {
      if (!q.trim()) return true;
      const hay = `${s.title} ${s.speaker} ${s.speakerTitle} ${s.summary} ${s.track} unlock ${s.episode}`.toLowerCase();
      return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
    })
    .sort((a, b) => {
      const sa = statusOf(a), sb = statusOf(b);
      if (sa === "Recorded" && sb === "Recorded") return startOf(b).getTime() - startOf(a).getTime();
      const order = { Live: 0, Upcoming: 1, Recorded: 2, Cancelled: 3, Draft: 4 } as const;
      return order[sa] - order[sb] || startOf(a).getTime() - startOf(b).getTime();
    });

  const open = openId ? data.sessions.find((s) => s.id === openId) : undefined;

  return (
    <main>
      <TiltedGridHero images={images} speed={3} tileHeight={34} axis={58} curve={72} fade={8} className="h-[460px] w-full bg-ink sm:h-[520px]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink via-ink/30 to-ink/90" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-between px-4 pb-8 pt-24 text-white sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="text-[13px] font-extrabold tracking-[0.18em] text-flame-b">THE UNLOCK LIBRARY</div>
            <h1 className="mt-2 font-display text-[clamp(38px,6vw,84px)] leading-[0.9]">Every session.</h1>
          </motion.div>
          <p className="max-w-lg text-[15px] text-white/75">Live tonight, coming this weekend, or ready to rewatch with photos and takeaways.</p>
        </div>
      </TiltedGridHero>

      <section className="sticky top-16 z-40 border-y-2 border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <LayoutGroup id="tabs">
            <div className="flex rounded-full border-2 border-ink bg-white p-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn("relative rounded-full px-3.5 py-1.5 text-sm font-extrabold transition sm:px-4", tab === t.key ? "text-white" : "text-ink hover:bg-paper")}
                >
                  {tab === t.key && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span className="relative">
                    {t.label}
                    {counts[t.key] ? <span className={cn("ml-1.5 text-xs", tab === t.key ? "text-flame-c" : "text-muted-foreground")}>{counts[t.key]}</span> : null}
                  </span>
                </button>
              ))}
            </div>
          </LayoutGroup>
          <div className="scrollbar-none flex gap-2 overflow-x-auto">
            {TRACKS.map((t) => (
              <button
                key={t}
                onClick={() => setTrack(track === t ? "" : t)}
                className={cn(
                  "shrink-0 rounded-full border-2 border-ink px-3 py-1.5 text-xs font-extrabold tracking-[0.1em] transition",
                  track === t ? "bg-flame" : "bg-white hover:bg-paper",
                )}
                aria-pressed={track === t}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="relative ml-auto w-full sm:w-64">
            <span className="sr-only">Search sessions</span>
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title or speaker"
              className="h-11 w-full rounded-full border-2 border-ink bg-white pl-10 pr-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-flame-b/30"
            />
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[380px] animate-pulse rounded-3xl border-2 border-ink/20 bg-white" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 py-16 text-center">
            <SearchX size={40} className="text-flame-a" />
            <div className="text-xl font-extrabold">Nothing here yet.</div>
            <p className="text-muted-foreground">Try another tab or clear the search.</p>
          </motion.div>
        ) : (
          <motion.div layout className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3" style={{ perspective: 1200 }}>
            <AnimatePresence mode="popLayout">
              {list.map((s, i) => (
                <SessionCard key={s.id} s={s} status={statusOf(s)} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <AnimatePresence>{open && <SessionModal key={open.id} session={open} onClose={() => go("/sessions")} />}</AnimatePresence>
    </main>
  );
}

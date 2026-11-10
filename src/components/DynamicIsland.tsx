import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, Check, ChevronDown, Info, Radio, TriangleAlert, X } from "lucide-react";
import { useData, useNow, go } from "@/lib/store";
import { compactCountdown, countdownParts, dateLabel, episodeLabel, gcalUrl, isOnline, startOf, timeRange, venueOf } from "@/lib/format";
import { posterFor } from "@/lib/poster";
import { cn } from "@/lib/utils";

/* ── notifications ────────────────────────────────────────────────
 * Anything on the site can call notify() and the island morphs into a
 * toast for a few seconds, the way iOS shows a call or a timer. */

type Toast = { id: number; title: string; kind: "success" | "error" | "info" };
const IslandCtx = React.createContext<{ notify: (title: string, kind?: Toast["kind"]) => void }>({
  notify: () => {},
});
export const useIsland = () => React.useContext(IslandCtx);

const spring = { type: "spring", stiffness: 420, damping: 32, mass: 0.9 } as const;

export function IslandProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<Toast | null>(null);
  const timer = React.useRef<number>();
  const notify = React.useCallback((title: string, kind: Toast["kind"] = "success") => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), title, kind });
    timer.current = window.setTimeout(() => setToast(null), 3400);
  }, []);
  return (
    <IslandCtx.Provider value={{ notify }}>
      {children}
      <DynamicIsland toast={toast} onDismissToast={() => setToast(null)} />
    </IslandCtx.Provider>
  );
}

function LogoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="isl-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#D4500F" />
          <stop offset=".6" stopColor="#F39A1E" />
          <stop offset="1" stopColor="#FFD23F" />
        </linearGradient>
      </defs>
      <path d="M33.9 21.5A15 15 0 1 0 44.5 32.1" fill="none" stroke="#fff" strokeWidth="8.5" />
      <path d="M27 39L46 20" stroke="url(#isl-g)" strokeWidth="8" />
      <polygon points="55,11 52.5,31.5 34.5,13.5" fill="url(#isl-g)" />
    </svg>
  );
}

function Bars() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-[#FF453A]"
          animate={{ height: ["30%", "100%", "45%", "85%", "30%"] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

function DynamicIsland({ toast, onDismissToast }: { toast: Toast | null; onDismissToast: () => void }) {
  const { live, next, settings, loading } = useData();
  const now = useNow(1000);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const focus = live ?? next;

  React.useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const mode: "toast" | "expanded" | "compact" = toast ? "toast" : open && focus ? "expanded" : "compact";
  const joinHref = live?.liveUrl || settings.telegramUrl;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-3">
      <motion.div
        ref={ref}
        layout
        transition={spring}
        style={{ borderRadius: mode === "expanded" ? 30 : 999 }}
        className={cn(
          "pointer-events-auto overflow-hidden bg-black text-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/10",
          mode === "expanded" ? "w-[min(400px,calc(100vw-24px))]" : "",
        )}
        role="region"
        aria-label="UNLOCK status"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === "toast" && toast && (
            <motion.div
              key={`t-${toast.id}`}
              initial={{ opacity: 0, filter: "blur(6px)", scale: 0.9 }}
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, filter: "blur(6px)", scale: 0.9 }}
              transition={{ duration: 0.22 }}
              className="flex items-center gap-3 py-2.5 pl-2.5 pr-3"
              aria-live="polite"
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                  toast.kind === "success" && "bg-[#30D158] text-black",
                  toast.kind === "error" && "bg-[#FF453A] text-white",
                  toast.kind === "info" && "bg-flame text-black",
                )}
              >
                {toast.kind === "success" ? <Check size={18} strokeWidth={3} /> : toast.kind === "error" ? <TriangleAlert size={17} /> : <Info size={17} />}
              </span>
              <span className="max-w-[min(300px,70vw)] text-sm font-semibold leading-snug">{toast.title}</span>
              <button onClick={onDismissToast} aria-label="Dismiss" className="ml-1 grid h-7 w-7 place-items-center rounded-full text-white/60 hover:bg-white/10">
                <X size={15} />
              </button>
            </motion.div>
          )}

          {mode === "compact" && (
            <motion.button
              key="compact"
              type="button"
              onClick={() => focus && setOpen(true)}
              aria-expanded={false}
              initial={{ opacity: 0, filter: "blur(6px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(6px)" }}
              transition={{ duration: 0.2 }}
              className="flex h-10 items-center gap-2.5 whitespace-nowrap pl-2 pr-3.5 text-[13px] font-semibold"
            >
              {live ? (
                <>
                  <span className="live-dot ml-1 h-2.5 w-2.5 rounded-full bg-[#FF453A]" />
                  <span className="font-display text-[13px] not-italic tracking-wide">Live</span>
                  <span className="text-white/70">{episodeLabel(live.episode)}</span>
                  <Bars />
                </>
              ) : next ? (
                <>
                  <LogoGlyph className="h-6 w-6" />
                  <span className="text-white/70">{episodeLabel(next.episode)}</span>
                  <span className="tabular-nums text-flame-c">{compactCountdown(startOf(next).getTime(), now)}</span>
                  <ChevronDown size={14} className="text-white/50" />
                </>
              ) : (
                <>
                  <LogoGlyph className="h-6 w-6" />
                  <span className="max-w-[60vw] truncate text-white/80">{loading ? "Loading sessions…" : settings.announcement}</span>
                </>
              )}
            </motion.button>
          )}

          {mode === "expanded" && focus && (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, filter: "blur(8px)", y: -6 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(8px)", y: -6 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="p-3"
            >
              <div className="flex items-start gap-3">
                <img src={posterFor(focus)} alt="" className="aspect-video w-28 shrink-0 rounded-2xl object-cover ring-1 ring-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                    {live ? (
                      <>
                        <span className="live-dot h-2 w-2 rounded-full bg-[#FF453A]" /> Live now
                      </>
                    ) : (
                      <>Next up · {focus.track}</>
                    )}
                  </div>
                  <div className="mt-1 font-display text-lg leading-none text-flame">{episodeLabel(focus.episode)}</div>
                  <div className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{focus.title}</div>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                  <X size={15} />
                </button>
              </div>

              {!live && (
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {(() => {
                    const c = countdownParts(startOf(focus).getTime(), now);
                    return (
                      [
                        [c.d, "days"],
                        [c.h, "hrs"],
                        [c.m, "min"],
                        [c.s, "sec"],
                      ] as const
                    ).map(([v, l]) => (
                      <div key={l} className="rounded-2xl bg-white/[0.07] py-2 text-center">
                        <motion.div key={v} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-xl not-italic tabular-nums text-flame-c">
                          {String(v).padStart(2, "0")}
                        </motion.div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">{l}</div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              <div className="mt-2 px-1 text-xs text-white/60">
                {dateLabel(focus)} · {timeRange(focus)} · {venueOf(focus)}
              </div>

              <div className="mt-3 flex gap-2">
                {live ? (
                  <a href={joinHref} target="_blank" rel="noopener" className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#FF453A] py-2.5 text-sm font-bold">
                    <Radio size={16} /> {isOnline(live!) ? "Join live" : "Happening now"}
                  </a>
                ) : (
                  <a href={gcalUrl(focus)} target="_blank" rel="noopener" className="flex flex-1 items-center justify-center gap-2 rounded-full bg-flame py-2.5 text-sm font-bold text-ink">
                    <CalendarPlus size={16} /> Add to calendar
                  </a>
                )}
                <button
                  onClick={() => {
                    setOpen(false);
                    go(`/sessions/${focus.id}`);
                  }}
                  className="flex-1 rounded-full bg-white/10 py-2.5 text-sm font-bold hover:bg-white/20"
                >
                  Details
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

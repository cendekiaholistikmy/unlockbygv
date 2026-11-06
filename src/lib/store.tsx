import * as React from "react";
import { getPublic } from "./api";
import { effectiveStatus, startOf } from "./format";
import type { PublicData, Session, SessionStatus, Settings } from "./types";
import { SEED } from "@/data/seed";

type Store = {
  data: PublicData;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  /** Re-renders every 30 s so Live / Recorded flips on time. */
  now: number;
  statusOf: (s: Session) => SessionStatus;
  live: Session | undefined;
  next: Session | undefined;
  settings: Settings;
};

const Ctx = React.createContext<Store | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<PublicData>({ sessions: [], settings: SEED.settings });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [now, setNow] = React.useState(Date.now());

  const refresh = React.useCallback(async () => {
    try {
      setError("");
      const d = await getPublic();
      d.sessions.sort((a, b) => a.episode - b.episode);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const value = React.useMemo<Store>(() => {
    const settings = data.settings;
    const statusOf = (s: Session) => effectiveStatus(s, settings, now);
    const visible = data.sessions.filter((s) => s.status !== "Draft");
    let live = visible.find((s) => statusOf(s) === "Live");
    if (!live && settings.liveOverride === "on") live = visible.find((s) => statusOf(s) === "Upcoming");
    const next = visible
      .filter((s) => statusOf(s) === "Upcoming")
      .sort((a, b) => startOf(a).getTime() - startOf(b).getTime())[0];
    return { data, loading, error, refresh, now, statusOf, live, next, settings };
  }, [data, loading, error, refresh, now]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useData must be used inside DataProvider");
  return v;
}

/* ── tiny hash router (works on GitHub Pages without 404 tricks) ── */

export function useRoute() {
  const get = () => (window.location.hash.replace(/^#/, "") || "/").split("?")[0];
  const [route, setRoute] = React.useState(get);
  React.useEffect(() => {
    const on = () => setRoute(get());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function go(path: string) {
  if (window.location.hash !== `#${path}`) window.location.hash = path;
}

/** Ticks every second while mounted, for countdowns. */
export function useNow(ms = 1000) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

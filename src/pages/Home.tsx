import * as React from "react";
import { motion, useInView } from "motion/react";
import { ArrowRight, CalendarPlus, Mic, Radio, Sparkles } from "lucide-react";
import { TiltedGridHero } from "@/components/ui/tilted-grid-hero";
import { ButtonLink } from "@/components/ui/button";
import { Reveal, Eyebrow, Heading } from "@/components/Reveal";
import { SessionCard } from "@/components/SessionCard";
import { useData, useNow } from "@/lib/store";
import { bandImages, posterFor } from "@/lib/poster";
import { countdownParts, dateLabel, episodeLabel, gcalUrl, startOf, timeLabel, TRACK_COPY } from "@/lib/format";
import { TRACKS } from "@/lib/types";

const BASE = import.meta.env.BASE_URL;

export default function Home() {
  const { data, statusOf, live, next, settings } = useData();
  const sessions = data.sessions.filter((s) => s.status !== "Draft");
  const images = React.useMemo(() => bandImages(sessions), [sessions]);
  const spotlight = live ?? next;
  const library = [...sessions]
    .filter((s) => statusOf(s) !== "Cancelled")
    .sort((a, b) => {
      const order = { Live: 0, Upcoming: 1, Recorded: 2, Draft: 3, Cancelled: 4 } as const;
      return order[statusOf(a)] - order[statusOf(b)] || startOf(a).getTime() - startOf(b).getTime();
    });

  return (
    <main>
      {/* ── HERO: the curved band of sessions ── */}
      <TiltedGridHero
        images={images}
        speed={3.6}
        tileHeight={24}
        axis={52}
        curve={78}
        fade={10}
        className="h-[100svh] min-h-[660px] w-full bg-ink"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_35%,rgba(11,13,20,0.75)_100%)]" />
        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-center justify-between px-5 pb-10 pt-24 text-center text-white sm:pt-24">
          <motion.img
            src={`${BASE}brand/unlock-logo-reverse.png`}
            alt="UNLOCK. Gen-Z, Level Up! by GengVolunteers"
            className="w-[min(560px,86vw)] drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="flex flex-col items-center gap-5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="font-display text-[clamp(28px,4.2vw,54px)] leading-[0.98]">
              One hour. One conversation. <span className="text-flame">Something unlocked.</span>
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-[17px]">
              One expert, one night every weekend at 9 PM, live in GV Familia. Real talk on careers, leadership, tech and life.
            </p>
            <div className="pointer-events-auto flex flex-wrap justify-center gap-3">
              <ButtonLink href={spotlight ? `#/sessions/${spotlight.id}` : "#/sessions"} size="lg">
                {live ? (
                  <>
                    <Radio size={18} /> Join {episodeLabel(live.episode)} live
                  </>
                ) : (
                  <>
                    See the next session <ArrowRight size={18} />
                  </>
                )}
              </ButtonLink>
              <ButtonLink href="#/speak" size="lg" variant="outline-light">
                <Mic size={18} /> Share at UNLOCK
              </ButtonLink>
            </div>
          </motion.div>
        </div>
      </TiltedGridHero>

      {/* ── MARQUEE ── */}
      <div aria-hidden className="overflow-hidden border-y-2 border-ink bg-flame py-4 text-ink">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap font-display text-2xl">
          {Array.from({ length: 2 }).map((_, k) => (
            <React.Fragment key={k}>
              {["UNLOCK / CAREER", "UNLOCK / LEAD", "UNLOCK / TECH", "UNLOCK / LIFE", "JUMAAT · SABTU · AHAD · 9 PM", "GEN-Z, LEVEL UP!"].map((t) => (
                <span key={t + k} className="flex items-center gap-10">
                  {t} <Sparkles size={22} />
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── SPOTLIGHT ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        {spotlight ? <Spotlight /> : (
          <Reveal className="rounded-3xl border-2 border-ink bg-white p-10 text-center shadow-hard">
            <Eyebrow>NEXT SESSION</Eyebrow>
            <Heading className="mt-3">Announced soon.</Heading>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">Join GV Familia so you hear first when the next speaker drops.</p>
            <ButtonLink href={settings.telegramUrl} target="_blank" rel="noopener" className="mt-6">Join GV Familia</ButtonLink>
          </Reveal>
        )}
      </section>

      {/* ── LIBRARY RAIL ── */}
      {library.length > 0 && (
        <section className="border-y-2 border-ink bg-white py-20 sm:py-24">
          <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-5 px-4 sm:px-6">
            <Reveal>
              <Eyebrow>THE LINEUP</Eyebrow>
              <Heading className="mt-3">Live, upcoming and recorded.</Heading>
            </Reveal>
            <ButtonLink href="#/sessions" variant="outline">
              All sessions <ArrowRight size={18} />
            </ButtonLink>
          </div>
          <div className="scrollbar-none mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-6 sm:px-6 lg:px-[max(24px,calc((100vw-80rem)/2+24px))]">
            {library.map((s, i) => (
              <div key={s.id} className="w-[min(360px,82vw)] shrink-0 snap-start">
                <SessionCard s={s} status={statusOf(s)} index={i} />
              </div>
            ))}
          </div>
        </section>
      )}

      <FormatSection />
      <TracksSection />
      <SlotsSection />
      <ShareBand />
      <Faq />
    </main>
  );
}

function Spotlight() {
  const { live, next, settings } = useData();
  const s = (live ?? next)!;
  const now = useNow();
  const c = countdownParts(startOf(s).getTime(), now);
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <Reveal>
        <motion.a
          href={`#/sessions/${s.id}`}
          whileHover={{ rotate: -1.2, scale: 1.01 }}
          className="relative block overflow-hidden rounded-[28px] border-2 border-ink shadow-hard-flame"
        >
          <img src={posterFor(s)} alt={`${episodeLabel(s.episode)} poster`} className="aspect-video w-full object-cover" />
          {live && (
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[#FF3B30] px-3 py-1.5 text-xs font-extrabold tracking-[0.14em] text-white">
              <span className="live-dot h-2 w-2 rounded-full bg-white" /> LIVE NOW
            </span>
          )}
        </motion.a>
      </Reveal>
      <Reveal delay={0.1} className="flex flex-col gap-5">
        <Eyebrow>{live ? "HAPPENING NOW" : "NEXT UP"} · UNLOCK / {s.track}</Eyebrow>
        <div className="font-display text-[clamp(44px,6vw,80px)] leading-[0.9] text-flame">{episodeLabel(s.episode)}</div>
        <h2 className="text-[clamp(22px,2.4vw,32px)] font-extrabold leading-tight">{s.title}</h2>
        <p className="font-bold">
          with {s.speaker}
          <span className="font-medium text-muted-foreground">{s.speakerTitle ? `, ${s.speakerTitle}` : ""}</span>
        </p>
        <div className="font-bold">
          {dateLabel(s)} · {timeLabel(s)} <span className="font-medium text-muted-foreground">· GV Familia (Telegram)</span>
        </div>
        {!live && (
          <div className="grid max-w-md grid-cols-4 gap-2">
            {(
              [
                [c.d, "DAYS"],
                [c.h, "HRS"],
                [c.m, "MIN"],
                [c.s, "SEC"],
              ] as const
            ).map(([v, l]) => (
              <div key={l} className="rounded-2xl border-2 border-ink bg-ink py-3 text-center text-white">
                <motion.div key={v} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-3xl not-italic tabular-nums text-flame-c">
                  {String(v).padStart(2, "0")}
                </motion.div>
                <div className="text-[10px] font-bold tracking-[0.14em] text-white/60">{l}</div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3 pt-1">
          {live ? (
            <ButtonLink href={s.liveUrl || settings.telegramUrl} target="_blank" rel="noopener" variant="ink" className="border-[#FF3B30] bg-[#FF3B30]">
              <Radio size={18} /> Join live
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href={settings.registerUrl || gcalUrl(s)} target="_blank" rel="noopener">
                {settings.registerUrl ? "Register" : (<><CalendarPlus size={18} /> Add to calendar</>)}
              </ButtonLink>
              {settings.registerUrl && (
                <ButtonLink href={gcalUrl(s)} target="_blank" rel="noopener" variant="outline">
                  <CalendarPlus size={18} /> Add to calendar
                </ButtonLink>
              )}
            </>
          )}
          <ButtonLink href={`#/sessions/${s.id}`} variant="outline">
            Details
          </ButtonLink>
        </div>
      </Reveal>
    </div>
  );
}

const STEPS = [
  { key: "OPEN", min: "00 to 05", grow: 5, text: "Welcome in. Meet tonight's speaker and why this matters now.", cls: "bg-white" },
  { key: "UNLOCK", min: "05 to 40", grow: 35, text: "The main conversation. Real stories, real mistakes, real lessons.", cls: "bg-ink text-white" },
  { key: "ASK", min: "40 to 55", grow: 15, text: "Your turn. Drop questions live and get straight answers.", cls: "bg-white" },
  { key: "ACT", min: "55 to 60", grow: 5, text: "One practical action for the week, so it keeps working after the call.", cls: "bg-flame-c" },
];

function FormatSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  return (
    <section id="format" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <Eyebrow>THE FORMAT</Eyebrow>
        <Heading className="mt-3">60 minutes. One expert. Three takeaways.</Heading>
        <div className="mt-3 font-brush text-[clamp(22px,2.4vw,32px)] text-flame-a">Open → Unlock → Ask → Act</div>
      </Reveal>
      <div ref={ref} className="mt-10 flex h-16 overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-hard">
        {STEPS.map((st, i) => (
          <motion.div
            key={st.key}
            style={{ flexGrow: st.grow, flexBasis: 0 }}
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.15 + i * 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`flex min-w-[48px] origin-left items-center justify-center border-l-2 border-ink text-xs font-extrabold tracking-[0.1em] first:border-l-0 sm:text-sm ${
              st.key === "UNLOCK" ? "bg-flame text-ink" : st.key === "OPEN" ? "bg-ink text-white" : st.key === "ACT" ? "bg-flame-c" : "bg-white"
            }`}
          >
            {st.key}
            {st.key === "UNLOCK" && <span className="ml-1 hidden sm:inline">· 35 MIN</span>}
          </motion.div>
        ))}
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((st, i) => (
          <Reveal key={st.key} delay={i * 0.08}>
            <div className={`flex h-full flex-col gap-3 rounded-3xl border-2 border-ink p-6 ${st.cls} ${st.key === "UNLOCK" ? "shadow-hard-flame" : ""}`}>
              <div className={`text-xs font-extrabold tracking-[0.14em] ${st.key === "UNLOCK" ? "text-white/60" : "text-muted-foreground"}`}>MIN {st.min}</div>
              <div className={`font-display text-4xl leading-none ${st.key === "UNLOCK" ? "text-flame" : ""}`}>{st.key}</div>
              <p className={`text-[15px] leading-relaxed ${st.key === "UNLOCK" ? "text-white/80" : "text-muted-foreground"}`}>{st.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function TracksSection() {
  const head: Record<string, string> = { CAREER: "bg-flame", LEAD: "bg-ink text-white", TECH: "bg-flame-b", LIFE: "bg-flame-c" };
  return (
    <section id="tracks" className="border-y-2 border-ink bg-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <Eyebrow>FOUR TRACKS</Eyebrow>
            <Heading className="mt-3">Pick your unlock.</Heading>
          </div>
          <p className="max-w-md text-justify leading-relaxed text-muted-foreground">One track a weekend, rotating every month. Miss one? It comes round again with a new speaker.</p>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRACKS.map((t, i) => (
            <Reveal key={t} delay={i * 0.08}>
              <motion.div whileHover={{ y: -6, rotate: i % 2 ? 1 : -1 }} className="flex h-full flex-col overflow-hidden rounded-3xl border-2 border-ink bg-white shadow-hard">
                <div className={`border-b-2 border-ink px-6 py-5 ${head[t]}`}>
                  <div className="text-xs font-extrabold tracking-[0.16em] opacity-80">WEEK {i + 1} · UNLOCK /</div>
                  <div className="font-display text-4xl leading-tight">{t}</div>
                </div>
                <div className="flex flex-col gap-3 p-6">
                  <div className="text-xl font-extrabold">{TRACK_COPY[t].line}</div>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">{TRACK_COPY[t].topics}</p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function SlotsSection() {
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2">
        <Reveal>
          <Eyebrow light>WEEKEND SLOTS</Eyebrow>
          <Heading className="mt-3">One night, every weekend.</Heading>
          <p className="mt-5 max-w-lg text-justify leading-relaxed text-white/70">
            Each session lands on Jumaat, Sabtu or Ahad at 9 PM. The night is announced in GV Familia with every session, and the button on each
            session adds it straight to your Google Calendar.
          </p>
        </Reveal>
        <div className="flex flex-col gap-4">
          {["JUMAAT", "SABTU", "AHAD"].map((d, i) => (
            <Reveal key={d} delay={i * 0.1}>
              <motion.div
                whileHover={{ x: 10 }}
                className="flex items-center justify-between rounded-3xl border-2 border-white/15 bg-ink-2 px-6 py-5"
              >
                <span className="font-display text-[clamp(32px,4vw,52px)] leading-none">{d}</span>
                <span className="font-display text-2xl not-italic text-flame">9 PM</span>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShareBand() {
  return (
    <section className="relative overflow-hidden border-y-2 border-ink bg-flame">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <div className="text-[13px] font-extrabold tracking-[0.18em]">CALLING SPEAKERS</div>
          <h2 className="mt-3 font-display text-[clamp(34px,5vw,72px)] leading-[0.95]">Got something worth unlocking?</h2>
          <p className="mt-5 max-w-xl text-justify text-[17px] leading-relaxed text-ink/80">
            Professionals, founders, scholars, creators and community builders: offer a session, or tell us who you want to hear from. Add a
            photo and a few lines, and the team gets back to you.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <ButtonLink href="#/speak?type=offer" variant="ink" size="lg">
            <Mic size={18} /> Offer to share
          </ButtonLink>
          <ButtonLink href="#/speak?type=suggest" variant="outline" size="lg">
            Suggest a speaker or topic
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}

const FAQS: [string, string][] = [
  ["Who is UNLOCK for?", "Young Malaysians who want to grow: students, SPM leavers, fresh graduates and young volunteers. If you are in GV Familia, you are already in."],
  ["Where does it happen?", "Live inside GV Familia, our Telegram community. Join the group and the session link lands there before we go live."],
  ["Which night is it?", "One night every weekend, Jumaat, Sabtu or Ahad, always at 9 PM. Each session page shows the exact night and has an Add to Google Calendar button."],
  ["Can I watch it later?", "Recorded sessions appear on the Sessions page with the video, photos and the three things we unlocked."],
  ["How do I become a speaker?", "Use Share at UNLOCK. Tell us your topic, add a photo, and pick the weekend night that suits you. The team will contact you."],
];

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <Eyebrow>FAQ</Eyebrow>
        <Heading className="mt-3">Questions? Unlocked.</Heading>
      </Reveal>
      <div className="mt-10 flex flex-col gap-3">
        {FAQS.map(([q, a], i) => (
          <Reveal key={q} delay={i * 0.05}>
            <details className="group rounded-2xl border-2 border-ink bg-white px-6 open:shadow-hard">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-extrabold [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-3xl font-normal leading-none transition group-open:rotate-45">+</span>
              </summary>
              <p className="pb-5 text-justify leading-relaxed text-muted-foreground">{a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, ChevronLeft, ChevronRight, Link2, Radio, X } from "lucide-react";
import type { Session } from "@/lib/types";
import { useData, useNow } from "@/lib/store";
import { countdownParts, dateLabel, embedUrl, episodeLabel, gcalUrl, imageUrl, startOf, timeLabel, TRACK_COPY } from "@/lib/format";
import { posterFor } from "@/lib/poster";
import { StatusBadge } from "./SessionCard";
import { ButtonLink } from "./ui/button";
import { useIsland } from "./DynamicIsland";

export function SessionModal({ session, onClose }: { session: Session; onClose: () => void }) {
  const { statusOf, settings } = useData();
  const { notify } = useIsland();
  const now = useNow();
  const status = statusOf(session);
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const embed = embedUrl(session.recordingUrl);
  const c = countdownParts(startOf(session).getTime(), now);

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") lightbox === null ? onClose() : setLightbox(null);
      if (lightbox !== null && e.key === "ArrowRight") setLightbox((i) => ((i ?? 0) + 1) % session.gallery.length);
      if (lightbox !== null && e.key === "ArrowLeft") setLightbox((i) => ((i ?? 0) - 1 + session.gallery.length) % session.gallery.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, lightbox, session.gallery.length]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify("Link copied. Share it with your geng!");
    } catch {
      notify("Could not copy. Copy the address bar instead.", "error");
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.article
        role="dialog"
        aria-modal="true"
        aria-label={session.title}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 80, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[28px] border-2 border-ink bg-paper sm:rounded-[28px]"
      >
        <div className="relative aspect-video bg-ink">
          {status === "Recorded" && embed ? (
            <iframe
              src={embed}
              title={`${episodeLabel(session.episode)} recording`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <img src={posterFor(session)} alt="" className="h-full w-full object-cover" />
          )}
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white hover:bg-black">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={status} />
            <span className="text-xs font-extrabold tracking-[0.16em] text-flame-a">UNLOCK / {session.track}</span>
          </div>
          <div>
            <div className="font-display text-4xl leading-none text-flame sm:text-5xl">{episodeLabel(session.episode)}</div>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">{session.title}</h2>
            {session.summary && <p className="mt-3 text-justify text-[16px] leading-relaxed text-muted-foreground">{session.summary}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-ink bg-white p-4">
            {session.speakerPhoto ? (
              <img src={imageUrl(session.speakerPhoto, 400)} alt={session.speaker} className="h-14 w-14 rounded-full border-2 border-ink object-cover" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-full bg-flame font-display text-xl text-ink">{session.speaker.replace(/[^A-Za-z]/g, "").slice(0, 1) || "U"}</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-extrabold">{session.speaker}</div>
              <div className="text-sm text-muted-foreground">{session.speakerTitle}</div>
            </div>
            <div className="text-right text-sm font-bold">
              <div>{dateLabel(session)}</div>
              <div className="text-muted-foreground">{timeLabel(session)} · GV Familia (Telegram)</div>
            </div>
          </div>

          {status === "Upcoming" && (
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  [c.d, "Days"],
                  [c.h, "Hours"],
                  [c.m, "Min"],
                  [c.s, "Sec"],
                ] as const
              ).map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-ink py-3 text-center text-white">
                  <div className="font-display text-3xl not-italic tabular-nums text-flame-c">{String(v).padStart(2, "0")}</div>
                  <div className="text-[11px] font-bold tracking-[0.14em] text-white/60">{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {status === "Live" && (
              <ButtonLink href={session.liveUrl || settings.telegramUrl} target="_blank" rel="noopener" variant="ink" className="bg-[#FF3B30] border-[#FF3B30]">
                <Radio size={18} /> Join live now
              </ButtonLink>
            )}
            {status === "Upcoming" && (
              <>
                {settings.registerUrl && (
                  <ButtonLink href={settings.registerUrl} target="_blank" rel="noopener">
                    Register
                  </ButtonLink>
                )}
                <ButtonLink href={gcalUrl(session)} target="_blank" rel="noopener" variant={settings.registerUrl ? "outline" : "flame"}>
                  <CalendarPlus size={18} /> Add to Google Calendar
                </ButtonLink>
              </>
            )}
            {status === "Recorded" && !embed && session.recordingUrl && (
              <ButtonLink href={session.recordingUrl} target="_blank" rel="noopener">
                Watch the recording
              </ButtonLink>
            )}
            {status === "Recorded" && !session.recordingUrl && (
              <span className="rounded-2xl border-2 border-dashed border-ink/40 px-4 py-3 text-sm font-bold text-muted-foreground">Recording coming soon</span>
            )}
            <button onClick={copy} className="inline-flex h-12 items-center gap-2 rounded-2xl border-2 border-ink bg-white px-4 font-extrabold hover:bg-paper">
              <Link2 size={18} /> Copy link
            </button>
          </div>

          {session.takeaways.filter(Boolean).length > 0 && (
            <div>
              <div className="font-display text-2xl">What we unlocked</div>
              <ol className="mt-3 flex flex-col gap-2">
                {session.takeaways.filter(Boolean).map((t, i) => (
                  <li key={i} className="flex gap-3 rounded-2xl bg-white p-4 text-[15px] leading-relaxed">
                    <span className="font-display text-xl leading-none text-flame">{String(i + 1).padStart(2, "0")}</span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {session.gallery.length > 0 && (
            <div>
              <div className="font-display text-2xl">Photos</div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {session.gallery.map((g, i) => (
                  <motion.button
                    key={g + i}
                    onClick={() => setLightbox(i)}
                    whileHover={{ scale: 1.03 }}
                    className="aspect-[4/3] overflow-hidden rounded-2xl border-2 border-ink bg-ink"
                    aria-label={`Open photo ${i + 1}`}
                  >
                    <img src={imageUrl(g, 800)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">{TRACK_COPY[session.track]?.topics}</p>
        </div>
      </motion.article>

      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
          >
            <motion.img
              key={lightbox}
              src={imageUrl(session.gallery[lightbox], 2000)}
              alt=""
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-h-[86vh] max-w-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {session.gallery.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((lightbox - 1 + session.gallery.length) % session.gallery.length);
                  }}
                  className="absolute left-3 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white"
                  aria-label="Previous photo"
                >
                  <ChevronLeft />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((lightbox + 1) % session.gallery.length);
                  }}
                  className="absolute right-3 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white"
                  aria-label="Next photo"
                >
                  <ChevronRight />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

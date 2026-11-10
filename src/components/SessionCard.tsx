import * as React from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Images, MapPin, PlayCircle } from "lucide-react";
import type { Session, SessionStatus } from "@/lib/types";
import { dateLabel, episodeLabel, isOnline, timeLabel, venueOf } from "@/lib/format";
import { posterFor } from "@/lib/poster";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: SessionStatus; className?: string }) {
  const map: Record<SessionStatus, string> = {
    Live: "bg-[#FF3B30] text-white",
    Upcoming: "bg-flame-c text-ink",
    Recorded: "bg-ink text-white",
    Draft: "bg-white text-ink border border-ink",
    Cancelled: "bg-[#EDEDED] text-[#555]",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em]", map[status], className)}>
      {status === "Live" && <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />}
      {status === "Recorded" ? "Recording" : status}
    </span>
  );
}

/** A session tile that tilts toward the pointer. */
export function SessionCard({ s, status, index = 0 }: { s: Session; status: SessionStatus; index?: number }) {
  const ref = React.useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -8, y: ((e.clientX - r.left) / r.width - 0.5) * 10 });
  };

  return (
    <motion.a
      ref={ref}
      layout
      href={`#/sessions/${s.id}`}
      initial={{ opacity: 0, y: 40, rotateX: -12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.92, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: Math.min(index, 8) * 0.06 }}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      style={{ transformPerspective: 900, rotateX: tilt.x, rotateY: tilt.y }}
      className="group flex flex-col overflow-hidden rounded-3xl border-2 border-ink bg-white shadow-hard transition-shadow hover:shadow-[10px_10px_0_var(--flame-b)]"
    >
      <div className="relative aspect-video overflow-hidden border-b-2 border-ink bg-ink">
        <img src={posterFor(s)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]" />
        <div className="absolute left-3 top-3 flex gap-2">
          <StatusBadge status={status} />
        </div>
        {status === "Recorded" && s.recordingUrl && (
          <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
            <PlayCircle size={56} className="text-white drop-shadow-lg" />
          </span>
        )}
        {s.gallery.length > 0 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white">
            <Images size={13} /> {s.gallery.length}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-xl leading-none text-flame">{episodeLabel(s.episode)}</span>
          <span className="text-[11px] font-extrabold tracking-[0.16em] text-flame-a">{s.track}</span>
        </div>
        <h3 className="text-lg font-extrabold leading-snug">{s.title}</h3>
        <p className="text-sm text-muted-foreground">
          {s.speaker}
          {s.speakerTitle ? `, ${s.speakerTitle}` : ""}
        </p>
        {!isOnline(s) && (
          <p className="flex items-center gap-1.5 text-sm font-bold text-flame-a">
            <MapPin size={14} /> {venueOf(s)}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3 text-sm font-bold">
          <span>
            {dateLabel(s, false)} · {timeLabel(s)}
          </span>
          <ArrowUpRight size={20} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
    </motion.a>
  );
}

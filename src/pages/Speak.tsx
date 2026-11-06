import * as React from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Check, ImagePlus, Loader2, Mic, Sparkles, Trash2, Users } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { useIsland } from "@/components/DynamicIsland";
import { compressImage } from "@/lib/image";
import { submitGuest, DEMO } from "@/lib/api";
import { useData } from "@/lib/store";
import { GUEST_TYPES, TRACKS, type GuestType, type Track } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 4;
const SLOTS = ["Jumaat", "Sabtu", "Ahad", "Any weekend night"];

const TYPE_META: Record<GuestType, { icon: React.ReactNode; blurb: string }> = {
  "Offer to share": { icon: <Mic size={18} />, blurb: "You want to be the expert on an UNLOCK night." },
  "Suggest a speaker": { icon: <Users size={18} />, blurb: "You know someone we should invite." },
  "Suggest a topic": { icon: <Sparkles size={18} />, blurb: "You want UNLOCK to cover something." },
};

type Form = {
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
  consent: boolean;
  website: string; // honeypot
};

function initialType(): GuestType {
  const q = window.location.hash.split("?")[1] ?? "";
  return /type=suggest/.test(q) ? "Suggest a speaker" : "Offer to share";
}

export default function Speak() {
  const { notify } = useIsland();
  const { settings } = useData();
  const [f, setF] = React.useState<Form>({
    type: initialType(),
    name: "",
    email: "",
    phone: "",
    organisation: "",
    role: "",
    topic: "",
    track: "",
    abstract: "",
    preferredSlot: "Any weekend night",
    preferredDate: "",
    links: "",
    consent: false,
    website: "",
  });
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [busyPhotos, setBusyPhotos] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const offer = f.type === "Offer to share";
  const speakerSuggest = f.type === "Suggest a speaker";

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((x) => x.type.startsWith("image/"));
    if (!list.length) return notify("Please choose image files (JPG or PNG).", "error");
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return notify(`Up to ${MAX_PHOTOS} photos only.`, "error");
    setBusyPhotos(true);
    try {
      const out: string[] = [];
      for (const file of list.slice(0, room)) out.push(await compressImage(file, DEMO ? 900 : 1600, DEMO ? 0.72 : 0.82));
      setPhotos((p) => [...p, ...out]);
      if (list.length > room) notify(`Only the first ${room} photo${room > 1 ? "s were" : " was"} added.`, "info");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not read that photo.", "error");
    } finally {
      setBusyPhotos(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Please tell us your name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Please enter a valid email.";
    if (!f.topic.trim()) e.topic = offer ? "What would you share?" : speakerSuggest ? "Who should we invite?" : "What topic should we cover?";
    if (offer && f.abstract.trim().length < 30) e.abstract = "A few more lines please (at least 30 characters).";
    if (offer && photos.length === 0) e.photos = "Add at least one photo of yourself for the poster.";
    if (!f.consent) e.consent = "Please agree so we can contact you.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (f.website) return; // bot
    if (!validate()) {
      notify("A few fields need a look.", "error");
      return;
    }
    setSending(true);
    try {
      await submitGuest({
        type: f.type,
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        organisation: f.organisation.trim(),
        role: f.role.trim(),
        topic: f.topic.trim(),
        track: f.track,
        abstract: f.abstract.trim(),
        preferredSlot: offer ? f.preferredSlot : "",
        preferredDate: offer ? f.preferredDate : "",
        links: f.links.trim(),
        photos,
        consent: f.consent,
      });
      notify(offer ? "Request sent. Thank you for offering to share!" : "Thanks! Your suggestion is in.");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not send. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <main className="min-h-[100svh] bg-ink px-4 pb-20 pt-32 text-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            className="grid h-24 w-24 place-items-center rounded-full bg-flame text-ink"
          >
            <Check size={48} strokeWidth={3} />
          </motion.div>
          <h1 className="font-display text-[clamp(36px,6vw,64px)] leading-[0.95]">Unlocked. We got it.</h1>
          <p className="text-justify text-[17px] leading-relaxed text-white/75">
            {offer
              ? "The UNLOCK team will review your request and reach out by email or phone to lock a weekend night. Keep an eye on your inbox."
              : "Thanks for the idea. The team reviews every suggestion when planning the next month of sessions."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="#/sessions">See the sessions</ButtonLink>
            <ButtonLink href={settings.telegramUrl} target="_blank" rel="noopener" variant="outline-light">
              Join GV Familia
            </ButtonLink>
          </div>
          <button onClick={() => { setDone(false); setPhotos([]); setF((p) => ({ ...p, topic: "", abstract: "", links: "" })); }} className="text-sm font-bold text-white/60 underline underline-offset-4 hover:text-white">
            Send another
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main>
      <section className="relative overflow-hidden bg-ink px-4 pb-16 pt-28 text-white sm:px-6 sm:pt-32">
        <div className="grain pointer-events-none absolute inset-0 opacity-60" />
        <motion.div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-flame opacity-30 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 8, repeat: Infinity }} />
        <div className="relative mx-auto max-w-4xl">
          <div className="text-[13px] font-extrabold tracking-[0.18em] text-flame-b">SHARE AT UNLOCK</div>
          <h1 className="mt-3 font-display text-[clamp(40px,6.5vw,88px)] leading-[0.9]">
            Be the one who <span className="text-flame">unlocks it.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-justify text-[17px] leading-relaxed text-white/75">
            Offer to give a sharing, or point us to someone (or something) GV Familia should hear about. Sessions run one night every weekend,
            Jumaat, Sabtu or Ahad, at 9 PM, live on Telegram.
          </p>
        </div>
      </section>

      <form onSubmit={submit} noValidate className="mx-auto -mt-8 max-w-4xl px-4 pb-24 sm:px-6">
        <div className="relative rounded-[28px] border-2 border-ink bg-white p-5 shadow-hard sm:p-8">
          <LayoutGroup id="gtype">
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="What would you like to do?">
              {GUEST_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  role="radio"
                  aria-checked={f.type === t}
                  onClick={() => set("type", t)}
                  className={cn("relative rounded-2xl border-2 border-ink p-4 text-left transition", f.type === t ? "text-ink" : "bg-paper/60 hover:bg-paper")}
                >
                  {f.type === t && <motion.span layoutId="type-bg" className="absolute inset-0 rounded-[14px] bg-flame" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <span className="relative flex items-center gap-2 font-extrabold">
                    {TYPE_META[t].icon} {t}
                  </span>
                  <span className="relative mt-1 block text-[13px] leading-snug opacity-80">{TYPE_META[t].blurb}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Field label="Your name" required htmlFor="name">
              <Input id="name" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
              <Err msg={errors.name} />
            </Field>
            <Field label="Email" required htmlFor="email">
              <Input id="email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
              <Err msg={errors.email} />
            </Field>
            <Field label="Phone or WhatsApp" hint="Only the UNLOCK team sees this." htmlFor="phone">
              <Input id="phone" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="+60 1X XXX XXXX" />
            </Field>
            <Field label={speakerSuggest ? "Speaker's organisation" : "Organisation or campus"} htmlFor="org">
              <Input id="org" value={f.organisation} onChange={(e) => set("organisation", e.target.value)} />
            </Field>

            <AnimatePresence initial={false}>
              {f.type !== "Suggest a topic" && (
                <motion.div key="role" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="sm:col-span-2">
                  <Field label={speakerSuggest ? "Speaker's role and how you know them" : "Your role"} htmlFor="role">
                    <Input id="role" value={f.role} onChange={(e) => set("role", e.target.value)} placeholder={speakerSuggest ? "e.g. Data scientist, my senior from INTEC" : "e.g. Software engineer, final year student, founder"} />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <Field
              className="sm:col-span-2"
              label={offer ? "Session title you'd share" : speakerSuggest ? "Who should we invite?" : "Topic you want covered"}
              required
              htmlFor="topic"
            >
              <Input id="topic" value={f.topic} onChange={(e) => set("topic", e.target.value)} aria-invalid={!!errors.topic} placeholder={offer ? "e.g. How I got my first internship without connections" : speakerSuggest ? "Their name and what they could talk about" : "e.g. Managing money in your first job"} />
              <Err msg={errors.topic} />
            </Field>

            <Field label="Track" htmlFor="track">
              <Select id="track" value={f.track} onChange={(e) => set("track", e.target.value as Track | "")}>
                <option value="">Not sure</option>
                {TRACKS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Links" hint="LinkedIn, Instagram, website or a past talk." htmlFor="links">
              <Input id="links" value={f.links} onChange={(e) => set("links", e.target.value)} placeholder="https://" />
            </Field>

            <Field className="sm:col-span-2" label={offer ? "What will GV Familia walk away with?" : "Why this would be great"} required={offer} htmlFor="abstract" hint={offer ? "Three or four lines: your story, the main points, and the one action you'd leave them with." : undefined}>
              <Textarea id="abstract" value={f.abstract} onChange={(e) => set("abstract", e.target.value)} aria-invalid={!!errors.abstract} />
              <Err msg={errors.abstract} />
            </Field>

            <AnimatePresence initial={false}>
              {offer && (
                <motion.div key="slot" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid gap-5 sm:col-span-2 sm:grid-cols-[1.4fr_1fr]">
                  <Field label="Preferred night (9 PM)">
                    <div className="flex flex-wrap gap-2">
                      {SLOTS.map((s) => (
                        <button
                          type="button"
                          key={s}
                          onClick={() => set("preferredSlot", s)}
                          aria-pressed={f.preferredSlot === s}
                          className={cn("h-11 rounded-xl border-2 border-ink px-4 text-sm font-extrabold transition", f.preferredSlot === s ? "bg-ink text-white" : "bg-white hover:bg-paper")}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Preferred date (optional)" htmlFor="pdate">
                    <Input id="pdate" type="date" value={f.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="sm:col-span-2">
              <div className="text-sm font-extrabold">
                Photos {offer && <span className="text-flame-a">*</span>}
                <span className="ml-2 font-medium text-muted-foreground">
                  {offer ? "A clear photo of you for the poster, plus any of you speaking. Up to 4." : "Optional. Up to 4."}
                </span>
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "mt-2 grid grid-cols-2 gap-3 rounded-2xl border-2 border-dashed p-3 transition sm:grid-cols-4",
                  drag ? "border-flame-a bg-flame-c/20" : "border-ink/40",
                  errors.photos && "border-[#B42318]",
                )}
              >
                <AnimatePresence>
                  {photos.map((p, i) => (
                    <motion.div key={p.slice(-40) + i} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="group relative aspect-square overflow-hidden rounded-xl border-2 border-ink">
                      <img src={p} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                      {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-ink px-2 py-0.5 text-[10px] font-extrabold text-white">MAIN</span>}
                      <button type="button" onClick={() => setPhotos((x) => x.filter((_, k) => k !== i))} className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#B42318]" aria-label={`Remove photo ${i + 1}`}>
                        <Trash2 size={15} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {photos.length < MAX_PHOTOS && (
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl bg-paper text-sm font-bold text-muted-foreground transition hover:bg-flame-c/30">
                    {busyPhotos ? <Loader2 className="animate-spin" /> : <ImagePlus size={26} />}
                    {busyPhotos ? "Preparing…" : "Add photo"}
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
              <Err msg={errors.photos} />
            </div>

            <input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} className="hidden" aria-hidden name="website" />

            <label className="flex items-start gap-3 rounded-2xl bg-paper p-4 text-sm leading-relaxed sm:col-span-2">
              <input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#D4500F]" />
              <span>
                I agree that GengVolunteers 2.0 ({"HLSTK"}) may store these details to contact me about UNLOCK, under the Personal Data Protection Act 2010.
                My phone and email are never shown publicly. {offer && "Photos I upload may be used on the session poster and page."}
                <Err msg={errors.consent} />
              </span>
            </label>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{DEMO ? "Demo mode: this request is saved in your browser only." : "Goes straight to the UNLOCK team."}</p>
            <Button type="submit" size="lg" disabled={sending || busyPhotos}>
              {sending ? (<><Loader2 className="animate-spin" size={18} /> Sending…</>) : offer ? "Send my request" : "Send suggestion"}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}

function Err({ msg }: { msg?: string }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 block text-[13px] font-bold text-[#B42318]">
          {msg}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

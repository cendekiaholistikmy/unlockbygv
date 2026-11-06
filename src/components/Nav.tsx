import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useRoute } from "@/lib/store";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#/", label: "Home", match: (r: string) => r === "/" },
  { href: "#/sessions", label: "Sessions", match: (r: string) => r.startsWith("/sessions") },
  { href: "#/speak", label: "Share at UNLOCK", match: (r: string) => r === "/speak" },
];

export function Nav() {
  const route = useRoute();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  React.useEffect(() => setOpen(false), [route]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled || route.startsWith("/admin") ? "bg-ink/90 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="#/" aria-label="UNLOCK home" className="flex w-11 items-center sm:w-auto">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="UNLOCK" className="h-9 w-9 sm:hidden" />
            <img src={`${import.meta.env.BASE_URL}brand/unlock-wordmark-reverse.png`} alt="UNLOCK" className="hidden h-8 w-auto sm:block" />
          </a>
          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-bold text-white/75 transition hover:text-white",
                  l.match(route) && "text-white",
                )}
              >
                {l.match(route) && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-white/12" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                )}
                {l.label}
              </a>
            ))}
          </div>
          <button
            onClick={() => setOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-full text-white hover:bg-white/10 md:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex flex-col bg-ink px-6 pb-10 pt-5 text-white md:hidden"
            initial={{ clipPath: "circle(0% at calc(100% - 40px) 32px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 40px) 32px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 40px) 32px)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between">
              <img src={`${import.meta.env.BASE_URL}brand/unlock-wordmark-reverse.png`} alt="UNLOCK" className="h-7 w-auto" />
              <button onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label="Close menu">
                <X size={22} />
              </button>
            </div>
            <div className="mt-14 flex flex-col gap-2">
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.07 }}
                  className={cn("font-display text-5xl leading-tight", l.match(route) ? "text-flame" : "text-white")}
                >
                  {l.label}
                </motion.a>
              ))}
            </div>
            <div className="mt-auto font-brush text-2xl text-flame-b">Gen-Z, Level Up!</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

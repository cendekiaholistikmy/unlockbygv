import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div className={`text-[13px] font-extrabold tracking-[0.18em] ${light ? "text-flame-b" : "text-flame-a"}`}>{children}</div>
  );
}

export function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`font-display text-[clamp(32px,4.6vw,64px)] leading-[0.95] ${className}`}>{children}</h2>;
}

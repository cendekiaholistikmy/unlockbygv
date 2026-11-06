import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "flame" | "ink" | "outline" | "ghost" | "outline-light" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  flame: "bg-flame text-ink border-2 border-ink shadow-hard hover:-translate-y-0.5 hover:shadow-[8px_8px_0_var(--ink)] active:translate-y-0 active:shadow-[3px_3px_0_var(--ink)]",
  ink: "bg-ink text-white border-2 border-ink hover:bg-ink-2",
  outline: "bg-white text-ink border-2 border-ink hover:bg-paper",
  "outline-light": "bg-transparent text-white border-2 border-white/80 hover:bg-white/10",
  ghost: "bg-transparent text-current hover:bg-black/5",
  danger: "bg-white text-[#B42318] border-2 border-[#B42318] hover:bg-[#FEF3F2]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl gap-1.5",
  md: "h-12 px-5 text-[15px] rounded-2xl gap-2",
  lg: "h-14 px-7 text-base rounded-2xl gap-2.5",
};

export function buttonClass(variant: Variant = "flame", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center font-extrabold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ variant = "flame", size = "md", className, ...props }, ref) => (
  <button ref={ref} className={buttonClass(variant, size, className)} {...props} />
));
Button.displayName = "Button";

export function ButtonLink({
  variant = "flame",
  size = "md",
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size }) {
  return <a className={buttonClass(variant, size, className)} {...props} />;
}

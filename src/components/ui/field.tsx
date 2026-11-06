import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border-2 border-ink bg-white px-3.5 text-[15px] text-ink placeholder:text-[#8A8FA0] outline-none transition focus:border-flame-a focus:ring-4 focus:ring-flame-b/25";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(base, "h-12", className)} {...p} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => <textarea ref={ref} className={cn(base, "min-h-[120px] py-3 leading-relaxed", className)} {...p} />,
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...p }, ref) => (
    <select ref={ref} className={cn(base, "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%230B0D14%22 stroke-width=%223%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[right_14px_center] bg-no-repeat pr-10", className)} {...p}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Field({
  label,
  hint,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-extrabold text-ink">
        {label}
        {required && <span className="text-flame-a"> *</span>}
      </label>
      {children}
      {hint && <span className="text-[13px] leading-snug text-muted-foreground">{hint}</span>}
    </div>
  );
}

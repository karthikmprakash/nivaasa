import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

// ── Button ───────────────────────────────────────────────────────────────────
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[transform,background-color,box-shadow,color,border-color] duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white shadow-[0_8px_20px_-10px_rgba(49,85,216,0.65)] hover:bg-brand-700",
        secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-100",
        outline: "border border-line-strong bg-white text-ink hover:bg-canvas shadow-[0_1px_2px_rgba(19,26,42,0.04)]",
        ghost: "text-ink-soft hover:bg-canvas hover:text-ink",
        pink: "bg-blush-400 text-white shadow-[0_8px_20px_-10px_rgba(239,127,164,0.7)] hover:bg-blush-500",
        blush: "bg-blush-100 text-blush-600 hover:bg-blush-200 border border-blush-200",
        danger: "bg-[#d94a5a] text-white hover:bg-[#c43d4d]",
        dangerSoft: "bg-[#fdeced] text-[#c43d4d] hover:bg-[#fbdde0]",
        success: "bg-mint-600 text-white hover:bg-[#187a4f]",
        dark: "bg-ink text-white hover:bg-[#263047]",
        link: "text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline p-0 h-auto rounded-none",
      },
      size: {
        xs: "h-7 px-3 text-xs",
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-[15px]",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10 p-0",
        iconSm: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function buttonClass(variant: VariantProps<typeof buttonVariants>["variant"] = "primary", size: VariantProps<typeof buttonVariants>["size"] = "md") {
  return buttonVariants({ variant, size });
}

// ── Surfaces ─────────────────────────────────────────────────────────────────
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface", className)} {...props} />;
}

export function CardHeader({ title, description, action, icon, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon ? <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">{icon}</div> : null}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, eyebrow, description, actions, className }: { title: ReactNode; eyebrow?: string; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p> : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[30px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none", {
  variants: {
    variant: {
      neutral: "bg-[#f1f3f9] text-ink-soft",
      blue: "bg-brand-50 text-brand-700",
      pink: "bg-blush-100 text-blush-600",
      success: "bg-mint-50 text-mint-600",
      warning: "bg-amber-soft text-amber-ink",
      danger: "bg-[#fdeced] text-[#c43d4d]",
      purple: "bg-[#f2effc] text-[#6a54c8]",
      outline: "border border-line-strong bg-white text-ink-soft",
      dark: "bg-ink text-white",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export function Badge({ className, variant, children, dot }: { className?: string; variant?: BadgeVariant; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {dot ? <span className="size-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, color, size = "md", className, imageUrl }: { name: string; color?: string | null; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string; imageUrl?: string | null }) {
  const sizes = { xs: "size-6 text-[9px]", sm: "size-8 text-[11px]", md: "size-10 text-xs", lg: "size-12 text-sm", xl: "size-16 text-lg" };
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ring-2 ring-white/60", sizes[size], className)}
      style={{ backgroundColor: color ?? "#3155d8" }}
      aria-hidden="true"
    >
      {imageUrl ? <img src={imageUrl} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  );
}

export function AvatarStack({ people, max = 4 }: { people: { name: string; color?: string | null }[]; max?: number }) {
  return (
    <div className="flex -space-x-2">
      {people.slice(0, max).map((p, i) => <Avatar key={i} name={p.name} color={p.color} size="sm" />)}
      {people.length > max ? <span className="grid size-8 place-items-center rounded-full bg-[#f1f3f9] text-[10px] font-bold text-ink-soft ring-2 ring-white">+{people.length - max}</span> : null}
    </div>
  );
}

// ── Form fields ──────────────────────────────────────────────────────────────
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-[12.5px] font-semibold text-ink-soft", className)} {...props} />;
}

const fieldClass = "w-full rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-[#a1a9ba] transition-colors focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-canvas disabled:text-muted";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, "min-h-24 resize-y leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClass, "h-11 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%237b859b%22%20stroke-width%3D%221.7%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[right_0.8rem_center] bg-no-repeat pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, error, children, className, htmlFor }: { label?: string; hint?: string; error?: string; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={className}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-[#c43d4d]">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={cn("size-4 rounded border-line-strong text-brand-600 accent-[#3155d8]", className)} {...props} />;
}

// ── Layout helpers ───────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon ? <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">{icon}</div> : null}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export function Stat({ label, value, hint, tone = "neutral", icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "neutral" | "blue" | "pink" | "green" | "amber"; icon?: ReactNode }) {
  const tones = { neutral: "bg-white", blue: "bg-brand-50/60", pink: "bg-blush-50", green: "bg-mint-50/60", amber: "bg-amber-soft/60" };
  return (
    <div className={cn("rounded-2xl border border-line p-4 shadow-[0_1px_2px_rgba(19,26,42,0.03)]", tones[tone])}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        {icon ? <span className="text-brand-500">{icon}</span> : null}
      </div>
      <p className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink">{value}</p>
      {hint ? <p className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function ProgressBar({ value, tone = "blue", className }: { value: number; tone?: "blue" | "pink" | "green" | "amber"; className?: string }) {
  const tones = { blue: "bg-brand-500", pink: "bg-blush-400", green: "bg-mint-600", amber: "bg-[#d9a23a]" };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[#eef1f8]", className)}>
      <div className={cn("h-full rounded-full transition-all", tones[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-line bg-canvas px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted">{children}</kbd>;
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto fine-scroll", className)}><table className="w-full border-collapse text-left text-sm">{children}</table></div>;
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("border-b border-line px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted last:text-right", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-line/70 px-4 py-3 align-middle text-[13px] text-ink-soft last:text-right", className)}>{children}</td>;
}

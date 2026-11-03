import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { avatarForeground, cn, initials } from "@/lib/utils";

// ── Button ───────────────────────────────────────────────────────────────────
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold transition-[background-color,color,border-color] duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700",
        secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-100",
        outline: "border border-line-strong bg-white text-ink hover:bg-canvas shadow-[0_1px_2px_rgba(19,26,42,0.04)]",
        ghost: "text-ink-soft hover:bg-canvas hover:text-ink",
        pink: "bg-blush-600 text-white hover:bg-[#ae2e5b]",
        blush: "bg-blush-100 text-blush-600 hover:bg-blush-200 border border-blush-200",
        danger: "bg-[#d94a5a] text-white hover:bg-[#c43d4d]",
        dangerSoft: "bg-[#fdeced] text-[#c43d4d] hover:bg-[#fbdde0]",
        success: "bg-mint-600 text-white hover:bg-[#187a4f]",
        dark: "bg-ink text-white hover:bg-[#263047]",
        link: "text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline p-0 h-auto rounded-none",
      },
      size: {
        xs: "min-h-9 px-3 text-caption",
        sm: "min-h-10 px-4 text-body",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-base",
        icon: "size-11 p-0",
        iconSm: "size-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function buttonClass(variant: VariantProps<typeof buttonVariants>["variant"] = "primary", size: VariantProps<typeof buttonVariants>["size"] = "md") {
  return buttonVariants({ variant, size });
}

// ── Surfaces ─────────────────────────────────────────────────────────────────
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface min-w-0", className)} {...props} />;
}

export function CardHeader({ title, description, action, icon, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4 sm:px-6", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon ? <div aria-hidden="true" className="mt-1 shrink-0 text-muted [&>svg]:size-[18px]">{icon}</div> : null}
        <div className="min-w-0">
          <h2 className="text-section font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-body leading-relaxed text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="max-w-full shrink-0 overflow-x-auto">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, eyebrow, description, actions, className }: { title: ReactNode; eyebrow?: string; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <span className="sr-only">{eyebrow}</span> : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[30px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:shrink-0 [&>*]:max-w-full [&>*]:whitespace-nowrap">{actions}</div> : null}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
const badgeVariants = cva("inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-caption font-medium leading-snug", {
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
  const sizes = { xs: "size-6 text-caption", sm: "size-8 text-caption", md: "size-10 text-xs", lg: "size-12 text-sm", xl: "size-16 text-lg" };
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ring-2 ring-white/60", sizes[size], className)}
      style={{ backgroundColor: color ?? "#3155d8", color: avatarForeground(color ?? "#3155d8") }}
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
      {people.length > max ? <span className="grid size-8 place-items-center rounded-full bg-[#f1f3f9] text-caption font-bold text-ink-soft ring-2 ring-white">+{people.length - max}</span> : null}
    </div>
  );
}

// ── Form fields ──────────────────────────────────────────────────────────────
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-body font-semibold text-ink-soft", className)} {...props} />;
}

export { Field, Input, Textarea, Select } from "./field";

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={cn("size-4 rounded border-line-strong text-brand-600 accent-[#3155d8]", className)} {...props} />;
}

// ── Layout helpers ───────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon ? <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">{icon}</div> : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export function Stat({ label, value, hint, tone = "neutral", icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "neutral" | "blue" | "pink" | "green" | "amber"; icon?: ReactNode }) {
  const tones = { neutral: "bg-white", blue: "bg-brand-50/60", pink: "bg-white", green: "bg-white", amber: "bg-amber-soft/60" };
  return (
    <div className={cn("rounded-xl border border-line p-4 tabular-nums", tones[tone])}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-body font-medium text-ink-soft">{label}</p>
        {icon ? <span aria-hidden="true" className="text-muted">{icon}</span> : null}
      </div>
      <p className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink">{value}</p>
      {hint ? <p className="mt-1.5 text-caption leading-snug text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function ProgressBar({ value, tone = "blue", className, label = "Progress" }: { value: number; tone?: "blue" | "pink" | "green" | "amber"; className?: string; label?: string }) {
  const tones = { blue: "bg-brand-500", pink: "bg-blush-400", green: "bg-mint-600", amber: "bg-[#d9a23a]" };
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, value))} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[#eef1f8]", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-200", tones[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-line bg-canvas px-1.5 py-0.5 font-sans text-caption font-semibold text-muted">{children}</kbd>;
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto fine-scroll", className)}><table className="w-full border-collapse text-left text-sm">{children}</table></div>;
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th scope="col" className={cn("border-b border-line px-4 py-3 text-caption font-medium text-muted last:text-right", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-line/70 px-4 py-3 align-middle text-body text-ink-soft last:text-right", className)}>{children}</td>;
}

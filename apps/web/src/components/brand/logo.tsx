import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("shrink-0", className)} aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="#3155D8" />
      <path d="M11.5 29V16.4L28.5 29V12.8" stroke="white" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28.5" cy="9.4" r="3.1" fill="#F6A8C1" />
    </svg>
  );
}

export function Logo({ className, size = 34, variant = "dark", showTagline = false }: { className?: string; size?: number; variant?: "dark" | "light"; showTagline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className={cn("text-[21px] font-extrabold tracking-[-0.045em]", variant === "light" ? "text-white" : "text-ink")}>
          nivaasa<span className="text-blush-400">.</span>
        </span>
        {showTagline ? <span className={cn("mt-1 text-[8.5px] font-semibold uppercase tracking-[0.18em]", variant === "light" ? "text-white/60" : "text-muted")}>community, in one place</span> : null}
      </span>
    </span>
  );
}

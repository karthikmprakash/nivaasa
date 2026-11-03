import Link from "next/link";
import { cn } from "@/lib/utils";

type QueryTab = { value: string; label: string; count?: number; href?: string };

/** URL-backed navigation uses links; Radix Tabs remain for local client panels. */
export function QueryTabs({ items, value, basePath, param = "tab", label, className }: {
  items: QueryTab[]; value: string; basePath: string; param?: string; label: string; className?: string;
}) {
  return <nav aria-label={label} className={cn("flex max-w-full gap-5 overflow-x-auto border-b border-line", className)}>
    {items.map((item) => <Link key={item.value} href={item.href ?? `${basePath}?${param}=${encodeURIComponent(item.value)}`}
      aria-current={value === item.value ? "page" : undefined}
      className={cn("relative inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-1 py-3 text-body font-medium transition-colors", value === item.value ? "border-brand-600 text-brand-700" : "border-transparent text-muted hover:border-line-strong hover:text-ink")}>
      {item.label}{item.count !== undefined ? <span className="rounded-md bg-canvas px-1.5 text-caption tabular-nums text-ink-soft">{item.count}</span> : null}
    </Link>)}
  </nav>;
}

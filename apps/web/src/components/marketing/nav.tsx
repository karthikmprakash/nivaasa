"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#platform", label: "Platform" },
  { href: "/#resident", label: "For residents" },
  { href: "/#admin", label: "For admins" },
  { href: "/#security", label: "Security" },
  { href: "/#open-source", label: "Open source" },
];

export function MarketingNav({ signedIn, home }: { signedIn: boolean; home: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav className="mx-auto flex h-14 max-w-[1180px] items-center justify-between rounded-2xl border border-white/70 bg-white/75 px-3.5 shadow-[0_10px_30px_-20px_rgba(19,26,42,0.3)] backdrop-blur-xl sm:h-16 sm:px-5">
        <Link href="/" aria-label="Nivaasa home"><Logo size={31} /></Link>
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href={signedIn ? home : "/login"} className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-ink-soft hover:text-ink sm:inline-flex">
            {signedIn ? "Open app" : "Sign in"}
          </Link>
          <Link href={signedIn ? home : "/login?demo=1"} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(49,85,216,0.7)] transition-transform hover:scale-[1.02] hover:bg-brand-700">
            {signedIn ? "Go to dashboard" : "Try the demo"} <ArrowRight className="size-3.5" />
          </Link>
          <button onClick={() => setOpen((v) => !v)} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-canvas lg:hidden" aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>
      <div className={cn("mx-auto mt-2 max-w-[1180px] overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-lg backdrop-blur-xl transition-all lg:hidden", open ? "max-h-96 opacity-100" : "max-h-0 border-transparent opacity-0")}>
        <div className="p-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink-soft hover:bg-canvas hover:text-ink">
              {l.label}
            </Link>
          ))}
          <Link href={signedIn ? home : "/login"} className="block rounded-xl px-4 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50">Sign in</Link>
        </div>
      </div>
    </header>
  );
}

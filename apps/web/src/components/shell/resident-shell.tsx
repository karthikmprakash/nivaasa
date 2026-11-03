"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home, Newspaper, BookUser, FileText, UserRoundCheck, Package, Wrench, CalendarHeart,
  Wallet, House, ShoppingBag, Settings, Bell, ChevronDown, LogOut, LifeBuoy, Search,
  Plus, X, Menu, ShieldCheck, ArrowUpRight, Sparkles,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/primitives";
import { Sheet, Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/client";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Your community",
    items: [
      { href: "/app", label: "Home", icon: Home },
      { href: "/app/community", label: "Community", icon: Newspaper },
      { href: "/app/directory", label: "Directory", icon: BookUser },
      { href: "/app/documents", label: "Documents", icon: FileText },
    ],
  },
  {
    label: "Everyday services",
    items: [
      { href: "/app/visitors", label: "Visitors", icon: UserRoundCheck, badgeKey: "visitors" },
      { href: "/app/deliveries", label: "Deliveries", icon: Package, badgeKey: "deliveries" },
      { href: "/app/helpdesk", label: "Helpdesk", icon: Wrench },
      { href: "/app/amenities", label: "Amenities", icon: CalendarHeart },
      { href: "/app/payments", label: "Payments", icon: Wallet },
    ],
  },
  {
    label: "Your home",
    items: [
      { href: "/app/my-home", label: "My home", icon: House },
      { href: "/app/classifieds", label: "Buy & sell", icon: ShoppingBag },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

const mobileNav = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/community", label: "Community", icon: Newspaper },
  { href: "/app/visitors", label: "Visitors", icon: UserRoundCheck },
  { href: "/app/payments", label: "Pay", icon: Wallet },
];

const labelMap: Record<string, string> = {
  "/app": "Home", "/app/community": "Community", "/app/directory": "Directory", "/app/documents": "Documents",
  "/app/visitors": "Visitors", "/app/deliveries": "Deliveries", "/app/helpdesk": "Helpdesk", "/app/amenities": "Amenities",
  "/app/payments": "Payments", "/app/my-home": "My home", "/app/classifieds": "Buy & sell", "/app/settings": "Settings",
  "/app/notifications": "Notifications", "/app/emergency": "Emergency", "/app/search": "Search",
};

export function ResidentShell({ children, user, society, unit, counts, unread, demo }: {
  children: React.ReactNode;
  user: { name: string; email: string; avatarColor: string | null };
  society: { name: string; slug: string };
  unit: string;
  counts: { visitors: number; deliveries: number };
  unread: number;
  demo: boolean;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const activeLabel = labelMap[pathname] ?? (pathname.startsWith("/app/helpdesk") ? "Helpdesk" : pathname.startsWith("/app/amenities") ? "Amenities" : "Community");

  return (
    <div className="min-h-dvh bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-[72px] items-center px-5"><Link href="/app" aria-label="Nivaasa home"><Logo size={32} /></Link></div>
        <div className="mx-3 mb-4 rounded-xl border border-line bg-[#fbfcff] px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50"><LogoMark size={20} /></span>
              <div className="min-w-0"><p className="truncate text-[11.5px] font-semibold text-ink">{society.name}</p><p className="text-[9.5px] text-muted">Home {unit}</p></div>
            </div>
            <ChevronDown className="size-3.5 shrink-0 text-muted" />
          </div>
        </div>
        <nav className="fine-scroll flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.14em] text-[#a2aabc]">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href + "/"));
                  const count = item.badgeKey ? counts[item.badgeKey as keyof typeof counts] : 0;
                  return (
                    <Link key={item.href} href={item.href} className={cn("group flex items-center gap-2.5 rounded-xl px-3 py-[9px] text-[12.5px] font-medium transition-colors", active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-[#f8f9fd] hover:text-ink")}>
                      <item.icon className={cn("size-[17px]", active ? "text-brand-600" : "text-[#8b95a9] group-hover:text-ink-soft")} strokeWidth={active ? 2.2 : 1.8} />
                      <span className="flex-1">{item.label}</span>
                      {count ? <span className="grid min-w-5 place-items-center rounded-full bg-blush-400 px-1.5 py-0.5 text-[9px] font-bold text-white">{count}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <div className="rounded-xl bg-gradient-to-br from-brand-50 to-blush-50 p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-700"><LifeBuoy className="size-3.5" /> Need a hand?</div>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-soft">Raise a request and the community team will take it from there.</p>
            <Link href="/app/helpdesk/new" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">Raise a request <ArrowUpRight className="size-3" /></Link>
          </div>
          <div className="mt-2 flex items-center gap-2 px-2 py-2">
            <Avatar name={user.name} color={user.avatarColor} size="sm" />
            <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-ink">{user.name}</p><p className="truncate text-[9px] text-muted">{user.email}</p></div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between gap-3 border-b border-line/80 bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:h-[72px]">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenu(true)} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-canvas lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
            <div className="lg:hidden"><Link href="/app"><LogoMark size={30} /></Link></div>
            <div className="hidden items-center gap-1.5 text-[12px] lg:flex">
              <span className="text-muted">{society.name}</span><span className="text-line-strong">/</span><span className="font-semibold text-ink">{activeLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {demo ? <span className="hidden items-center gap-1 rounded-full border border-blush-200 bg-blush-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-blush-600 sm:inline-flex"><Sparkles className="size-3" /> Demo</span> : null}
            <Link href="/app/search" className="hidden h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-[11px] text-muted hover:border-brand-200 hover:text-ink sm:flex"><Search className="size-3.5" /> Search <span className="rounded border border-line bg-canvas px-1 py-0.5 text-[8.5px] font-semibold">⌘K</span></Link>
            <Link href="/app/helpdesk/new" className="hidden h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[11.5px] font-semibold text-white hover:bg-[#263047] md:flex"><Plus className="size-3.5" /> New request</Link>
            <Link href="/app/notifications" className="relative grid size-9 place-items-center rounded-full text-ink-soft hover:bg-canvas" aria-label="Notifications">
              <Bell className="size-[18px]" />
              {unread > 0 ? <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-blush-400 px-1 py-0.5 text-[8px] font-bold text-white ring-2 ring-white">{unread > 9 ? "9+" : unread}</span> : null}
            </Link>
            <Dropdown trigger={<button className="flex items-center gap-1.5 rounded-full p-0.5 pl-1 hover:bg-canvas" aria-label="Account menu"><Avatar name={user.name} color={user.avatarColor} size="sm" /><ChevronDown className="mr-1 hidden size-3.5 text-muted sm:block" /></button>}>
              <DropdownLabel>{user.name}</DropdownLabel>
              <div className="px-3 pb-2 text-[10px] text-muted">{unit} · {society.name}</div>
              <DropdownSeparator />
              <Link href="/app/my-home"><DropdownItem><House className="size-3.5" /> My home</DropdownItem></Link>
              <Link href="/app/settings"><DropdownItem><Settings className="size-3.5" /> Settings</DropdownItem></Link>
              <Link href="/app/emergency"><DropdownItem><ShieldCheck className="size-3.5" /> Emergency</DropdownItem></Link>
              <DropdownSeparator />
              <form action={logoutAction}><button type="submit" className="w-full"><DropdownItem destructive><LogOut className="size-3.5" /> Sign out</DropdownItem></button></form>
            </Dropdown>
          </div>
        </header>
        <main className="px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8"><div className="mx-auto max-w-[1220px]">{children}</div></main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {mobileNav.map((item) => {
            const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href + "/"));
            return <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[9px] font-semibold", active ? "text-brand-600" : "text-muted")}><item.icon className="size-[19px]" strokeWidth={active ? 2.4 : 1.8} />{item.label}</Link>;
          })}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[9px] font-semibold text-muted"><Menu className="size-[19px]" /> More</button>
        </div>
      </nav>

      <Sheet open={mobileMenu} onOpenChange={setMobileMenu} side="left">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><Logo size={30} /><button onClick={() => setMobileMenu(false)} className="grid size-8 place-items-center rounded-full hover:bg-canvas"><X className="size-4" /></button></div>
          <div className="mx-4 mt-4 rounded-xl border border-line bg-[#fbfcff] px-3 py-2.5"><p className="text-[11px] font-semibold text-ink">{society.name}</p><p className="text-[9.5px] text-muted">Home {unit}</p></div>
          <div className="flex-1 overflow-y-auto p-4">
            {groups.map((g) => (
              <div key={g.label} className="mb-4">
                <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">{g.label}</p>
                {g.items.map((item) => {
                  const active = pathname === item.href;
                  return <Link key={item.href} href={item.href} onClick={() => setMobileMenu(false)} className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium", active ? "bg-brand-50 text-brand-700" : "text-ink-soft")}><item.icon className="size-4" /> {item.label}</Link>;
                })}
              </div>
            ))}
          </div>
          <div className="border-t border-line p-4">
            <div className="flex items-center gap-2.5"><Avatar name={user.name} color={user.avatarColor} size="sm" /><div><p className="text-[12px] font-semibold">{user.name}</p><p className="text-[10px] text-muted">{unit}</p></div></div>
            <form action={logoutAction} className="mt-3"><button className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[12px] font-medium text-[#c43d4d]"><LogOut className="size-4" /> Sign out</button></form>
          </div>
        </div>
      </Sheet>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} side="bottom">
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div><p className="text-[15px] font-semibold text-ink">All services</p><p className="text-[10.5px] text-muted">{society.name} · {unit}</p></div>
            <button onClick={() => setMoreOpen(false)} className="grid size-8 place-items-center rounded-full bg-canvas"><X className="size-4" /></button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {groups.flatMap((g) => g.items).map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-2 rounded-xl border border-line px-2 py-3 text-center">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600"><item.icon className="size-4" /></span>
                <span className="text-[9.5px] font-semibold leading-tight text-ink-soft">{item.label}</span>
              </Link>
            ))}
            <Link href="/app/notifications" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-2 rounded-xl border border-line px-2 py-3 text-center">
              <span className="relative grid size-9 place-items-center rounded-xl bg-blush-50 text-blush-500"><Bell className="size-4" />{unread ? <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-blush-400" /> : null}</span>
              <span className="text-[9.5px] font-semibold leading-tight text-ink-soft">Alerts</span>
            </Link>
            <Link href="/app/emergency" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-2 rounded-xl border border-line px-2 py-3 text-center">
              <span className="grid size-9 place-items-center rounded-xl bg-[#fdeced] text-[#c43d4d]"><ShieldCheck className="size-4" /></span>
              <span className="text-[9.5px] font-semibold leading-tight text-ink-soft">Emergency</span>
            </Link>
          </div>
          <form action={logoutAction} className="mt-4"><button className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-[12px] font-semibold text-[#c43d4d]"><LogOut className="size-4" /> Sign out</button></form>
        </div>
      </Sheet>
    </div>
  );
}

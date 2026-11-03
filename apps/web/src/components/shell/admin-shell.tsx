"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Building2, ShieldCheck, Wallet, Wrench, CalendarHeart, Megaphone, UsersRound,
  Truck, ChartNoAxesCombined, ScrollText, Settings, Bell, ChevronDown, LogOut, Menu, X, Plus,
  ArrowUpRight, Search, LayoutGrid, Sparkles, LifeBuoy, Home,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/primitives";
import { Sheet, Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/client";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const groups = [
  { label: "Overview", items: [{ href: "/admin", label: "Command center", icon: LayoutDashboard, roles: ["all"] }] },
  {
    label: "Community",
    items: [
      { href: "/admin/residents", label: "Residents & homes", icon: Building2, roles: ["admin", "manager", "committee", "security_manager", "auditor"] },
      { href: "/admin/staff", label: "Staff & attendance", icon: UsersRound, roles: ["admin", "manager", "committee", "security_manager"] },
      { href: "/admin/vendors", label: "Vendors & assets", icon: Truck, roles: ["admin", "manager", "accountant", "committee"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/security", label: "Security & gate", icon: ShieldCheck, roles: ["admin", "manager", "committee", "security_manager", "auditor"] },
      { href: "/admin/helpdesk", label: "Helpdesk", icon: Wrench, roles: ["admin", "manager", "committee", "helpdesk_manager"] },
      { href: "/admin/amenities", label: "Amenities", icon: CalendarHeart, roles: ["admin", "manager", "committee"] },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/admin/billing", label: "Billing & accounts", icon: Wallet, roles: ["admin", "manager", "accountant", "committee", "auditor"] },
      { href: "/admin/reports", label: "Reports", icon: ChartNoAxesCombined, roles: ["admin", "manager", "accountant", "committee", "auditor"] },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/admin/communications", label: "Communications", icon: Megaphone, roles: ["admin", "manager", "committee"] },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText, roles: ["admin", "manager", "auditor"] },
      { href: "/admin/settings", label: "Society settings", icon: Settings, roles: ["admin", "manager"] },
    ],
  },
];

const mobileNav = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/residents", label: "Homes", icon: Building2 },
  { href: "/admin/security", label: "Gate", icon: ShieldCheck },
  { href: "/admin/billing", label: "Money", icon: Wallet },
];

const titles: Record<string, string> = {
  "/admin": "Command center", "/admin/residents": "Residents & homes", "/admin/security": "Security & gate",
  "/admin/billing": "Billing & accounts", "/admin/helpdesk": "Helpdesk", "/admin/amenities": "Amenities",
  "/admin/communications": "Communications", "/admin/staff": "Staff & attendance", "/admin/vendors": "Vendors & assets",
  "/admin/reports": "Reports", "/admin/audit": "Audit log", "/admin/settings": "Society settings", "/admin/notifications": "Notifications",
};

export function AdminShell({ children, user, society, role, counts, unread, hasUnit, isSuper, demo }: {
  children: React.ReactNode;
  user: { name: string; email: string; avatarColor: string | null };
  society: { name: string; city: string };
  role: string;
  counts: { tickets: number; visitors: number; payments: number };
  unread: number;
  hasUnit: boolean;
  isSuper: boolean;
  demo: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleGroups = groups.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes("all") || i.roles.includes(role) || isSuper) })).filter((g) => g.items.length);
  const title = titles[pathname] ?? (pathname.startsWith("/admin/helpdesk") ? "Helpdesk" : pathname.startsWith("/admin/billing") ? "Billing & accounts" : "Command center");

  return (
    <div className="min-h-dvh bg-[#f5f6fa]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-[68px] items-center px-5"><Link href="/admin" aria-label="Nivaasa admin"><Logo size={31} /></Link></div>
        <div className="mx-3 mb-3 rounded-xl border border-line bg-gradient-to-br from-[#fbfcff] to-brand-50/40 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0"><p className="truncate text-[11px] font-semibold text-ink">{society.name}</p><p className="truncate text-[9px] text-muted">{society.city} · Admin console</p></div>
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white text-brand-600 shadow-sm"><LogoMark size={18} /></span>
          </div>
        </div>
        <nav className="fine-scroll flex-1 overflow-y-auto px-3 pb-4">
          {visibleGroups.map((g) => (
            <div key={g.label} className="mb-4">
              <p className="mb-1.5 px-3 text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#a2aabc]">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                  const badge = item.href === "/admin/helpdesk" ? counts.tickets : item.href === "/admin/security" ? counts.visitors : item.href === "/admin/billing" ? counts.payments : 0;
                  return (
                    <Link key={item.href} href={item.href} className={cn("group flex items-center gap-2.5 rounded-lg px-3 py-[8px] text-[12px] font-medium transition-colors", active ? "bg-brand-600 text-white shadow-[0_6px_16px_-8px_rgba(49,85,216,0.55)]" : "text-ink-soft hover:bg-[#f7f8fc] hover:text-ink")}>
                      <item.icon className={cn("size-[16px]", active ? "text-white" : "text-[#8b95a9]")} strokeWidth={active ? 2.2 : 1.8} />
                      <span className="flex-1">{item.label}</span>
                      {badge ? <span className={cn("grid min-w-4 place-items-center rounded-full px-1 py-0.5 text-[8px] font-bold", active ? "bg-white/20 text-white" : "bg-blush-100 text-blush-600")}>{badge}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          {isSuper ? <Link href="/portfolio" className="mb-2 flex items-center justify-between rounded-lg border border-line bg-[#fbfcff] px-3 py-2 text-[10px] font-semibold text-ink-soft hover:text-ink"><span className="flex items-center gap-1.5"><LayoutGrid className="size-3.5 text-brand-600" /> Portfolio view</span><ArrowUpRight className="size-3" /></Link> : null}
          {hasUnit ? <Link href="/app" className="mb-2 flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-[10px] font-semibold text-ink-soft hover:text-ink"><span className="flex items-center gap-1.5"><Home className="size-3.5 text-brand-600" /> Resident app</span><ArrowUpRight className="size-3" /></Link> : null}
          <div className="flex items-center gap-2 rounded-lg px-1 py-1.5"><Avatar name={user.name} color={user.avatarColor} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-semibold text-ink">{user.name}</p><p className="truncate text-[8.5px] capitalize text-muted">{role.replace("_", " ")}</p></div></div>
        </div>
      </aside>

      <div className="lg:pl-[256px]">
        <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between gap-3 border-b border-line bg-white/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-canvas lg:hidden" aria-label="Open menu"><Menu className="size-[18px]" /></button>
            <div className="lg:hidden"><LogoMark size={27} /></div>
            <div className="hidden items-center gap-2 lg:flex"><span className="text-[11px] text-muted">{society.name}</span><span className="text-line-strong">/</span><span className="text-[11.5px] font-semibold text-ink">{title}</span></div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {demo ? <span className="hidden rounded-full border border-blush-200 bg-blush-50 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-blush-600 sm:inline">Demo</span> : null}
            <Link href="/admin/residents" className="hidden h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[10px] text-muted hover:border-brand-200 sm:flex"><Search className="size-3" /> Search homes <span className="rounded border border-line px-1 text-[8px]">⌘K</span></Link>
            <Link href="/admin/communications" className="hidden h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-[10px] font-semibold text-white hover:bg-[#263047] md:flex"><Plus className="size-3" /> Publish</Link>
            <Link href="/admin/notifications" className="relative grid size-8 place-items-center rounded-full text-ink-soft hover:bg-canvas" aria-label="Notifications"><Bell className="size-4" />{unread ? <span className="absolute right-1 top-1 grid min-w-3.5 place-items-center rounded-full bg-blush-400 px-0.5 text-[7px] font-bold text-white ring-2 ring-white">{unread > 9 ? "9+" : unread}</span> : null}</Link>
            <Dropdown trigger={<button className="flex items-center gap-1 rounded-full p-0.5 pl-1 hover:bg-canvas"><Avatar name={user.name} color={user.avatarColor} size="sm" /><ChevronDown className="mr-1 hidden size-3 text-muted sm:block" /></button>}>
              <DropdownLabel>{user.name}</DropdownLabel><div className="px-3 pb-2 text-[9px] capitalize text-muted">{role.replace("_", " ")} · {society.name}</div><DropdownSeparator />
              <Link href="/admin/settings"><DropdownItem><Settings className="size-3.5" /> Society settings</DropdownItem></Link>
              {hasUnit ? <Link href="/app"><DropdownItem><Home className="size-3.5" /> Resident app</DropdownItem></Link> : null}
              {isSuper ? <Link href="/portfolio"><DropdownItem><LayoutGrid className="size-3.5" /> Portfolio</DropdownItem></Link> : null}
              <DropdownSeparator />
              <form action={logoutAction}><button type="submit" className="w-full"><DropdownItem destructive><LogOut className="size-3.5" /> Sign out</DropdownItem></button></form>
            </Dropdown>
          </div>
        </header>
        <main className="px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-7 lg:pb-10 lg:pt-7"><div className="mx-auto max-w-[1320px]">{children}</div></main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {mobileNav.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[8.5px] font-semibold", active ? "text-brand-600" : "text-muted")}><item.icon className="size-[18px]" />{item.label}</Link>;
          })}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[8.5px] font-semibold text-muted"><Menu className="size-[18px]" /> More</button>
        </div>
      </nav>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} side="left">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><Logo size={29} /><button onClick={() => setMobileOpen(false)} className="grid size-7 place-items-center rounded-full hover:bg-canvas"><X className="size-4" /></button></div>
          <div className="mx-4 mt-4 rounded-xl border border-line bg-[#fbfcff] px-3 py-2.5"><p className="text-[11px] font-semibold text-ink">{society.name}</p><p className="text-[9px] text-muted">{society.city} · Admin</p></div>
          <div className="flex-1 overflow-y-auto p-4">
            {visibleGroups.map((g) => <div key={g.label} className="mb-4"><p className="mb-1 px-2 text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">{g.label}</p>{g.items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-medium", pathname === item.href ? "bg-brand-50 text-brand-700" : "text-ink-soft")}><item.icon className="size-4" /> {item.label}</Link>)}</div>)}
            <form action={logoutAction}><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-medium text-[#c43d4d]"><LogOut className="size-4" /> Sign out</button></form>
          </div>
        </div>
      </Sheet>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} side="bottom">
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between"><p className="text-[14px] font-semibold text-ink">All modules</p><button onClick={() => setMoreOpen(false)} className="grid size-7 place-items-center rounded-full bg-canvas"><X className="size-4" /></button></div>
          <div className="grid grid-cols-4 gap-2">
            {visibleGroups.flatMap((g) => g.items).map((item) => <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-2 rounded-xl border border-line px-1.5 py-3 text-center"><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600"><item.icon className="size-4" /></span><span className="text-[8.5px] font-semibold leading-tight text-ink-soft">{item.label}</span></Link>)}
          </div>
        </div>
      </Sheet>
    </div>
  );
}

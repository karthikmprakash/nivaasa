"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Bell, ChevronDown, ChevronRight, House, LayoutGrid, LogOut, Menu, Plus, Search, Settings as SettingsIcon, ShieldAlert, X } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Avatar, buttonClass } from "@/components/ui/primitives";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator, Sheet } from "@/components/ui/client";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { isNavigationActive, navigationTitle, type NavigationGroup, type NavigationItem } from "./navigation";

type ShellProps = {
  children: React.ReactNode;
  variant: "resident" | "admin";
  user: { name: string; email: string; avatarColor: string | null };
  society: { name: string };
  context: string;
  groups: NavigationGroup[];
  mobileHrefs: string[];
  unread: number;
  demo: boolean;
  hasUnit?: boolean;
  isSuper?: boolean;
};

export function ApplicationShell({ children, variant, user, society, context, groups, mobileHrefs, unread, demo, hasUnit, isSuper }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const root = variant === "resident" ? "/app" : "/admin";
  const title = navigationTitle(pathname, groups, root);
  const items = groups.flatMap((g) => g.items);
  const mobileItems = mobileHrefs.map((href) => items.find((i) => i.href === href)).filter((i): i is NavigationItem => !!i);
  const searchHref = variant === "resident" ? "/app/search" : "/admin/residents";
  const createHref = variant === "resident" ? "/app/helpdesk/new" : "/admin/communications";
  const canCreate = variant === "resident" || items.some((i) => i.href === createHref);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        router.push(searchHref);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, searchHref]);

  function navContents(close?: () => void) {
    return <>
      <div className="mx-4 mb-5 flex items-center gap-3 rounded-xl border border-line bg-canvas/65 p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white"><House aria-hidden="true" className="size-[18px] text-ink-soft" /></span>
        <div className="min-w-0"><p className="truncate text-body font-semibold text-ink">{society.name}</p><p className="mt-0.5 text-caption text-muted">{context}</p></div>
      </div>
      <nav aria-label={variant === "admin" ? "Admin navigation" : "Resident navigation"} className="fine-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g) => <div key={g.label} className="mb-5 last:mb-0">
          <p className="mb-1.5 px-3 text-caption font-medium text-muted">{g.label}</p>
          <div className="space-y-1">{g.items.map((item) => {
            const active = isNavigationActive(pathname, item.href, root);
            return <Link key={item.href} href={item.href} onClick={close} aria-current={active ? "page" : undefined}
              className={cn("group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-body font-medium transition-colors", active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-canvas hover:text-ink")}>
              <item.icon aria-hidden="true" className={cn("size-[18px] shrink-0", active ? "text-brand-600" : "text-muted")} strokeWidth={1.8} />
              <span className="flex-1">{item.label}</span>
              {item.count ? <span className="min-w-5 rounded-md bg-brand-100 px-1.5 text-center text-caption font-semibold tabular-nums text-brand-700">{item.count}</span> : null}
            </Link>;
          })}</div>
        </div>)}
      </nav>
      <div className="space-y-2 border-t border-line p-4">
        {isSuper ? <Link href="/portfolio" className="flex min-h-10 items-center gap-2 text-body font-medium text-ink-soft"><LayoutGrid className="size-4" /> Portfolio <ChevronRight className="ml-auto size-4" /></Link> : null}
        {hasUnit ? <Link href="/app" className="flex min-h-10 items-center gap-2 text-body font-medium text-ink-soft"><House className="size-4" /> Resident app <ChevronRight className="ml-auto size-4" /></Link> : null}
        <div className="flex min-w-0 items-center gap-3"><Avatar name={user.name} color={user.avatarColor} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-body font-semibold text-ink">{user.name}</p><p className="truncate text-caption text-muted">{user.email}</p></div></div>
      </div>
    </>;
  }

  return <div className="min-h-dvh bg-canvas" data-app-shell>
    <a href="#main-content" className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white focus:translate-y-0">Skip to content</a>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] flex-col border-r border-line bg-white lg:flex">
      <div className="flex h-[76px] shrink-0 items-center px-6"><Link href={root} aria-label="Nivaasa home"><Logo size={32} /></Link></div>
      {navContents()}
    </aside>
    <div className="lg:pl-[256px]">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-white px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={() => setMenuOpen(true)} className="grid size-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-canvas lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button>
          <Link href={root} aria-label="Nivaasa home" className="shrink-0 lg:hidden"><LogoMark size={28} /></Link>
          <div className="ml-1 hidden min-w-0 items-center gap-2 text-body sm:flex"><span className="hidden truncate text-muted lg:inline">{society.name}</span><ChevronRight aria-hidden="true" className="hidden size-3.5 text-muted lg:block" /><span className="truncate font-medium text-ink">{title}</span></div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {demo ? <span className="hidden rounded-md border border-line bg-canvas px-2 py-1 text-caption font-medium text-muted md:inline">Demo community</span> : null}
          <Link href={searchHref} aria-label={variant === "resident" ? "Search community" : "Search homes"} data-control className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-body text-muted hover:bg-canvas hover:text-ink">
            <Search aria-hidden="true" className="size-[18px]" /><span className="hidden xl:inline">{variant === "resident" ? "Search" : "Search homes"}</span><kbd className="hidden rounded border border-line px-1 text-caption lg:inline">⌘ K</kbd>
          </Link>
          {canCreate ? <Link href={createHref} className={cn(buttonClass("primary", "sm"), "hidden md:inline-flex")}><Plus className="size-4" /> {variant === "resident" ? "New request" : "Publish notice"}</Link> : null}
          <Link href={`${root}/notifications`} className="relative grid size-11 place-items-center rounded-lg text-ink-soft hover:bg-canvas" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
            <Bell aria-hidden="true" className="size-5" />{unread > 0 ? <span className="absolute right-1 top-0.5 min-w-4 rounded-full bg-brand-600 px-1 text-center text-[10px] font-semibold leading-4 text-white ring-2 ring-white">{unread > 9 ? "9+" : unread}</span> : null}
          </Link>
          <Dropdown trigger={<button className="flex min-h-11 items-center gap-1 rounded-lg px-1 hover:bg-canvas" aria-label="Account menu"><Avatar name={user.name} color={user.avatarColor} size="sm" /><ChevronDown className="hidden size-4 text-muted sm:block" /></button>}>
            <DropdownLabel>{user.name}</DropdownLabel><p className="px-3 pb-2 text-caption text-muted">{context} · {society.name}</p><DropdownSeparator />
            {variant === "resident" ? <><DropdownItem href="/app/my-home"><House className="size-4" /> My home</DropdownItem><DropdownItem href="/app/settings"><SettingsIcon /> Settings</DropdownItem><DropdownItem href="/app/emergency"><ShieldAlert className="size-4" /> Emergency</DropdownItem></> : <>
              {items.some((i) => i.href === "/admin/settings") ? <DropdownItem href="/admin/settings"><SettingsIcon /> Society settings</DropdownItem> : null}
              {hasUnit ? <DropdownItem href="/app"><House className="size-4" /> Resident app</DropdownItem> : null}
              {isSuper ? <DropdownItem href="/portfolio"><LayoutGrid className="size-4" /> Portfolio</DropdownItem> : null}
            </>}
            <DropdownSeparator /><DropdownItem destructive onClick={() => startSignOut(() => logoutAction())}><LogOut className="size-4" /> {signingOut ? "Signing out…" : "Sign out"}</DropdownItem>
          </Dropdown>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 outline-none sm:px-6 lg:px-8 lg:pb-10 lg:pt-8"><div className="mx-auto max-w-[1280px]">{children}</div></main>
    </div>
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex">{mobileItems.map((item) => {
        const active = isNavigationActive(pathname, item.href, root);
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-caption font-medium", active ? "text-brand-700" : "text-muted")}><item.icon className="size-5" aria-hidden="true" strokeWidth={active ? 2.2 : 1.8} /><span>{item.href === "/admin/residents" ? "Homes" : item.href === "/admin/security" ? "Gate" : item.href.endsWith("billing") ? "Billing" : item.href.endsWith("payments") ? "Pay" : item.label}</span></Link>;
      })}<button onClick={() => setServicesOpen(true)} aria-expanded={servicesOpen} aria-label="More services" className={cn("flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-caption font-medium", !mobileItems.some((i) => isNavigationActive(pathname, i.href, root)) ? "text-brand-700" : "text-muted")}><Menu className="size-5" />More</button></div>
    </nav>
    <Sheet open={menuOpen} onOpenChange={setMenuOpen} side="left" title="Navigation">
      <div className="flex h-full flex-col"><div className="flex h-[76px] shrink-0 items-center justify-between px-5"><Logo size={30} /><button aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="grid size-11 place-items-center rounded-lg hover:bg-canvas"><X className="size-5" /></button></div>{navContents(() => setMenuOpen(false))}<form action={logoutAction} className="border-t border-line px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"><button className="flex min-h-11 w-full items-center gap-2 px-2 text-body font-medium text-[#b83244]"><LogOut className="size-4" /> Sign out</button></form></div>
    </Sheet>
    <Sheet open={servicesOpen} onOpenChange={setServicesOpen} side="bottom" title={variant === "resident" ? "All services" : "All modules"}>
      <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">{variant === "resident" ? "All services" : "All modules"}</h2><p className="text-caption text-muted">{society.name} · {context}</p></div><button aria-label="Close services" onClick={() => setServicesOpen(false)} className="grid size-11 place-items-center rounded-lg bg-canvas"><X className="size-5" /></button></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[...items, ...(variant === "resident" ? [{ href: "/app/emergency", label: "Emergency", icon: ShieldAlert }] : [])].map((item) => <Link key={item.href} href={item.href} onClick={() => setServicesOpen(false)} aria-current={isNavigationActive(pathname, item.href, root) ? "page" : undefined} className="flex min-h-14 items-center gap-3 rounded-xl border border-line px-3 py-3 text-body font-medium text-ink-soft hover:border-brand-200 hover:bg-brand-50"><item.icon aria-hidden="true" className="size-5 shrink-0 text-brand-600" /><span>{item.label}</span></Link>)}</div>
      </div>
    </Sheet>
  </div>;
}


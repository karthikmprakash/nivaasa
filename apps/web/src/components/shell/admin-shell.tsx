"use client";

import { ApplicationShell } from "./application-shell";
import { adminNavigation } from "./navigation";
import type { SocietyOption } from "@/lib/society-access";

export function AdminShell({ children, user, society, societies, currentSocietyId, role, counts, unread, hasUnit, isSuper, demo }: {
  children: React.ReactNode;
  user: { name: string; email: string; avatarColor: string | null };
  society: { name: string; city: string };
  societies: SocietyOption[];
  currentSocietyId: string;
  role: string;
  counts: { tickets: number; visitors: number; payments: number };
  unread: number;
  hasUnit: boolean;
  isSuper: boolean;
  demo: boolean;
}) {
  const groups = adminNavigation.map((g) => ({ ...g, items: g.items
    .filter((i) => !i.roles || i.roles.includes(role) || isSuper)
    .map((item) => ({ ...item, count: item.href === "/admin/helpdesk" ? counts.tickets : item.href === "/admin/security" ? counts.visitors : item.href === "/admin/billing" ? counts.payments : undefined })),
  })).filter((g) => g.items.length > 0);
  return <ApplicationShell variant="admin" user={user} society={society} societies={societies} currentSocietyId={currentSocietyId} context={role.replaceAll("_", " ")} groups={groups}
    mobileHrefs={["/admin", "/admin/residents", "/admin/security", "/admin/billing"]} unread={unread} demo={demo}
    hasUnit={hasUnit} isSuper={isSuper}>{children}</ApplicationShell>;
}

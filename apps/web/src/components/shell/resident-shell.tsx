"use client";

import { ApplicationShell } from "./application-shell";
import { residentNavigation } from "./navigation";

export function ResidentShell({ children, user, society, unit, counts, unread, demo }: {
  children: React.ReactNode;
  user: { name: string; email: string; avatarColor: string | null };
  society: { name: string; slug: string };
  unit: string;
  counts: { visitors: number; deliveries: number };
  unread: number;
  demo: boolean;
}) {
  const groups = residentNavigation.map((g) => ({ ...g, items: g.items.map((item) => ({
    ...item,
    count: item.href === "/app/visitors" ? counts.visitors : item.href === "/app/deliveries" ? counts.deliveries : undefined,
  })) }));
  return <ApplicationShell variant="resident" user={user} society={society} context={`Home ${unit}`} groups={groups}
    mobileHrefs={["/app", "/app/community", "/app/visitors", "/app/payments"]} unread={unread} demo={demo}>{children}</ApplicationShell>;
}

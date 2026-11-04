import type { Metadata } from "next";
import { ResidentShell } from "@/components/shell/resident-shell";
import { getResidentCounts, getSocietyOptions, requireResident } from "@/lib/queries";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireResident();
  const counts = await getResidentCounts(ctx.unit.id, ctx.society.id, ctx.user.id);
  const societies = await getSocietyOptions(ctx);
  return (
    <ResidentShell
      user={{ name: ctx.user.name, email: ctx.user.email, avatarColor: ctx.user.avatarColor }}
      society={{ name: ctx.society.name, slug: ctx.society.slug }}
      societies={societies}
      currentSocietyId={ctx.society.id}
      unit={ctx.unit.number}
      counts={{ visitors: counts.visitors, deliveries: counts.deliveries }}
      unread={counts.unread}
      demo={process.env.NEXT_PUBLIC_DEMO_MODE !== "false"}
    >
      {children}
    </ResidentShell>
  );
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { MapPin, MessageCircle, KeyRound, ShieldCheck, Clock3, Navigation, Phone } from "lucide-react";
import { Avatar, Badge } from "@/components/ui/primitives";
import { Logo } from "@/components/brand/logo";
import { db } from "@/db";
import { societies, units, users, visitors } from "@/db/schema";
import { formatDate, formatTime } from "@/lib/utils";
import { signedVisitorPhotoUrl } from "@/lib/visitor-photo";

export const metadata: Metadata = { title: "Visitor invite · Nivaasa" };
export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  guest: "Guest", delivery: "Delivery", cab: "Cab", domestic_help: "Daily help", vendor: "Service visit", other: "Visitor",
};

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [row] = await db.select({
    pass: visitors, society: societies, unit: units, host: users,
  }).from(visitors)
    .innerJoin(societies, eq(visitors.societyId, societies.id))
    .leftJoin(units, eq(visitors.unitId, units.id))
    .leftJoin(users, eq(visitors.hostUserId, users.id))
    .where(and(eq(visitors.code, code), eq(visitors.preApproved, true)))
    .limit(1);

  const now = new Date();
  const pass = row?.pass;
  const valid = !!pass && ["approved", "entered", "exited"].includes(pass.status) && (!pass.validTo || pass.validTo >= now) && (!pass.validFrom || pass.validFrom <= now);
  const society = row?.society;
  const address = society ? [society.address, society.city, society.state, society.pincode].filter(Boolean).join(", ") : "";
  const host = row?.host;
  const hostPhone = host?.phone ? host.phone.replace(/[^\d+]/g, "") : "";

  let photoUrl: string | null = null;
  if (pass?.photoUrl) {
    const h = await headers();
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
    photoUrl = signedVisitorPhotoUrl(pass.id, origin, 3600);
  }

  const mapsUrl = address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : null;
  const smsUrl = hostPhone ? `sms:${hostPhone}` : null;
  const waUrl = hostPhone ? `https://wa.me/${hostPhone.replace(/^\+/, "")}` : null;

  const validity = pass?.validFrom && pass?.validTo
    ? (formatDate(pass.validFrom) === formatDate(pass.validTo) ? formatDate(pass.validFrom) : `${formatDate(pass.validFrom)} – ${formatDate(pass.validTo)}`)
    : null;

  return (
    <main className="hero-wash flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        {!pass || !valid ? (
          <div className="rounded-panel border border-line bg-white p-6 text-center shadow-[0_1px_2px_rgba(19,26,42,0.03)] sm:p-8">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-canvas text-muted"><KeyRound className="size-6" /></span>
            <h1 className="mt-4 text-section font-bold text-ink">This invite is not active</h1>
            <p className="mt-2 text-body text-muted">The code may be expired, cancelled or not yet valid. Ask your host to share a fresh invite.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-panel border border-line bg-white shadow-[0_1px_2px_rgba(19,26,42,0.03)]">
            <div className="border-b border-line bg-gradient-to-r from-brand-50 via-white to-blush-50 p-6 sm:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blush-500">You&apos;re invited to</p>
              <h1 className="mt-1 text-title font-extrabold tracking-[-0.02em] text-ink">{society?.name ?? "the community"}</h1>
              {address ? <p className="mt-1 flex items-start gap-1.5 text-caption text-muted"><MapPin className="mt-0.5 size-3.5 shrink-0" />{address}</p> : null}
              {row?.unit ? <p className="mt-1 text-caption font-semibold text-ink-soft">Home {row.unit.number}</p> : null}
            </div>
            <div className="space-y-5 p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <Avatar name={pass.name} color={pass.photoColor} size="lg" imageUrl={photoUrl} />
                <div className="min-w-0">
                  <p className="truncate text-body font-semibold text-ink">{pass.name}</p>
                  <p className="truncate text-caption text-muted">{pass.purpose ?? typeLabel[pass.type] ?? "Visitor"}</p>
                </div>
                <div className="ml-auto">
                  {pass.status === "entered" ? <Badge variant="pink" dot>Inside now</Badge> : <Badge variant="success" dot>Ready at gate</Badge>}
                </div>
              </div>

              <div className="rounded-xl bg-canvas px-4 py-3 text-center">
                <p className="text-caption font-semibold uppercase tracking-[0.14em] text-muted">Entry code</p>
                <p className="font-mono text-3xl font-bold tracking-[0.22em] text-brand-700">{pass.code}</p>
                <p className="mt-1 text-caption text-muted">Show this code at the gate</p>
              </div>

              {validity ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  <p className="text-caption text-ink-soft">
                    Valid {validity}
                    {pass.type === "guest" ? " · multiple entries allowed within this window" : ""}
                  </p>
                </div>
              ) : null}
              {pass.enteredAt || pass.exitedAt ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-mint-600" />
                  <p className="text-caption text-ink-soft">
                    {pass.enteredAt ? `Entered ${formatDate(pass.enteredAt)} at ${formatTime(pass.enteredAt)}` : "No entry recorded yet"}
                    {pass.exitedAt ? ` · exited at ${formatTime(pass.exitedAt)}` : pass.status === "entered" ? " · still inside" : ""}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-2.5">
                {mapsUrl ? (
                  <a href={mapsUrl} target="_blank" rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-brand-600 px-4 text-body font-semibold text-white shadow-sm transition-colors hover:bg-brand-700">
                    <Navigation className="size-4" /> Get directions to the apartment
                  </a>
                ) : null}
                {smsUrl ? (
                  <a href={smsUrl}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line bg-white px-4 text-body font-semibold text-ink-soft transition-colors hover:bg-canvas">
                    <MessageCircle className="size-4" /> Message {host?.name?.split(" ")[0] ?? "your host"}
                  </a>
                ) : null}
                {waUrl ? (
                  <a href={waUrl} target="_blank" rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-line bg-white px-4 text-caption font-semibold text-ink-soft transition-colors hover:bg-canvas">
                    <Phone className="size-3.5" /> WhatsApp {host?.name?.split(" ")[0] ?? "your host"}
                  </a>
                ) : null}
              </div>

              <p className="text-center text-caption text-muted">
                Invited by {host?.name ?? "your host"}{pass.notes ? ` · “${pass.notes}”` : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

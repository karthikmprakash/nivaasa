import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { Building2, CreditCard, Database, KeyRound, Plug, ShieldCheck, Settings2, UserCog, Users, Wallet } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { InviteTeamDialog, SocietyPreferenceForm, SocietyProfileForm } from "@/components/admin/society-forms";
import { requireAdmin } from "@/lib/queries";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { changeTeamRole } from "@/lib/actions/society";

export const metadata = { title: "Society settings" };

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = { admin: "Society admin", manager: "Community manager", committee: "Committee member", accountant: "Accountant", helpdesk_manager: "Helpdesk manager", security_manager: "Security manager", auditor: "Auditor" };

export default async function AdminSettingsPage() {
  const ctx = await requireAdmin();
  const society = ctx.society!;
  const team = await db.select({ membership: memberships, user: users }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).where(and(eq(memberships.societyId, society.id), inArray(memberships.role, ["admin", "manager", "committee", "accountant", "helpdesk_manager", "security_manager", "auditor"]))).orderBy(memberships.role);
  const canEdit = ["admin", "manager"].includes(ctx.membership?.role ?? "") || ctx.user.globalRole === "super_admin";
  return (
    <div>
      <PageHeader eyebrow="Governance" title="Society settings" description="Identity, money, privacy and people. Configure how your community runs." actions={canEdit ? <InviteTeamDialog /> : <Badge variant="outline">Read-only access</Badge>} />
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.7fr]">
        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Building2 className="size-5" /></span><div><p className="text-body font-semibold text-ink">{society.name}</p><p className="text-caption text-muted">{society.city}, {society.state} · {society.unitsCount} homes</p></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3"><div><p className="text-caption uppercase tracking-wide text-muted">Established</p><p className="text-caption font-semibold text-ink">{society.establishedYear}</p></div><div><p className="text-caption uppercase tracking-wide text-muted">Registration</p><p className="text-caption font-semibold text-ink">{society.registrationNo}</p></div></div>
            <div className="mt-3 rounded-lg bg-canvas px-2.5 py-2 text-caption text-muted">Demo environment · changes persist locally</div>
          </Card>
          <div className="rounded-[18px] border border-line bg-white p-4">
            <p className="text-caption font-bold uppercase tracking-[0.12em] text-muted">On this page</p>
            <div className="mt-2 space-y-1">{["identity", "preferences", "banking", "team", "integrations", "security"].map((s) => <a key={s} href={`#${s}`} className="block rounded-lg px-2 py-1.5 text-caption font-medium capitalize text-ink-soft hover:bg-canvas hover:text-ink">{s}</a>)}</div>
          </div>
          <div className="rounded-[18px] bg-gradient-to-br from-brand-50 to-blush-50 p-4"><p className="flex items-center gap-1.5 text-caption font-semibold text-ink"><ShieldCheck className="size-4 text-brand-600" /> Enterprise controls</p><p className="mt-1 text-caption leading-relaxed text-ink-soft">Role-based access, an append-only audit log, scoped data visibility and exportable records are enabled for this community.</p></div>
        </aside>

        <div className="space-y-4">
          <Card id="identity"><CardHeader title="Society identity" description="Shown on invoices, notices and the resident app" icon={<Building2 className="size-4" />} /><div className="border-t border-line p-5"><SocietyProfileForm society={{ name: society.name, address: society.address, city: society.city, state: society.state, pincode: society.pincode, registrationNo: society.registrationNo, gstin: society.gstin, pan: society.pan, bankName: society.bankName, bankAccount: society.bankAccount, ifsc: society.ifsc }} /></div></Card>

          <Card id="preferences"><CardHeader title="Community preferences" description="Rules that shape day-to-day operations" icon={<Settings2 className="size-4" />} /><div className="border-t border-line p-5"><SocietyPreferenceForm settings={society.settings ?? {}} /></div></Card>

          <Card id="banking"><CardHeader title="Payments & banking" description="Where maintenance and amenity income lands" icon={<Wallet className="size-4" />} /><div className="border-t border-line p-5"><div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-line bg-[#fbfcff] p-3"><p className="text-caption uppercase tracking-wide text-muted">Bank</p><p className="text-caption font-semibold text-ink">{society.bankName}</p></div><div className="rounded-xl border border-line bg-[#fbfcff] p-3"><p className="text-caption uppercase tracking-wide text-muted">Account</p><p className="text-caption font-semibold text-ink">•••• {society.bankAccount?.slice(-4)}</p></div><div className="rounded-xl border border-line bg-[#fbfcff] p-3"><p className="text-caption uppercase tracking-wide text-muted">IFSC</p><p className="text-caption font-semibold text-ink">{society.ifsc}</p></div><div className="rounded-xl border border-line bg-[#fbfcff] p-3"><p className="text-caption uppercase tracking-wide text-muted">Gateway</p><p className="text-caption font-semibold text-ink capitalize">{society.settings?.paymentGateway ?? "demo"}</p></div></div><p className="mt-2 text-caption text-muted">Online payments are simulated in the demo. Connect Razorpay or Stripe in <code className="rounded bg-canvas px-1">.env.local</code> for production.</p></div></Card>

          <Card id="team">
            <CardHeader title="Team & permissions" description="Who can see and do what" icon={<Users className="size-4" />} action={canEdit ? <InviteTeamDialog /> : null} />
            <div className="border-t border-line">
              {team.map(({ membership: m, user }) => (
                <div key={m.id} className="flex flex-col gap-2 border-b border-line/70 px-5 py-3 last:border-0 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-2.5"><Avatar name={user.name} color={user.avatarColor} size="sm" /><div><p className="text-caption font-semibold text-ink">{user.name}</p><p className="text-caption text-muted">{user.email}</p></div></div>
                  {canEdit && m.userId !== ctx.user.id ? (
                    <form action={changeTeamRole} className="flex items-center gap-1.5"><input type="hidden" name="membershipId" value={m.id} /><select name="role" defaultValue={m.role} className="h-7 rounded-lg border border-line bg-white px-1.5 text-caption">{Object.entries(roleLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><button className="rounded-lg bg-brand-50 px-2 py-1 text-caption font-semibold text-brand-700">Save</button></form>
                  ) : <Badge variant={m.role === "admin" ? "blue" : "outline"}>{roleLabels[m.role] ?? m.role}</Badge>}
                </div>
              ))}
            </div>
            <div className="border-t border-line bg-[#fbfcff] px-5 py-3"><p className="text-caption leading-relaxed text-muted">Residents cannot be promoted to admin from here. Family members and tenants are managed from the resident app. Every role change is audit-logged.</p></div>
          </Card>

          <Card id="integrations"><CardHeader title="Integrations" description="Connect the tools your community already uses" icon={<Plug className="size-4" />} /><div className="border-t border-line p-5"><div className="grid gap-2 sm:grid-cols-2">{[
            { l: "Payment gateway", v: society.settings?.paymentGateway === "demo" ? "Demo mode" : society.settings?.paymentGateway ?? "Demo", d: "Razorpay / Stripe ready", ok: true },
            { l: "e-Intercom", v: "Demo provider", d: "Plug in Exotel / Twilio", ok: true },
            { l: "WhatsApp & SMS", v: "Not configured", d: "Add provider credentials", ok: false },
            { l: "Tally export", v: "CSV ready", d: "Ledger export available", ok: true },
          ].map((i) => <div key={i.l} className="flex items-start gap-2 rounded-xl border border-line p-3"><span className={`mt-0.5 size-1.5 rounded-full ${i.ok ? "bg-mint-500" : "bg-amber-ink"}`} /><div><p className="text-caption font-semibold text-ink">{i.l}</p><p className="text-caption text-muted">{i.v}</p><p className="text-caption text-muted">{i.d}</p></div></div>)}</div></div></Card>

          <Card id="security"><CardHeader title="Data, security & compliance" description="How Nivaasa protects the community" icon={<ShieldCheck className="size-4" />} /><div className="border-t border-line p-5"><div className="grid gap-2 sm:grid-cols-2">{[
            { i: Database, l: "Self-hosted database", d: "SQLite in this demo; Postgres supported" },
            { i: KeyRound, l: "Scrypt password hashing", d: "Sessions expire after 7 days" },
            { i: CreditCard, l: "No card data stored", d: "Gateway-hosted checkout" },
            { i: ShieldCheck, l: "Append-only audit log", d: "Every sensitive action recorded" },
          ].map((f) => <div key={f.l} className="flex gap-2 rounded-xl bg-[#fbfcff] px-3 py-2.5"><f.i className="mt-0.5 size-3.5 shrink-0 text-brand-600" /><div><p className="text-caption font-semibold text-ink">{f.l}</p><p className="text-caption text-muted">{f.d}</p></div></div>)}</div><div className="mt-3 rounded-xl border border-line bg-canvas px-3 py-2 text-caption leading-relaxed text-muted">Export a full ledger any time from Billing or Reports. For a data deletion request, contact the community office; records required for statutory retention are anonymised rather than deleted.</div></div></Card>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronRight, Eye, Home, KeyRound, LockKeyhole, LogOut, ShieldCheck, UserRound, Users } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ProfileForm, PasswordForm } from "@/components/app/settings-forms";
import { requireResident } from "@/lib/queries";
import { logoutAction } from "@/lib/actions/auth";
import { updateDirectoryVisibility, updateNotificationPrefs } from "@/lib/actions/settings";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireResident();
  const prefs = ctx.membership.notificationPrefs ?? { visitors: true, payments: true, community: true, helpdesk: true };
  return (
    <div>
      <PageHeader eyebrow="Your account" title="Settings" description="Manage your profile, privacy and how the community reaches you." />

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <aside className="space-y-4">
          <Card className="p-5">
            <Avatar name={ctx.user.name} color={ctx.user.avatarColor} size="xl" />
            <p className="mt-3 text-[16px] font-semibold text-ink">{ctx.user.name}</p>
            <p className="text-[10.5px] text-muted">{ctx.user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5"><Badge variant="blue">{ctx.membership.role === "committee" ? "Committee member" : ctx.membership.role === "tenant" ? "Tenant" : "Owner"}</Badge><Badge variant="outline">Home {ctx.unit.number}</Badge></div>
            <div className="mt-4 space-y-2 border-t border-line pt-3">
              <div className="flex justify-between text-[10px]"><span className="text-muted">Joined</span><span className="font-medium text-ink">{formatDate(ctx.membership.joinedAt)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-muted">Society</span><span className="font-medium text-ink">{ctx.society.name}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-muted">Directory</span><span className="font-medium text-ink">{ctx.membership.directoryVisible ? "Visible" : "Hidden"}</span></div>
            </div>
          </Card>
          <div className="rounded-[18px] border border-line bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Quick links</p>
            <div className="mt-2 space-y-1">
              {[
                { l: "My home", h: "/app/my-home", Icon: Home },
                { l: "Notifications", h: "/app/notifications", Icon: Bell },
                { l: "Emergency", h: "/app/emergency", Icon: ShieldCheck },
                { l: "Privacy", h: "#privacy", Icon: Eye },
              ].map((q) => <Link key={q.l} href={q.h} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-[11px] font-medium text-ink-soft hover:text-ink"><q.Icon className="size-3.5" /> {q.l}<ChevronRight className="ml-auto size-3 text-muted" /></Link>)}
            </div>
          </div>
          <form action={logoutAction}><button className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-[11px] font-semibold text-[#c43d4d] hover:bg-[#fdeced]"><LogOut className="size-3.5" /> Sign out of this device</button></form>
        </aside>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Profile" description="Your name and contact number" icon={<UserRound className="size-4" />} />
            <div className="border-t border-line p-5"><ProfileForm name={ctx.user.name} phone={ctx.user.phone} email={ctx.user.email} /></div>
          </Card>

          <Card id="privacy">
            <CardHeader title="Directory privacy" description="Control whether neighbours can find you" icon={<Eye className="size-4" />} />
            <div className="border-t border-line p-5">
              <form action={updateDirectoryVisibility} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Users className="size-4" /></span><div><p className="text-[11.5px] font-semibold text-ink">Show me in the resident directory</p><p className="mt-0.5 text-[10px] text-muted">Your name, flat and a masked phone number will be visible to other residents. Your contact is never shared outside the community.</p></div></div>
                <label className="flex shrink-0 items-center gap-2 rounded-full border border-line px-3 py-2"><input type="checkbox" name="visible" defaultChecked={ctx.membership.directoryVisible} className="peer size-4 accent-[#3155d8]" /><span className="text-[10px] font-semibold text-ink-soft">Visible</span><button type="submit" className="rounded-full bg-brand-600 px-2.5 py-1 text-[9px] font-semibold text-white">Save</button></label>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader title="Notifications" description="What you want to hear about" icon={<Bell className="size-4" />} />
            <div className="border-t border-line p-5">
              <form action={updateNotificationPrefs} className="space-y-2">
                {[
                  { n: "visitors", l: "Visitors & deliveries", d: "Gate approvals, passes and parcel updates", v: prefs.visitors },
                  { n: "payments", l: "Payments & invoices", d: "Due dates, receipts and verification updates", v: prefs.payments },
                  { n: "community", l: "Community updates", d: "Notices, polls, events and discussions", v: prefs.community },
                  { n: "helpdesk", l: "Helpdesk", d: "Ticket assignments, replies and resolutions", v: prefs.helpdesk },
                ].map((p) => (
                  <label key={p.n} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3">
                    <span><span className="block text-[11px] font-semibold text-ink">{p.l}</span><span className="text-[9.5px] text-muted">{p.d}</span></span>
                    <input type="checkbox" name={p.n} defaultChecked={p.v} className="size-4 shrink-0 accent-[#3155d8]" />
                  </label>
                ))}
                <p className="text-[9px] text-muted">In-app security alerts are always on. Email/SMS delivery depends on your community&apos;s channel configuration.</p>
                <button type="submit" className="rounded-full bg-brand-600 px-4 py-2 text-[10.5px] font-semibold text-white">Save preferences</button>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader title="Security" description="Password and sessions" icon={<KeyRound className="size-4" />} />
            <div className="border-t border-line p-5">
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-mint-50 px-3 py-2.5 text-[10px] text-mint-600"><ShieldCheck className="size-3.5" /> Sessions expire automatically after 7 days. Passwords are stored with scrypt.</div>
              <PasswordForm />
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 size-4 text-muted" /><div><p className="text-[11.5px] font-semibold text-ink">Your data</p><p className="mt-0.5 text-[10px] leading-relaxed text-muted">Download a statement of your invoices and payments, or raise a request with the community office to export or delete personal data.</p><Link href="/api/export/statement" className="mt-2 inline-flex text-[10px] font-semibold text-brand-600">Download my statement →</Link></div></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

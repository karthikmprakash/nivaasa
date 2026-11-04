"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Car, Check, CheckCircle2, ChevronDown, Clock3, KeyRound, Loader2, MapPin, PackageOpen,
  Search, ShieldCheck, UserRound, UserRoundCheck, Users, Wrench, X,
} from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import { avatarForeground, cn } from "@/lib/utils";

type Resident = { name: string; phone: string; unit: string; unitId: string; role: string; color: string };
type Pass = { id: string; name: string; company: string | null; type: string; code: string; unit: string; unitId: string; status: string; notes: string | null; leaveAtGate: boolean };
type Unit = { id: string; number: string } | null;

const types = [
  { v: "guest", l: "Guest", i: UserRound },
  { v: "delivery", l: "Delivery", i: PackageOpen },
  { v: "cab", l: "Cab", i: Car },
  { v: "vendor", l: "Vendor", i: Wrench },
  { v: "other", l: "Other", i: UserRoundCheck },
];

export function GateEntryWizard() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [residents, setResidents] = useState<Resident[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [searching, setSearching] = useState(false);
  const [unit, setUnit] = useState<Unit>(null);
  const [hostName, setHostName] = useState("");
  const [type, setType] = useState("guest");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [holdParcel, setHoldParcel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{ status: string; name: string; unit: string } | null>(null);
  const [searchError, setSearchError] = useState(false);
  const needsIdentity = !code || type !== "guest";

  useEffect(() => {
    const controller = new AbortController();
    const term = query.trim();
    setSearchError(false);
    setResidents([]);
    setPasses([]);
    setSearching(term.length >= 2);
    if (term.length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gate/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (!controller.signal.aborted) {
          setResidents(data.residents ?? []);
          setPasses(data.passes ?? []);
        }
      } catch {
        if (!controller.signal.aborted) setSearchError(true);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 280);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  function usePass(p: Pass) {
    setCode(p.code);
    setName(p.type === "guest" ? p.name : "");
    setPhone("");
    setVehicleNo("");
    setCompany(p.company ?? "");
    setType(p.type);
    setUnit({ id: p.unitId, number: p.unit });
    setHostName(p.name);
    setQuery("");
    setResidents([]);
    setPasses([]);
    setPurpose("Pre-approved visitor");
    setNotes(p.notes ?? "");
    setHoldParcel(p.leaveAtGate);
  }

  function selectResident(r: Resident) {
    if (code) reset();
    setUnit({ id: r.unitId, number: r.unit });
    setHostName(r.name);
    setQuery("");
    setResidents([]);
  }

  function reset() {
    setSuccess(null); setUnit(null); setHostName(""); setName(""); setPhone(""); setCompany(""); setPurpose(""); setVehicleNo(""); setCode(""); setNotes(""); setQuery(""); setType("guest"); setHoldParcel(false);
  }

  function changeHome() {
    if (code) {
      reset();
      return;
    }
    setUnit(null);
    setHostName("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!unit) return toast.error("Choose the resident's home first.");
    if (needsIdentity && !name.trim()) return toast.error("Enter the visitor's name.");
    setBusy(true);
    try {
      const res = await fetch("/api/gate/entry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, unitId: unit.id, name, phone, company, purpose, vehicleNo: type === "cab" ? vehicleNo : undefined, code: code || undefined, notes }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not log entry");
      setSuccess({ status: data.status, name: data.name, unit: data.unit });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log entry");
    } finally { setBusy(false); }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5 text-center sm:p-7">
        <span className={cn("mx-auto grid size-14 place-items-center rounded-full", success.status !== "pending" ? "bg-mint-50 text-mint-600" : "bg-amber-soft text-amber-ink")}>
          {success.status !== "pending" ? <CheckCircle2 className="size-7" /> : <Clock3 className="size-7" />}
        </span>
        <p className="mt-3 text-[17px] font-semibold text-ink">{success.status === "left_at_gate" ? "Parcel logged for pickup" : success.status === "entered" ? "Entry recorded" : "Approval request sent"}</p>
        <p className="mt-1 text-caption leading-relaxed text-muted">{success.status === "left_at_gate" ? `Keep the parcel for Home ${success.unit}. The resident can see the pickup code in Deliveries.` : success.status === "entered" ? `${success.name} is in. Welcome them in.` : `${success.name} is waiting for Home ${success.unit} to approve. You'll see the status in the queue.`}</p>
        <div className="mt-5 flex gap-2"><Button variant="outline" className="flex-1" onClick={reset}>Log another</Button><Button className="flex-1" onClick={() => { reset(); router.push("/gate#queue"); }}>View queue</Button></div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="resident-search" className="mb-1.5 block text-caption font-semibold text-ink-soft">Resident / home / passcode</label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input id="resident-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search A-402, Aarav, or paste a passcode…" className="h-11 pl-10" autoComplete="off" />
          {query ? <button type="button" aria-label="Clear resident search" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"><X className="size-4" /></button> : null}
          {query.trim().length >= 2 ? (
            <div className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
              {searching ? <div className="flex items-center gap-2 px-4 py-3 text-caption text-muted"><Loader2 className="size-4 animate-spin" /> Searching…</div> : null}
              {passes.map((p) => (
                <button key={p.id} type="button" onClick={() => usePass(p)} className="flex w-full items-center gap-2.5 border-b border-line/70 bg-mint-50/50 px-4 py-3 text-left hover:bg-mint-50">
                  <span className="grid size-8 place-items-center rounded-lg bg-mint-50 text-mint-600"><KeyRound className="size-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-caption font-semibold text-ink">Pass found · {p.name}</span><span className="block text-caption text-muted">{p.company ?? p.type.replace("_", " ")} · Home {p.unit} · {p.code}</span></span>
                  <span className="rounded-full bg-mint-600 px-2 py-1 text-caption font-bold text-white">Use pass</span>
                </button>
              ))}
              {residents.map((r) => (
                <button key={r.unitId + r.name} type="button" onClick={() => selectResident(r)} className="flex w-full items-center gap-2.5 border-b border-line/70 px-4 py-3 text-left last:border-0 hover:bg-[#fbfcff]">
                  <span className="grid size-8 place-items-center rounded-full text-caption font-bold text-white" style={{ background: r.color, color: avatarForeground(r.color) }}>{r.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
                  <span className="min-w-0 flex-1"><span className="block text-caption font-semibold text-ink">{r.name}</span><span className="block text-caption text-muted">Home {r.unit} · {r.role} · {r.phone}</span></span>
                  <Check className="size-4 text-brand-500" />
                </button>
              ))}
              {!searching && !residents.length && !passes.length ? <div role="status" className="px-4 py-3 text-caption text-muted">{searchError ? "Search failed. Clear the search and try again." : "No resident or pass found."}</div> : null}
            </div>
          ) : null}
        </div>
        {unit ? <div className="mt-2 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-3 py-2"><div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-brand-600" /><span className="text-caption font-semibold text-brand-800">Home {unit.number} · {hostName}</span>{code ? <span className="rounded-full bg-white px-2 py-0.5 font-mono text-caption font-bold text-brand-700">PASS {code}</span> : null}</div><button type="button" onClick={changeHome} className="text-caption font-semibold text-brand-600">Change</button></div> : null}
      </div>

      {!code ? (
        <>
          <div>
            <p className="mb-1.5 text-caption font-semibold text-ink-soft">Visitor type</p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {types.map((t) => <button key={t.v} type="button" aria-pressed={type === t.v} onClick={() => setType(t.v)} className={cn("flex flex-col items-center gap-1 rounded-xl border px-1 py-2", type === t.v ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-line bg-white hover:border-brand-200")}><t.i className={cn("size-4", type === t.v ? "text-brand-600" : "text-muted")} /><span className="text-caption font-semibold text-ink-soft">{t.l}</span></button>)}
            </div>
          </div>
          <a href="#staff" className="inline-flex min-h-11 items-center gap-1.5 text-caption font-semibold text-brand-700"><Users aria-hidden="true" className="size-4" /> Daily help check-in</a>
        </>
      ) : null}
      {code && (holdParcel || notes) ? (
        <div className="space-y-1 rounded-control border border-line bg-canvas p-3 text-body text-ink-soft">
          {holdParcel ? <p className="font-semibold text-ink">Keep this parcel at the gate for pickup.</p> : null}
          {notes ? <p className="break-words">Gate instructions: {notes}</p> : null}
        </div>
      ) : null}
      {needsIdentity ? (
        <>
          {code ? <p className="text-body font-medium text-ink">Record the visitor’s details before using the pass.</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="gate-visitor-name" className="mb-1 block text-caption font-semibold text-ink-soft">Visitor name <span className="text-blush-500">*</span></label><Input id="gate-visitor-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Yash Sharma" required className="h-10" /></div>
            <div><label htmlFor="gate-visitor-phone" className="mb-1 block text-caption font-semibold text-ink-soft">Phone number <span className="text-blush-500">*</span></label><Input id="gate-visitor-phone" type="tel" maxLength={30} required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" className="h-10" /></div>
            {type === "cab" ? (
              <div className="sm:col-span-2">
                <label htmlFor="gate-cab-registration" className="mb-1 block text-caption font-semibold text-ink-soft">Cab registration number <span className="text-blush-500">*</span></label>
                <Input id="gate-cab-registration" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} required maxLength={30} autoCapitalize="characters" placeholder="KA 01 AB 1234" className="h-10" />
              </div>
            ) : null}
          </div>
          {!code ? <details className="rounded-xl border border-line px-3">
            <summary className="cursor-pointer py-3 text-body font-medium text-ink-soft">Additional details <span className="font-normal text-muted">(optional)</span></summary>
            <div className="grid gap-3 pb-3 sm:grid-cols-2">
              <div><label htmlFor="gate-company" className="mb-1 block text-caption font-semibold text-ink-soft">{type === "cab" ? "Cab service" : "Company"}</label><Input id="gate-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={80} className="h-10" /></div>
              <div><label htmlFor="gate-purpose" className="mb-1 block text-caption font-semibold text-ink-soft">Purpose</label><Input id="gate-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={160} className="h-10" /></div>
              <div className="sm:col-span-2"><label htmlFor="gate-notes" className="mb-1 block text-caption font-semibold text-ink-soft">Notes for the log</label><Input id="gate-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} className="h-10" /></div>
            </div>
          </details> : null}
        </>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <p className="flex items-center gap-1.5 text-caption text-muted"><ShieldCheck className="size-4 text-mint-600" /> {code ? "Confirm the pass to record this arrival." : "The resident will receive an approval request."}</p>
        <Button type="submit" size="lg" disabled={busy || !unit} className="min-w-40">{busy ? <><Loader2 className="size-4 animate-spin" /> Logging…</> : <><UserRoundCheck className="size-4" /> {code ? holdParcel ? "Verify and log parcel" : "Verify pass and admit" : "Request approval"}</>}</Button>
      </div>
    </form>
  );
}

type QueueItem = { id: string; name: string; company: string | null; type: string; unit: string | null; status: string; hostName: string | null; hostPhone: string | null; photoColor: string | null; createdAt: string | Date; leaveAtGate: boolean };

export function GateQueue({ initial }: { initial: QueueItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date>(new Date());

  async function load() {
    try {
      const res = await fetch("/api/gate/queue", { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setItems(d.items ?? []); setUpdated(new Date()); }
    } catch {
      // Keep the last successful queue visible while the network recovers.
    }
  }
  useEffect(() => { const t = setInterval(load, 12000); return () => clearInterval(t); }, []);
  async function enter(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/gate/visitors/${id}/entry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Entry recorded");
      await load();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record entry.");
    } finally {
      setBusy(null);
    }
  }
  const pending = items.filter((i) => i.status === "pending");
  const approved = items.filter((i) => i.status === "approved" && !i.leaveAtGate);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between"><span className="text-caption text-muted">Updates every 12s · {updated.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}</span><button onClick={load} className="text-caption font-semibold text-brand-600">Refresh</button></div>
      {approved.length ? <div className="mb-3 space-y-2">{approved.map((v) => <div key={v.id} className="flex items-center gap-2.5 rounded-xl border border-mint-600/20 bg-mint-50/50 px-3 py-2.5"><span className="grid size-8 place-items-center rounded-full bg-white text-caption font-bold text-mint-600">{v.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span><div className="min-w-0 flex-1"><p className="text-caption font-semibold text-ink">{v.name}</p><p className="text-caption text-muted">{v.company ?? v.type.replace("_", " ")} · Home {v.unit}</p></div><button onClick={() => enter(v.id)} disabled={busy === v.id} className="rounded-full bg-mint-600 px-2.5 py-1.5 text-caption font-bold text-white disabled:opacity-50">{busy === v.id ? "…" : "Record entry"}</button></div>)}</div> : null}
      {pending.length ? <div className="space-y-2">{pending.map((v) => <div key={v.id} className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5"><span className="mt-0.5 grid size-8 place-items-center rounded-full bg-amber-soft text-caption font-bold text-amber-ink">{v.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span><div className="min-w-0 flex-1"><p className="text-caption font-semibold text-ink">{v.name}</p><p className="text-caption text-muted">{v.company ?? v.type.replace("_", " ")} · Home {v.unit} · {new Date(v.createdAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}</p></div><div className="flex flex-col items-end gap-1"><span className="rounded-full bg-amber-soft px-1.5 py-0.5 text-caption font-bold text-amber-ink">Awaiting</span>{v.hostPhone ? <a href={`tel:${v.hostPhone}`} className="text-caption font-semibold text-brand-600">Call resident</a> : null}</div></div>)}</div> : null}
      {!pending.length && !approved.length ? <div className="rounded-xl border border-dashed border-line bg-[#fbfcff] px-4 py-8 text-center"><CheckCircle2 className="mx-auto size-5 text-mint-600" /><p className="mt-1.5 text-caption font-semibold text-ink">Queue is clear</p><p className="text-caption text-muted">New requests will appear here.</p></div> : null}
    </div>
  );
}

export function GateStaff({ people, attendance }: { people: { id: string; name: string; role: string; kind: string; photoColor: string | null; unit: string | null; policeVerified: boolean }[]; attendance: Record<string, { in: boolean; out: boolean }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [matches, setMatches] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [limit, setLimit] = useState(8);
  const visible = matches ? people.filter((person) => matches.includes(person.id)) : people.slice(0, limit);

  async function findByPhone(event: React.FormEvent) {
    event.preventDefault();
    setLookingUp(true);
    setError("");
    try {
      const res = await fetch("/api/gate/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lookup", phone }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatches(data.ids);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not look up this number.");
    } finally {
      setLookingUp(false);
    }
  }

  async function mark(id: string, action: "in" | "out") {
    setBusy(id);
    try {
      const res = await fetch("/api/gate/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staffId: id, action }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === "in" ? "Check-in recorded" : "Check-out recorded");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not mark attendance");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={findByPhone} className="mb-3 space-y-1.5">
        <label htmlFor="daily-help-phone" className="text-body font-medium text-ink">Daily help phone number</label>
        <div className="flex flex-wrap items-center gap-2">
          <Input id="daily-help-phone" type="tel" required maxLength={30} value={phone} disabled={lookingUp} onChange={(e) => { setPhone(e.target.value); setMatches(null); setError(""); }} placeholder="Number given at the gate" className="min-w-0 flex-1" />
          <Button type="submit" variant="outline" disabled={lookingUp}>{lookingUp ? "Finding…" : "Find"}</Button>
        </div>
        {error ? <p role="alert" className="text-caption text-[#b83244]">{error}</p> : null}
        {matches ? <div className="flex flex-wrap items-center justify-between gap-x-2"><p role="status" className="text-caption text-muted">{visible.length ? `${visible.length} matching registration${visible.length === 1 ? "" : "s"}` : "No active registration found. Ask the household to register this number."}</p><button type="button" className="min-h-11 text-caption font-semibold text-brand-700" onClick={() => { setPhone(""); setMatches(null); }}>Clear search</button></div> : null}
      </form>
      {visible.map((person) => {
        const a = attendance[person.id];
        const needsVerification = person.kind === "daily_help" && !person.policeVerified;
        return (
          <div key={person.id} className="flex flex-wrap items-center gap-2 rounded-control border border-line px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full text-caption font-bold" style={{ background: person.photoColor ?? "#3155d8", color: avatarForeground(person.photoColor ?? "#3155d8") }}>{person.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-body font-semibold text-ink">{person.name}</p>
              <p className="text-caption text-muted">{person.role}{person.unit ? ` · Home ${person.unit}` : ""}</p>
              {person.kind === "daily_help" ? <p className={cn("mt-0.5 text-caption font-medium", needsVerification ? "text-amber-ink" : "text-mint-600")}>{needsVerification ? "Verification pending" : "Verified"}</p> : null}
            </div>
            {a?.out ? <span className="text-caption font-medium text-muted">Checked out</span> : a?.in ? (
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => mark(person.id, "out")}>Check out</Button>
            ) : !needsVerification ? (
              <Button size="sm" disabled={busy !== null} onClick={() => mark(person.id, "in")}>Check in</Button>
            ) : null}
          </div>
        );
      })}
      {!matches && people.length > limit ? <Button type="button" variant="outline" className="w-full" onClick={() => setLimit(limit + 8)}>Show more staff</Button> : null}
      {!matches && !people.length ? <p className="py-4 text-center text-caption text-muted">No staff on record.</p> : null}
    </div>
  );
}

export function GatePatrol({ checkpoints, scannedIds }: { checkpoints: { id: string; name: string; location: string }[]; scannedIds: string[] }) {
  const router = useRouter();
  const [scanned, setScanned] = useState(new Set(scannedIds));
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { setScanned(new Set(scannedIds)); }, [scannedIds]);
  async function scan(id: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/gate/patrol", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkpointId: id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not record patrol");
      setScanned((prev) => new Set(prev).add(id));
      toast.success("Checkpoint scanned");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record patrol");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-2">
      {checkpoints.map((c) => {
        const done = scanned.has(c.id);
        return <div key={c.id} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2"><span className={`grid size-6 place-items-center rounded-full ${done ? "bg-mint-50 text-mint-600" : "bg-canvas text-muted"}`}>{done ? <Check className="size-4" /> : <MapPin className="size-4" />}</span><div className="min-w-0 flex-1"><p className="text-caption font-semibold text-ink">{c.name}</p><p className="text-caption text-muted">{c.location}</p></div>{done ? <span className="text-caption font-semibold text-mint-600">Scanned</span> : <button onClick={() => scan(c.id)} disabled={busy === c.id} className="rounded-full bg-brand-50 px-2 py-1 text-caption font-semibold text-brand-700">{busy === c.id ? "…" : "Scan"}</button>}</div>;
      })}
    </div>
  );
}

export function GateDeliveries({ deliveries }: { deliveries: { id: string; company: string; courierName: string | null; unit: string | null; status: string; otp: string | null; createdAt: string }[] }) {
  const router = useRouter();
  const [items, setItems] = useState(deliveries);
  const [active, setActive] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setItems(deliveries); }, [deliveries]);
  async function deliver(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/gate/deliveries/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ otp, action: "deliver" }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not verify");
      toast.success("Parcel handed over");
      setItems((prev) => prev.filter((p) => p.id !== id));
      setActive(null);
      setOtp("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      {items.map((d) => <div key={d.id} className="rounded-xl border border-line bg-white px-3 py-2"><div className="flex items-center justify-between"><div><p className="text-caption font-semibold text-ink">{d.company} <span className="font-normal text-muted">· Home {d.unit}</span></p><p className="text-caption text-muted">{d.courierName} · {d.status === "left_at_gate" ? "Kept at gate" : "At gate"}</p></div>{active === d.id ? null : d.status === "left_at_gate" ? <button onClick={() => { setActive(d.id); setOtp(""); }} className="rounded-full bg-brand-50 px-2 py-1 text-caption font-semibold text-brand-700">Hand over</button> : <span className="text-caption text-muted">Awaiting approval</span>}</div>{active === d.id ? <div className="mt-2 flex gap-1.5"><input aria-label="Delivery pickup code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Pickup code" className="h-11 min-w-0 flex-1 rounded-lg border border-line px-2 font-mono text-caption tracking-widest" /><button onClick={() => deliver(d.id)} disabled={busy || otp.length < 4} className="rounded-lg bg-mint-600 px-2.5 text-caption font-bold text-white disabled:opacity-50">{busy ? "…" : "Verify"}</button><button onClick={() => setActive(null)} className="rounded-lg bg-canvas px-2 text-caption text-muted">Cancel</button></div> : null}</div>)}
      {!items.length ? <p className="py-4 text-center text-caption text-muted">No deliveries waiting.</p> : null}
    </div>
  );
}

export function GatePanic({ alerts }: { alerts: { id: string; message: string; unit: string | null; user: string | null; status: string; createdAt: string }[] }) {
  const router = useRouter();
  const [items, setItems] = useState(alerts);
  useEffect(() => { setItems(alerts); }, [alerts]);
  async function act(id: string, action: "acknowledge" | "resolve") {
    const res = await fetch("/api/gate/panic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (!res.ok) return toast.error("Could not update alert");
    if (action === "resolve") setItems((prev) => prev.filter((a) => a.id !== id)); else setItems((prev) => prev.map((a) => a.id === id ? { ...a, status: "acknowledged" } : a));
    toast.success(action === "resolve" ? "Alert resolved" : "Alert acknowledged");
    router.refresh();
  }
  if (!items.length) return <div className="rounded-xl border border-dashed border-line bg-white px-3 py-5 text-center"><ShieldCheck className="mx-auto size-5 text-mint-600" /><p className="mt-1 text-caption font-semibold text-ink">No active alerts</p><p className="text-caption text-muted">All calm at the gate.</p></div>;
  return <div className="space-y-2">{items.map((a) => <div key={a.id} className="rounded-xl border border-[#f0c7cc] bg-[#fdf1f3] px-3 py-2.5"><p className="text-caption font-bold text-[#a82f3e]">PANIC · Home {a.unit} · {a.user}</p><p className="text-caption text-[#9e4a55]">{a.message}</p><div className="mt-1.5 flex gap-1.5">{a.status === "open" ? <button onClick={() => act(a.id, "acknowledge")} className="rounded-full bg-white px-2 py-1 text-caption font-bold text-[#a82f3e]">Acknowledge</button> : null}<button onClick={() => act(a.id, "resolve")} className="rounded-full bg-[#d94a5a] px-2 py-1 text-caption font-bold text-white">Resolve</button></div></div>)}</div>;
}

export function GateExitButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button onClick={async () => { setBusy(true); try { const res = await fetch(`/api/gate/visitors/${id}/exit`, { method: "POST" }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error ?? "Could not record exit"); toast.success("Exit recorded"); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not record exit"); } finally { setBusy(false); } }} disabled={busy} className="rounded-full bg-canvas px-2 py-1 text-caption font-semibold text-ink-soft">{busy ? "…" : "Record exit"}</button>;
}

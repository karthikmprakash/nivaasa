"use client";

import { useState } from "react";
import { Building2, Check, ChevronDown, Plus, Search } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Platform = { name: string; logo: string; category: string };
const delivery: Platform[] = [
  { name: "Swiggy", logo: "swiggy.svg", category: "Food" },
  { name: "Zomato", logo: "zomato.png", category: "Food" },
  { name: "Instamart", logo: "instamart.png", category: "Groceries" },
  { name: "Blinkit", logo: "blinkit.png", category: "Groceries" },
  { name: "Zepto", logo: "zepto.svg", category: "Groceries" },
  { name: "bigbasket", logo: "bigbasket.png", category: "Groceries" },
  { name: "Amazon", logo: "amazon.ico", category: "Shopping" },
  { name: "Flipkart", logo: "flipkart.png", category: "Shopping" },
  { name: "Meesho", logo: "meesho.ico", category: "Shopping" },
  { name: "Myntra", logo: "myntra.png", category: "Shopping" },
  { name: "Delhivery", logo: "delhivery.png", category: "Courier" },
  { name: "Blue Dart", logo: "bluedart.png", category: "Courier" },
  { name: "DTDC", logo: "dtdc.png", category: "Courier" },
];
const cabs: Platform[] = [
  { name: "Uber", logo: "uber.svg", category: "Cab & auto" },
  { name: "Ola", logo: "ola.png", category: "Cab & auto" },
  { name: "Rapido", logo: "rapido.png", category: "Cab & auto" },
  { name: "Namma Yatri", logo: "nammayatri.svg", category: "Cab & auto" },
];

function Logo({ platform }: { platform?: Platform }) {
  return <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white p-1.5">
    {platform ? <img src={`/platforms/${platform.logo}`} alt="" width={28} height={28} className="size-full object-contain" /> : <Building2 className="size-5 text-muted" />}
  </span>;
}

export function PlatformPicker({ type, value, onChange }: { type: "delivery" | "cab"; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");
  const [adding, setAdding] = useState(false);
  const platforms = type === "delivery" ? delivery : cabs;
  const selected = platforms.find((p) => p.name === value);
  const filtered = platforms.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  function choose(name: string) { onChange(name); setOpen(false); }
  return <>
    <input type="hidden" name="company" value={value} />
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next) { setQuery(""); setAdding(false); setCustom(selected ? "" : value); }
    }} title={type === "delivery" ? "Choose delivery platform" : "Choose cab service"}
      description="Choose a provider or add another by name."
      trigger={<button id="companyChoice" type="button" className="flex min-h-12 w-full min-w-0 items-center gap-2.5 rounded-control border border-line-strong bg-white px-3 py-2 text-left text-body text-ink hover:border-brand-400">
        {value ? <Logo platform={selected} /> : <Building2 aria-hidden="true" className="size-5 shrink-0 text-muted" />}
        <span className="min-w-0 flex-1 break-words">{value || "Select platform (optional)"}</span><ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted" />
      </button>}>
      <label className="flex h-11 items-center gap-2 rounded-control border border-line-strong px-3">
        <Search aria-hidden="true" className="size-4 shrink-0 text-muted" />
        <input autoFocus type="search" aria-label="Search platforms" placeholder="Search name or category" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 w-full bg-transparent text-base outline-none" />
      </label>
      <div className="mt-3">
        {adding ? <div className="space-y-3">
          <label htmlFor="custom-platform" className="block text-body font-semibold text-ink">Platform or company name</label>
          <input id="custom-platform" autoFocus maxLength={100} value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (custom.trim()) choose(custom.trim()); } }} placeholder="e.g. Local grocery store" className="h-11 w-full rounded-control border border-line-strong px-3 text-base" />
          <Button type="button" disabled={!custom.trim()} onClick={() => choose(custom.trim())} className="w-full">Use this platform</Button>
        </div> : <Button type="button" variant="outline" onClick={() => { setCustom(query || (selected ? "" : value)); setAdding(true); }} className="w-full"><Plus aria-hidden="true" className="size-4" />Add another platform</Button>}
        {value ? <button type="button" onClick={() => choose("")} className="mt-3 min-h-10 w-full text-body font-medium text-muted hover:text-ink">Clear selection</button> : null}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2" aria-label="Platforms">
        {filtered.map((platform) => <button key={platform.name} type="button" aria-pressed={value === platform.name} onClick={() => choose(platform.name)} className={cn("flex min-h-16 min-w-0 items-center gap-2.5 rounded-control border p-2.5 text-left hover:border-brand-400 hover:bg-brand-50/50", value === platform.name ? "border-brand-600 bg-brand-50" : "border-line bg-white")}>
          <Logo platform={platform} /><span className="min-w-0 flex-1"><span className="block break-words text-body font-semibold text-ink">{platform.name}</span><span className="block text-caption text-muted">{platform.category}</span></span>
          {value === platform.name ? <Check aria-hidden="true" className="size-4 shrink-0 text-brand-600" /> : null}
        </button>)}
      </div>
      {!filtered.length ? <p className="mt-3 text-body text-muted">No matching platforms. Add the name below.</p> : null}

    </Dialog>
  </>;
}

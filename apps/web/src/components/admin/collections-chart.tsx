"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { month: string; collected: number; expenses: number };

function fmt(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${Math.round(v / 1000)}k`;
  return `₹${v}`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 shadow-lg">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      {payload.map((p) => <div key={p.name} className="mt-1 flex items-center gap-2"><span className="size-1.5 rounded-full" style={{ background: p.color }} /><span className="text-[10px] capitalize text-ink-soft">{p.name}</span><span className="ml-auto text-[10px] font-semibold text-ink">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(p.value)}</span></div>)}
    </div>
  );
}

export function CollectionsChart({ data }: { data: Point[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="collected" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3155d8" stopOpacity={0.28} /><stop offset="100%" stopColor="#3155d8" stopOpacity={0.02} /></linearGradient>
            <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef7fa4" stopOpacity={0.22} /><stop offset="100%" stopColor="#ef7fa4" stopOpacity={0.02} /></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eef1f8" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#7b859b" }} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: "#a2aabc" }} tickFormatter={(v) => fmt(Number(v))} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="collected" name="collected" stroke="#3155d8" strokeWidth={2} fill="url(#collected)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
          <Area type="monotone" dataKey="expenses" name="expenses" stroke="#ef7fa4" strokeWidth={2} fill="url(#expenses)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

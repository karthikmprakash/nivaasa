"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { Building2, Check, ChevronDown, House, Loader2 } from "lucide-react";
import { Dropdown, DropdownItem, DropdownLabel } from "@/components/ui/client";
import { switchSocietyAction } from "@/lib/actions/societies";
import { stableSwitchPath, type SocietyOption } from "@/lib/society-access";
import { cn } from "@/lib/utils";

type SocietySwitcherProps = {
  societies: SocietyOption[];
  currentId: string;
  context?: string;
  variant?: "sidebar" | "header";
};

export function SocietySwitcher({ societies = [], currentId = "", context, variant = "sidebar" }: SocietySwitcherProps) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const current = societies.find((s) => s.id === currentId) ?? societies[0];
  if (!current) return null;

  const canSwitch = societies.length > 1;

  function selectSociety(society: SocietyOption) {
    if (society.id === current.id || pending) return;
    startTransition(() => {
      void switchSocietyAction(society.slug, stableSwitchPath(pathname));
    });
  }

  if (variant === "header") {
    if (!canSwitch) {
      return (
        <span className="inline-flex min-w-0 items-center gap-1.5 text-caption text-muted">
          <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{current.name}{current.city ? ` · ${current.city}` : ""}</span>
        </span>
      );
    }
    return (
      <Dropdown
        align="start"
        className="w-72"
        trigger={
          <button type="button" aria-label="Switch society" className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg px-1.5 text-caption text-muted hover:bg-canvas hover:text-ink">
            <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate font-medium">{current.name}</span>
            {pending ? <Loader2 aria-hidden="true" className="size-3.5 shrink-0 animate-spin" /> : <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />}
          </button>
        }
      >
        <SocietyMenu societies={societies} currentId={current.id} pending={pending} onSelect={selectSociety} />
      </Dropdown>
    );
  }

  if (!canSwitch) {
    return (
      <div className="mx-4 mb-5 flex items-center gap-3 rounded-xl border border-line bg-canvas/65 p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white"><House aria-hidden="true" className="size-[18px] text-ink-soft" /></span>
        <div className="min-w-0"><p className="line-clamp-2 text-body font-semibold leading-tight text-ink">{current.name}</p><p className="mt-0.5 truncate text-caption text-muted">{context}</p></div>
      </div>
    );
  }

  return (
    <Dropdown
      align="start"
      className="w-72"
      trigger={
        <button type="button" aria-label="Switch society" className="mx-4 mb-5 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-line bg-canvas/65 p-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/50">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white"><House aria-hidden="true" className="size-[18px] text-ink-soft" /></span>
          <span className="min-w-0 flex-1"><span className="line-clamp-2 text-body font-semibold leading-tight text-ink">{current.name}</span><span className="mt-0.5 block truncate text-caption text-muted">{context}</span></span>
          {pending ? <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted" /> : <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted" />}
        </button>
      }
    >
      <SocietyMenu societies={societies} currentId={current.id} pending={pending} onSelect={selectSociety} />
    </Dropdown>
  );
}

function SocietyMenu({ societies, currentId, pending, onSelect }: { societies: SocietyOption[]; currentId: string; pending: boolean; onSelect: (society: SocietyOption) => void }) {
  return (
    <>
      <DropdownLabel>Switch society</DropdownLabel>
      <p className="px-3 pb-2 text-caption text-muted">You belong to {societies.length} communities.</p>
      {societies.map((society) => {
        const active = society.id === currentId;
        return (
          <DropdownItem key={society.id} onClick={() => onSelect(society)} className={cn(active && "bg-brand-50/70")}>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-canvas text-ink-soft"><Building2 aria-hidden="true" className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-semibold text-ink">{society.name}</span>
              <span className="block truncate text-caption text-muted">
                {[society.city, society.unitNumber ? `Home ${society.unitNumber}` : null, society.role.replaceAll("_", " ")].filter(Boolean).join(" · ")}
              </span>
            </span>
            {active ? <Check aria-label="Current society" className="size-4 shrink-0 text-brand-600" /> : pending ? <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted" /> : null}
          </DropdownItem>
        );
      })}
    </>
  );
}

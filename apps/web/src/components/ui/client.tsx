"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { Button, buttonClass, type ButtonProps } from "./primitives";

export function SubmitButton({ children, pendingText, className, variant, size, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant} size={size} {...props}>
      {pending ? (
        <>
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText ?? "Working…"}
        </>
      ) : children}
    </Button>
  );
}

export function Dialog({ open, onOpenChange, trigger, children, title, description, footer, className, contentClassName }: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  trigger?: React.ReactNode;
  children: React.ReactNode;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0d1524]/45 backdrop-blur-[3px] data-[state=open]:animate-fade" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-white/60 bg-white shadow-[0_40px_100px_-30px_rgba(13,21,36,0.5)] fine-scroll data-[state=open]:animate-in-up",
            className,
          )}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line/80 bg-white/95 px-6 py-5 backdrop-blur">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold tracking-[-0.02em] text-ink">{title}</DialogPrimitive.Title>
              {description ? <DialogPrimitive.Description className="mt-1 text-[13px] leading-relaxed text-muted">{description}</DialogPrimitive.Description> : null}
            </div>
            <DialogPrimitive.Close className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <div className={cn("px-6 py-5", contentClassName)}>{children}</div>
          {footer ? <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-white/95 px-6 py-4 backdrop-blur">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Sheet({ open, onOpenChange, children, side = "right", className }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode; side?: "right" | "bottom" | "left"; className?: string }) {
  const sides = {
    right: "inset-y-0 right-0 h-full w-[min(92vw,420px)] border-l rounded-l-[24px]",
    left: "inset-y-0 left-0 h-full w-[min(92vw,320px)] border-r rounded-r-[24px]",
    bottom: "inset-x-0 bottom-0 max-h-[88dvh] w-full rounded-t-[24px] border-t overflow-y-auto",
  };
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0d1524]/45 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className={cn("fixed z-50 bg-white p-0 shadow-2xl data-[state=open]:animate-in-up fine-scroll", sides[side], className)}>
          <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Dropdown({ trigger, children, align = "end", className }: { trigger: React.ReactNode; children: React.ReactNode; align?: "start" | "center" | "end"; className?: string }) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content align={align} sideOffset={6} className={cn("z-50 min-w-48 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_20px_60px_-20px_rgba(19,26,42,0.35)]", className)}>
          {children}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

export function DropdownItem({ children, onClick, className, destructive }: { children: React.ReactNode; onClick?: () => void; className?: string; destructive?: boolean }) {
  return (
    <DropdownPrimitive.Item
      onSelect={(e) => { e.preventDefault(); onClick?.(); }}
      className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-ink-soft outline-none transition-colors focus:bg-canvas focus:text-ink", destructive && "text-[#c43d4d] focus:bg-[#fdeced] focus:text-[#c43d4d]", className)}
    >
      {children}
    </DropdownPrimitive.Item>
  );
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <DropdownPrimitive.Label className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{children}</DropdownPrimitive.Label>;
}

export function DropdownSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-line" />;
}

export function Tabs({ defaultValue, tabs, className }: { defaultValue: string; tabs: { value: string; label: React.ReactNode; content: React.ReactNode; count?: number }[]; className?: string }) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue} className={className}>
      <TabsPrimitive.List className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1">
        {tabs.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold text-ink-soft transition-colors data-[state=active]:bg-brand-600 data-[state=active]:text-white hover:text-ink data-[state=active]:hover:text-white"
          >
            {t.label}
            {t.count !== undefined ? <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] data-[state=active]:bg-white/20">{t.count}</span> : null}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((t) => <TabsPrimitive.Content key={t.value} value={t.value} className="mt-5 outline-none">{t.content}</TabsPrimitive.Content>)}
    </TabsPrimitive.Root>
  );
}

export function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root delayDuration={250}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content sideOffset={6} className="z-50 rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg">
            {label}
            <TooltipPrimitive.Arrow className="fill-ink" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export function PopoverLike({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-line bg-white p-3 shadow-lift", className)}>{children}</div>;
}

export function Toaster() {
  return null;
}

export function LinkButton({ href, children, variant = "primary", size = "md", className }: { href: string; children: React.ReactNode; variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; className?: string }) {
  return <a href={href} className={cn(buttonClass(variant, size), className)}>{children}</a>;
}

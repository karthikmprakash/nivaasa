"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The ink reveal, loaded only when it scrolls into view.
 * Falls back to the static mark for reduced-motion users.
 */
export function MarkReveal({
  size = 180,
  className,
  variant = "ink",
}: {
  size?: number;
  className?: string;
  variant?: "ink" | "blue";
}) {
  const ref = useRef<HTMLImageElement>(null);
  const poster = variant === "blue" ? "/brand/nivaasa-blue-mark-poster.png" : "/brand/nivaasa-mark-poster.png";
  const animation = variant === "blue" ? "/brand/nivaasa-blue-mark-write.webp" : "/brand/nivaasa-mark-write.webp";
  const [src, setSrc] = useState(poster);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    let played = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (played || !entries.some((entry) => entry.isIntersecting)) return;
        played = true;
        setSrc(`${animation}?play=${Date.now()}`);
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <img
      ref={ref}
      src={src}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={cn("select-none", className)}
    />
  );
}

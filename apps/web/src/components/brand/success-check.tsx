"use client";

import { useEffect, useState } from "react";

/**
 * The success check, with a still frame first so nothing flashes.
 */
export function SuccessCheck({ size = 40, className }: { size?: number; className?: string }) {
  const [src, setSrc] = useState("/brand/nivaasa-success-poster.png");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setSrc(`/brand/nivaasa-success-check.webp?play=${Date.now()}`), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={className}
    />
  );
}

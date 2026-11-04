"use client";

import { useEffect, useRef } from "react";

export function NoticeViewTracker({ id }: { id: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch(`/api/notices/${id}/view`, { method: "POST" }).catch(() => null);
  }, [id]);
  return null;
}

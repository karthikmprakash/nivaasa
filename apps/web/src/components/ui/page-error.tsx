"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "./primitives";

export default function PageError({ retry }: { error: unknown; retry: () => void }) {
  return <div role="alert" className="mx-auto mt-8 max-w-xl rounded-panel border border-line bg-white p-6 sm:p-8">
    <h1 className="text-xl font-semibold">This page couldn’t be loaded</h1>
    <p className="mt-3 text-body leading-relaxed text-muted">Please try again. You can also use the menu to open another part of your community.</p>
    <Button onClick={() => retry()} className="mt-5"><RefreshCw className="size-4" /> Try again</Button>
  </div>;
}

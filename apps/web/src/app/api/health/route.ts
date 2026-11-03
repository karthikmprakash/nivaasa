import { sqlite } from "@/db";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    sqlite.prepare("select 1").get();
    return Response.json(
      { ok: true, service: "nivaasa", time: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ ok: false, service: "nivaasa" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

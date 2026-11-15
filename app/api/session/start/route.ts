import { NextResponse } from "next/server";
import { startSession } from "@/lib/actions";
import { hostGuard } from "@/lib/guard";
import { back } from "@/lib/redirect";

export async function POST(req: Request) {
  const g = await hostGuard(req, "/host");
  if (g instanceof NextResponse) return g;

  const form = await req.formData();
  const res = startSession(
    g.user.id,
    Number(form.get("studio")),
    String(form.get("slot") ?? ""),
  );
  if (!res.ok) return back(req, "/host", "err", res.err);
  return back(req, "/host", "msg", "Sesi live dimulai. Selamat siaran!");
}

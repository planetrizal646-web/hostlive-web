import { NextResponse } from "next/server";
import { stopSession } from "@/lib/actions";
import { hostGuard } from "@/lib/guard";
import { back } from "@/lib/redirect";

export async function POST(req: Request) {
  const g = await hostGuard(req, "/host");
  if (g instanceof NextResponse) return g;

  const form = await req.formData();
  const res = stopSession(g.user.id, Number(form.get("id")));
  if (!res.ok) return back(req, "/host", "err", res.err);
  return back(
    req,
    "/host",
    "msg",
    res.cover
      ? "Backup selesai. Host utama kembali live."
      : "Live dihentikan. Isi hasil sesi untuk menyelesaikan.",
  );
}

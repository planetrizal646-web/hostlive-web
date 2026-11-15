import { NextResponse } from "next/server";
import { finishSession } from "@/lib/actions";
import { hostGuard } from "@/lib/guard";
import { back } from "@/lib/redirect";

export async function POST(req: Request) {
  const g = await hostGuard(req, "/host");
  if (g instanceof NextResponse) return g;

  const form = await req.formData();
  const res = finishSession(g.user.id, Number(form.get("id")), {
    viewers: form.get("viewers"),
    gmv: form.get("gmv"),
    commission: form.get("commission"),
    closings: form.get("closings"),
  });
  if (!res.ok) return back(req, "/host", "err", res.err);
  return back(req, "/host", "msg", "Hasil tersimpan. Sesi selesai dan masuk riwayat.");
}

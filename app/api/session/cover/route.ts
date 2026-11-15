import { NextResponse } from "next/server";
import { startCover } from "@/lib/actions";
import { hostGuard } from "@/lib/guard";
import { back } from "@/lib/redirect";

export async function POST(req: Request) {
  const g = await hostGuard(req, "/host");
  if (g instanceof NextResponse) return g;

  const form = await req.formData();
  const res = startCover(g.user.id, Number(form.get("cover")));
  if (!res.ok) return back(req, "/host", "err", res.err);
  return back(req, "/host", "msg", "Backup dimulai. Selesaikan backup saat host utama kembali.");
}

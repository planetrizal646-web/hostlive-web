import { NextResponse } from "next/server";
import { verifySessions } from "@/lib/actions";
import { adminGuard } from "@/lib/guard";
import { back } from "@/lib/redirect";

export async function POST(req: Request) {
  const g = await adminGuard(req, "/dashboard");
  if (g instanceof NextResponse) return g;

  const form = await req.formData();
  const next = String(form.get("next") ?? "/dashboard/sessions");
  const ids = form.getAll("id[]").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) return back(req, next, "err", "Pilih minimal satu sesi selesai untuk diverifikasi.");

  const n = verifySessions(ids);
  return back(req, next, "msg", `${n} sesi ditandai terverifikasi.`);
}

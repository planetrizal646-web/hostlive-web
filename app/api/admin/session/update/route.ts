import { NextResponse } from "next/server";
import { updateSessionByAdmin } from "@/lib/actions";
import { adminGuard } from "@/lib/guard";
import { back } from "@/lib/redirect";

export async function POST(req: Request) {
  const g = await adminGuard(req, "/dashboard");
  if (g instanceof NextResponse) return g;

  const form = await req.formData();
  const id = Number(form.get("id"));
  const res = updateSessionByAdmin(id, {
    viewers: form.get("viewers"),
    gmv: form.get("gmv"),
    commission: form.get("commission"),
    closings: form.get("closings"),
    note: form.get("note"),
    verified: form.get("verified"),
  });
  if (!res.ok) return back(req, `/dashboard/sessions/${id}`, "err", res.err);
  return back(req, `/dashboard/sessions/${id}`, "msg", "Hasil sesi disimpan.");
}

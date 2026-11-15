import { NextResponse } from "next/server";
import { updateProfile } from "@/lib/accounts";
import { hostGuard } from "@/lib/guard";
import { back } from "@/lib/redirect";

export async function POST(req: Request) {
  const g = await hostGuard(req, "/host");
  if (g instanceof NextResponse) return g;

  const form = await req.formData();
  const res = updateProfile(g.user, String(form.get("name") ?? ""), String(form.get("email") ?? ""));
  if (!res.ok) return back(req, "/host/profil", "err", res.err);
  return back(req, "/host/profil", "msg", "Profil diperbarui.");
}

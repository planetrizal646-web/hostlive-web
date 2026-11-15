import { NextResponse } from "next/server";
import { changePassword } from "@/lib/accounts";
import { hostGuard } from "@/lib/guard";
import { back } from "@/lib/redirect";

export async function POST(req: Request) {
  const g = await hostGuard(req, "/host");
  if (g instanceof NextResponse) return g;

  const form = await req.formData();
  const res = changePassword(
    g.user,
    g.token,
    String(form.get("current") ?? ""),
    String(form.get("next") ?? ""),
    String(form.get("confirm") ?? ""),
  );
  if (!res.ok) return back(req, "/host/profil", "err", res.err);
  return back(req, "/host/profil", "msg", "Password diganti. Perangkat lain telah keluar.");
}

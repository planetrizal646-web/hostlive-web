import { NextResponse } from "next/server";
import { createHost } from "@/lib/accounts";
import { adminGuard } from "@/lib/guard";
import { back } from "@/lib/redirect";

export async function POST(req: Request) {
  const g = await adminGuard(req, "/dashboard");
  if (g instanceof NextResponse) return g;

  const form = await req.formData();
  const res = createHost(
    String(form.get("name") ?? ""),
    String(form.get("email") ?? ""),
    String(form.get("password") ?? ""),
  );
  if (!res.ok) return back(req, "/dashboard/hosts", "err", res.err);
  return back(req, "/dashboard/hosts", "msg", "Host baru ditambahkan.");
}

import { NextResponse } from "next/server";
import { deleteHost, toggleHost, updateHost } from "@/lib/accounts";
import { adminGuard } from "@/lib/guard";
import { back } from "@/lib/redirect";
import { userById } from "@/lib/queries";

export async function POST(req: Request) {
  const g = await adminGuard(req, "/dashboard");
  if (g instanceof NextResponse) return g;

  const form = await req.formData();
  const id = Number(form.get("id"));
  const action = String(form.get("action") ?? "update");
  const target = userById(id) ? `/dashboard/hosts/${id}` : "/dashboard/hosts";

  if (action === "toggle") {
    const res = toggleHost(id);
    if (!res.ok) return back(req, target, "err", res.err);
    return back(req, "/dashboard/hosts", "msg", "Status host diperbarui.");
  }

  if (action === "delete") {
    const name = userById(id)?.name ?? "Host";
    const res = deleteHost(id);
    if (!res.ok) return back(req, "/dashboard/hosts", "err", res.err);
    return back(
      req,
      "/dashboard/hosts",
      "msg",
      res.archived
        ? `${name} diarsipkan. Riwayat sesinya tetap ada di laporan.`
        : `${name} dihapus.`,
    );
  }

  const password = String(form.get("password") ?? "");
  const res = updateHost(id, {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    active: form.get("active") ? 1 : 0,
    ...(password ? { password } : {}),
  });
  if (!res.ok) return back(req, target, "err", res.err);
  return back(req, target, "msg", "Akun host diperbarui.");
}

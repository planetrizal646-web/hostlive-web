import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/guard";
import { perHostReport } from "@/lib/queries";
import { isValidMonth, jakartaMonth } from "@/lib/time";

function cell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const g = await adminGuard(req, "/dashboard/reports");
  if (g instanceof NextResponse) return g;

  const param = new URL(req.url).searchParams.get("bulan");
  const month = param && isValidMonth(param) ? param : jakartaMonth();
  const rows = perHostReport(month);

  const lines = ["Host,Email,Sesi,Durasi live (menit),Viewers,GMV,Estimasi komisi,Closing"];
  for (const r of rows) {
    lines.push(
      [r.name, r.email, r.sessions, r.minutes, r.viewers, r.gmv, r.commission, r.closings].map(cell).join(","),
    );
  }

  return new NextResponse("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rekap-hostlive-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

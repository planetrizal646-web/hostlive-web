import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { Shell } from "@/components/Shell";
import { Empty, FlashBox, Panel, Stat } from "@/components/ui";
import { backupStats, perHostReport } from "@/lib/queries";
import { fmtMinutes, fmtMonth, fmtNum, fmtRp, isValidMonth, jakartaMonth } from "@/lib/time";

export const metadata: Metadata = { title: "Rekap bulanan" };

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const f = flash(params);
  const raw = typeof params.bulan === "string" ? params.bulan : undefined;
  const month = raw && isValidMonth(raw) ? raw : jakartaMonth();

  const perHost = perHostReport(month);
  const backup = backupStats(month);
  const totals = perHost.reduce(
    (acc, h) => ({
      sessions: acc.sessions + h.sessions,
      backupSessions: acc.backupSessions + h.backupSessions,
      minutes: acc.minutes + h.minutes,
      backupMinutes: acc.backupMinutes + h.backupMinutes,
      viewers: acc.viewers + h.viewers,
      gmv: acc.gmv + h.gmv,
      commission: acc.commission + h.commission,
      closings: acc.closings + h.closings,
    }),
    {
      sessions: 0,
      backupSessions: 0,
      minutes: 0,
      backupMinutes: 0,
      viewers: 0,
      gmv: 0,
      commission: 0,
      closings: 0,
    },
  );

  return (
    <Shell user={admin} title="Rekap bulanan" sub={`${fmtMonth(month)} · ${perHost.length} host`}>
      <FlashBox flash={f} />

      <Panel title="Periode">
        <form method="get" action="/dashboard/reports" className="filter-bar">
          <div className="field">
            <label htmlFor="bulan">Bulan</label>
            <input id="bulan" type="month" name="bulan" defaultValue={month} />
          </div>
          <SubmitButton className="btn btn-primary" pendingLabel="Memproses…">Tampilkan</SubmitButton>
          <Link className="btn" href={`/dashboard/reports.csv?bulan=${month}`} prefetch={false}>
            Unduh CSV
          </Link>
        </form>
      </Panel>

      <div className="grid-stats">
        <Stat label="Sesi utama" value={fmtNum(totals.sessions)} />
        <Stat label="Sesi backup" value={fmtNum(totals.backupSessions)} />
        <Stat label="Jam utama" value={fmtMinutes(totals.minutes)} />
        <Stat label="Jam backup" value={fmtMinutes(totals.backupMinutes)} />
        <Stat label="Total jam kerja" value={fmtMinutes(totals.minutes + totals.backupMinutes)} />
        <Stat label="Total GMV" value={fmtRp(totals.gmv)} />
        <Stat label="Total komisi" value={fmtRp(totals.commission)} />
      </div>

      <Panel title="Per host" tight>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Host</th>
                <th scope="col" className="num">Sesi utama</th>
                <th scope="col" className="num">Sesi backup</th>
                <th scope="col" className="num">Jam utama</th>
                <th scope="col" className="num">Jam backup</th>
                <th scope="col" className="num">Total jam</th>
                <th scope="col" className="num">Viewers</th>
                <th scope="col" className="num">GMV</th>
                <th scope="col" className="num">Estimasi komisi</th>
                <th scope="col" className="num">Closing</th>
              </tr>
            </thead>
            <tbody>
              {perHost.map((h) => (
                <tr key={h.id}>
                  <td>
                    <Link href={`/dashboard/hosts/${h.id}`}>{h.name}</Link>
                  </td>
                  <td className="num">{fmtNum(h.sessions)}</td>
                  <td className="num">{fmtNum(h.backupSessions)}</td>
                  <td className="num">{fmtMinutes(h.minutes)}</td>
                  <td className="num">{fmtMinutes(h.backupMinutes)}</td>
                  <td className="num">{fmtMinutes(h.minutes + h.backupMinutes)}</td>
                  <td className="num">{fmtNum(h.viewers)}</td>
                  <td className="num">{fmtRp(h.gmv)}</td>
                  <td className="num">{fmtRp(h.commission)}</td>
                  <td className="num">{fmtNum(h.closings)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{fmtNum(totals.sessions)}</td>
                <td className="num">{fmtNum(totals.backupSessions)}</td>
                <td className="num">{fmtMinutes(totals.minutes)}</td>
                <td className="num">{fmtMinutes(totals.backupMinutes)}</td>
                <td className="num">{fmtMinutes(totals.minutes + totals.backupMinutes)}</td>
                <td className="num">{fmtNum(totals.viewers)}</td>
                <td className="num">{fmtRp(totals.gmv)}</td>
                <td className="num">{fmtRp(totals.commission)}</td>
                <td className="num">{fmtNum(totals.closings)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <div className="split">
        <Panel title="Paling sering dibackup" tight>
          {backup.covered.length === 0 ? (
            <Empty>Belum ada sesi backup bulan ini.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">Host</th>
                    <th scope="col" className="num">Jumlah</th>
                    <th scope="col" className="num">Jam</th>
                  </tr>
                </thead>
                <tbody>
                  {backup.covered.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/dashboard/hosts/${b.id}`}>{b.name}</Link>
                      </td>
                      <td className="num">{b.count}×</td>
                      <td className="num">{fmtMinutes(b.minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title="Paling sering membackup" tight>
          {backup.covering.length === 0 ? (
            <Empty>Belum ada host yang membackup bulan ini.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">Host</th>
                    <th scope="col" className="num">Jumlah</th>
                    <th scope="col" className="num">Jam</th>
                  </tr>
                </thead>
                <tbody>
                  {backup.covering.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/dashboard/hosts/${b.id}`}>{b.name}</Link>
                      </td>
                      <td className="num">{b.count}×</td>
                      <td className="num">{fmtMinutes(b.minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <p className="small muted">
        Rekap menghitung sesi berstatus selesai saja, termasuk yang belum diverifikasi. Sesi backup tidak
        dihitung sebagai sesi penjualan; durasinya dikurangkan dari durasi host utama. Urut dari GMV
        terbesar.
      </p>
    </Shell>
  );
}

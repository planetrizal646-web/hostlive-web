import type { Metadata } from "next";
import Link from "next/link";
import { requireHost } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { Shell } from "@/components/Shell";
import { Empty, FlashBox, Panel, Stat } from "@/components/ui";
import { BarChart } from "@/components/BarChart";
import { aggregate, dailyAggregate } from "@/lib/queries";
import {
  addMonths,
  fmtDate,
  fmtMonth,
  fmtMinutes,
  fmtNum,
  fmtRp,
  isValidMonth,
  jakartaMonth,
  monthRange,
} from "@/lib/time";

export const metadata: Metadata = { title: "Performa saya" };

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireHost();
  const params = await searchParams;
  const f = flash(params);
  const month = isValidMonth(typeof params.bulan === "string" ? params.bulan : undefined)
    ? (params.bulan as string)
    : jakartaMonth();

  const summary = aggregate(monthRange(month), user.id);
  const days = dailyAggregate(user.id, month);

  const sixMonths = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(month, i - 5);
    const a = aggregate(monthRange(m), user.id);
    return { label: m.slice(5), a: a.gmv, b: a.closings, gmv: a.gmv, closings: a.closings };
  });

  const dailyPoints = [...days]
    .reverse()
    .slice(-14)
    .map((d) => ({ label: d.date.slice(8), a: d.gmv, b: d.closings }));

  const verifiedPct = summary.sessions ? Math.round((summary.verified / summary.sessions) * 100) : 0;
  const avgGmv = summary.sessions ? Math.round(summary.gmv / summary.sessions) : 0;

  return (
    <Shell user={user} title="Performa saya" sub={fmtMonth(month)}>
      <FlashBox flash={f} />

      <div className="row">
        <Link className="btn btn-sm btn-ghost" href={`/host/performa?bulan=${addMonths(month, -1)}`}>
          ‹ Sebelumnya
        </Link>
        <Link className="btn btn-sm btn-ghost" href={`/host/performa?bulan=${addMonths(month, 1)}`}>
          Berikutnya ›
        </Link>
        <span className="spacer" />
        <span className="small muted">
          Hanya sesi selesai. Jam backup ikut dihitung sebagai jam kerja, tanpa GMV/komisi.
        </span>
      </div>

      <div className="grid-stats">
        <Stat label="Sesi utama" value={fmtNum(summary.sessions)} />
        <Stat label="Sesi backup" value={fmtNum(summary.backupSessions)} />
        <Stat
          label="Total jam kerja"
          value={fmtMinutes(summary.minutes + summary.backupMinutes)}
          note={`${fmtMinutes(summary.minutes)} utama + ${fmtMinutes(summary.backupMinutes)} backup`}
        />
        <Stat label="GMV" value={fmtRp(summary.gmv)} note={`Rata-rata ${fmtRp(avgGmv)} per sesi`} />
        <Stat label="Estimasi komisi" value={fmtRp(summary.commission)} />
        <Stat label="Closing" value={fmtNum(summary.closings)} />
        <Stat label="Viewers" value={fmtNum(summary.viewers)} />
        <Stat label="Terverifikasi" value={`${verifiedPct}%`} note={`${summary.verified} dari ${summary.sessions} sesi utama`} />
      </div>

      <div className="split">
        <Panel title="Tren 6 bulan">
          <BarChart points={sixMonths} labelA="GMV" labelB="Closing" />
        </Panel>
        <Panel title="Tren harian bulan ini">
          {dailyPoints.length === 0 ? (
            <Empty>Belum ada sesi selesai bulan ini.</Empty>
          ) : (
            <BarChart points={dailyPoints} labelA="GMV" labelB="Closing" />
          )}
        </Panel>
      </div>

      <Panel title="Rincian per hari" tight>
        {days.length === 0 ? (
          <Empty>Belum ada data harian.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col" className="num col-optional">Sesi utama</th>
                  <th scope="col" className="num col-optional">Sesi backup</th>
                  <th scope="col" className="num">Jam utama</th>
                  <th scope="col" className="num">Jam backup</th>
                  <th scope="col" className="num">Total jam</th>
                  <th scope="col" className="num col-optional">Viewers</th>
                  <th scope="col" className="num">GMV</th>
                  <th scope="col" className="num col-optional">Komisi</th>
                  <th scope="col" className="num">Closing</th>
                  <th scope="col" className="num col-optional">Terverifikasi</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date}>
                    <td className="num">{fmtDate(d.date)}</td>
                    <td className="num col-optional">{d.sessions}</td>
                    <td className="num col-optional">{d.backupSessions}</td>
                    <td className="num">{fmtMinutes(d.minutes)}</td>
                    <td className="num">{fmtMinutes(d.backupMinutes)}</td>
                    <td className="num">{fmtMinutes(d.minutes + d.backupMinutes)}</td>
                    <td className="num col-optional">{fmtNum(d.viewers)}</td>
                    <td className="num">{fmtRp(d.gmv)}</td>
                    <td className="num col-optional">{fmtRp(d.commission)}</td>
                    <td className="num">{fmtNum(d.closings)}</td>
                    <td className="num col-optional">
                      {d.verified}/{d.sessions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Shell>
  );
}

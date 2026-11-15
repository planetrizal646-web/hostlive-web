import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { Shell } from "@/components/Shell";
import { FlashBox, Panel, Stat } from "@/components/ui";
import { AutoRefresh } from "@/components/client";
import { hangingSessions, liveSessions, sessionsOnDate, studios, unverifiedCount } from "@/lib/queries";
import { fmtNum, fmtRp, isHanging, jakartaDate, jakartaTime } from "@/lib/time";

export const metadata: Metadata = { title: "Pantau live" };

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const f = flash(await searchParams);
  const today = jakartaDate();
  const live = liveSessions();
  const hanging = hangingSessions().filter((s) => isHanging(s));
  const pending = unverifiedCount();
  const todaySessions = sessionsOnDate(today);
  const gmvToday = todaySessions.reduce((n, s) => n + (s.gmv ?? 0), 0);
  const commissionToday = todaySessions.reduce((n, s) => n + (s.commission ?? 0), 0);

  return (
    <Shell user={admin} title="Pantau live" sub="Diperbarui otomatis tiap 60 detik">
      <AutoRefresh />
      <FlashBox flash={f} />

      <div className="grid-stats">
        <Stat label="Sedang live" value={live.filter((s) => s.status === "berjalan").length} />
        <Stat label="Sesi hari ini" value={todaySessions.length} note={today} />
        <Stat label="GMV hari ini" value={fmtRp(gmvToday)} />
        <Stat label="Estimasi komisi hari ini" value={fmtRp(commissionToday)} />
      </div>

      {hanging.length > 0 ? (
        <div className="alert alert-danger" role="alert">
          <div>
            <strong>{hanging.length} sesi menggantung.</strong>
            <ul className="alert-list">
              {hanging.map((s) => (
                <li key={s.id}>
                  {s.host} · {s.studio} · slot {s.slot_start} ·{" "}
                  <Link href={`/dashboard/sessions/${s.id}`}>Tinjau</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {pending > 0 ? (
        <div className="alert alert-warn">
          <span>
            <strong>{pending} sesi belum terverifikasi.</strong>{" "}
            <Link href="/dashboard/sessions?verifikasi=belum">Buka daftar</Link>
          </span>
        </div>
      ) : null}

      <Panel title="Status studio">
        <div className="studio-grid">
          {studios().map((studio) => {
            const active = live.find((s) => s.studio_id === studio.id);
            return (
              <div key={studio.id} className={`studio-card${active ? " in-use" : ""}`}>
                <span className="studio-name">{studio.name}</span>
                {active ? (
                  <>
                    <span className="badge badge-live">
                      <span className="dot dot-pulse" aria-hidden="true" /> Terpakai
                    </span>
                    <span className="small">
                      {active.host} · slot {active.slot_start} · mulai {jakartaTime(active.started_at)}
                    </span>
                  </>
                ) : (
                  <span className="badge badge-done">Kosong</span>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Sesi live sekarang"
        tight
        actions={
          <Link className="btn btn-sm" href="/dashboard/sessions">
            Semua sesi
          </Link>
        }
      >
        {live.length === 0 ? (
          <div className="empty">Tidak ada sesi berjalan saat ini.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Host</th>
                  <th scope="col">Studio</th>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Slot</th>
                  <th scope="col">Mulai</th>
                  <th scope="col" className="num">Viewers</th>
                  <th scope="col">Status</th>
                  <th scope="col" aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {live.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.host}
                      {s.cover_of ? (
                        <>
                          {" "}
                          <span className="badge badge-wait">
                            Backup · {s.covers_host ?? "host lain"}
                          </span>
                        </>
                      ) : null}
                    </td>
                    <td>{s.studio}</td>
                    <td className="num">{s.date}</td>
                    <td className="num">{s.slot_start}</td>
                    <td className="num">{jakartaTime(s.started_at)}</td>
                    <td className="num">{s.viewers == null ? "—" : fmtNum(s.viewers)}</td>
                    <td>
                      <span className={s.status === "berjalan" ? "badge badge-live" : "badge badge-wait"}>
                        {s.status === "berjalan" ? "Live" : "Menunggu hasil"}
                      </span>
                    </td>
                    <td>
                      <Link className="btn btn-sm btn-ghost" href={`/dashboard/sessions/${s.id}`}>
                        Detail
                      </Link>
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

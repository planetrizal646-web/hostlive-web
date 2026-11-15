import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton, SubmitButton } from "@/components/SubmitButton";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { Shell } from "@/components/Shell";
import { Empty, FlashBox, Panel, Stat } from "@/components/ui";
import { aggregate, sessionsOfMonth, userById } from "@/lib/queries";
import { fmtDate, fmtMinutes, fmtNum, fmtRp, jakartaMonth, monthRange } from "@/lib/time";

export const metadata: Metadata = { title: "Detail host" };

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const f = flash(await searchParams);
  const host = userById(Number(id));
  if (!host || host.role !== "host") notFound();

  const month = jakartaMonth();
  const agg = aggregate(monthRange(month), host.id);
  const history = sessionsOfMonth(host.id, month);

  return (
    <Shell user={admin} title={host.name} sub={`${host.email} · host ${host.active === 1 ? "aktif" : "nonaktif"}`}>
      <FlashBox flash={f} />

      <div className="row">
        <Link className="btn btn-sm" href="/dashboard/hosts">
          ‹ Semua host
        </Link>
        <span className="spacer" />
        <form action="/api/admin/host/update" method="post">
          <input type="hidden" name="action" value="toggle" />
          <input type="hidden" name="id" value={host.id} />
          <ConfirmButton
            className={`btn btn-sm ${host.active === 1 ? "btn-danger" : ""}`}
            title={host.active === 1 ? "Nonaktifkan host?" : "Aktifkan host?"}
            message={
              host.active === 1
                ? `Nonaktifkan ${host.name}? Host tidak bisa memulai sesi baru.`
                : `Aktifkan kembali ${host.name}?`
            }
          >
            {host.active === 1 ? "Nonaktifkan host" : "Aktifkan host"}
          </ConfirmButton>
        </form>
      </div>

      <div className="grid-stats">
        <Stat label="Sesi utama" value={fmtNum(agg.sessions)} note={month} />
        <Stat label="Sesi backup" value={fmtNum(agg.backupSessions)} />
        <Stat label="Jam utama" value={fmtMinutes(agg.minutes)} />
        <Stat label="Jam backup" value={fmtMinutes(agg.backupMinutes)} />
        <Stat
          label="Total jam kerja"
          value={fmtMinutes(agg.minutes + agg.backupMinutes)}
          note={`${fmtMinutes(agg.minutes)} utama + ${fmtMinutes(agg.backupMinutes)} backup`}
        />
        <Stat label="GMV" value={fmtRp(agg.gmv)} />
        <Stat label="Estimasi komisi" value={fmtRp(agg.commission)} />
      </div>

      <Panel title="Ubah akun">
        <form action="/api/admin/host/update" method="post" className="form-grid">
          <input type="hidden" name="action" value="update" />
          <input type="hidden" name="id" value={host.id} />
          <div className="field">
            <label htmlFor="name">Nama host</label>
            <input id="name" name="name" autoComplete="name" defaultValue={host.name} required minLength={2} maxLength={60} />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="off" defaultValue={host.email} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password baru</label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={6}
              autoComplete="new-password"
              placeholder="Kosongkan jika tidak diubah"
            />
            <span className="field-hint">Mengganti password akan mengeluarkan host dari semua perangkat.</span>
          </div>
          <div className="field checkbox-field">
            <label htmlFor="active">
              <input id="active" type="checkbox" name="active" value="1" defaultChecked={host.active === 1} /> Host
              aktif
            </label>
          </div>
          <div className="form-actions">
            <SubmitButton className="btn btn-primary" pendingLabel="Memproses…">Simpan perubahan</SubmitButton>
          </div>
        </form>
      </Panel>

      <Panel title="Riwayat sesi bulan ini" tight>
        {history.length === 0 ? (
          <Empty>Belum ada sesi selesai pada bulan ini.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Studio</th>
                  <th scope="col">Slot</th>
                  <th scope="col" className="num">Viewers</th>
                  <th scope="col" className="num">GMV</th>
                  <th scope="col" className="num">Komisi</th>
                  <th scope="col">Verifikasi</th>
                  <th scope="col" aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {history.map((s) => {
                  const isCover = s.cover_of != null;
                  return (
                    <tr key={s.id}>
                      <td className="num">{fmtDate(s.date)}</td>
                      <td>
                        {s.studio}
                        {isCover ? (
                          <>
                            {" "}
                            <span className="badge badge-wait">Backup → {s.covers_host ?? "host lain"}</span>
                          </>
                        ) : null}
                      </td>
                      <td className="num">
                        {s.slot_start}–{s.slot_end}
                      </td>
                      <td className="num">{isCover ? "—" : fmtNum(s.viewers ?? 0)}</td>
                      <td className="num">{isCover ? "—" : fmtRp(s.gmv ?? 0)}</td>
                      <td className="num">{isCover ? "—" : fmtRp(s.commission ?? 0)}</td>
                      <td>
                        {isCover ? (
                          <span className="badge badge-wait">Backup</span>
                        ) : (
                          <span className={s.verified ? "badge badge-done" : "badge badge-mute"}>
                            {s.verified ? "Terverifikasi" : "Belum"}
                          </span>
                        )}
                      </td>
                      <td>
                        <Link className="btn btn-sm btn-ghost" href={`/dashboard/sessions/${s.id}`}>
                          Detail
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Shell>
  );
}

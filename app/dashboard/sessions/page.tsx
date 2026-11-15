import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { Shell } from "@/components/Shell";
import { Empty, FlashBox, Panel, Stat, StatusBadge, VerifyBadge } from "@/components/ui";
import { CheckAllToggle } from "@/components/client";
import { hosts, searchSessions, studios } from "@/lib/queries";
import { fmtDate, fmtNum, fmtRp, isValidDate, jakartaTime } from "@/lib/time";

export const metadata: Metadata = { title: "Semua sesi" };

export const dynamic = "force-dynamic";

const STATUS = ["berjalan", "menunggu_hasil", "selesai"] as const;
const STATUS_LABEL: Record<string, string> = {
  berjalan: "Sedang live",
  menunggu_hasil: "Menunggu hasil",
  selesai: "Selesai",
};

const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const f = flash(params);

  const rawDate = one(params.tanggal);
  const date = rawDate && isValidDate(rawDate) ? rawDate : undefined;
  const hostId = Number(one(params.host) ?? 0) || undefined;
  const studioId = Number(one(params.studio) ?? 0) || undefined;
  const status = one(params.status);
  const verified = one(params.verifikasi);

  const rows = searchSessions({
    date,
    hostId,
    studioId,
    status: status && STATUS.includes(status as (typeof STATUS)[number]) ? status : undefined,
    verified: verified === "sudah" || verified === "belum" ? verified : undefined,
  });

  const query = new URLSearchParams();
  if (date) query.set("tanggal", date);
  if (hostId) query.set("host", String(hostId));
  if (studioId) query.set("studio", String(studioId));
  if (status) query.set("status", status);
  if (verified) query.set("verifikasi", verified);
  const next = `/dashboard/sessions${query.size ? `?${query}` : ""}`;

  const verifiable = rows.filter((s) => s.status === "selesai" && !s.verified).length;
  const gmv = rows.reduce((n, s) => n + (s.gmv ?? 0), 0);

  return (
    <Shell user={admin} title="Semua sesi" sub={`${rows.length} sesi ditampilkan · maksimum 300`}>
      <FlashBox flash={f} />

      <Panel title="Filter">
        <form method="get" action="/dashboard/sessions" className="filter-bar">
          <div className="field">
            <label htmlFor="tanggal">Tanggal</label>
            <input id="tanggal" type="date" name="tanggal" defaultValue={date ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="host">Host</label>
            <select id="host" name="host" defaultValue={hostId ? String(hostId) : ""}>
              <option value="">Semua host</option>
              {hosts().map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="studio">Studio</label>
            <select id="studio" name="studio" defaultValue={studioId ? String(studioId) : ""}>
              <option value="">Semua studio</option>
              {studios().map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={status ?? ""}>
              <option value="">Semua status</option>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="verifikasi">Verifikasi</label>
            <select id="verifikasi" name="verifikasi" defaultValue={verified ?? ""}>
              <option value="">Semua</option>
              <option value="sudah">Terverifikasi</option>
              <option value="belum">Belum verifikasi</option>
            </select>
          </div>
          <SubmitButton className="btn btn-primary" pendingLabel="Memproses…">Terapkan</SubmitButton>
          <Link className="btn btn-ghost" href="/dashboard/sessions">
            Reset
          </Link>
        </form>
      </Panel>

      <div className="grid-stats">
        <Stat label="Sesi ditampilkan" value={fmtNum(rows.length)} />
        <Stat label="Bisa diverifikasi" value={fmtNum(verifiable)} />
        <Stat label="GMV terfilter" value={fmtRp(gmv)} />
        <Stat label="Tanggal" value={date ? fmtDate(date) : "Semua"} />
      </div>

      <Panel
        title="Daftar sesi"
        tight
        actions={
          verifiable > 0 ? (
            <form action="/api/admin/session/verify" method="post" id="form-verifikasi">
              <input type="hidden" name="next" value={next} />
              <SubmitButton className="btn btn-sm btn-primary" pendingLabel="Memproses…">Verifikasi terpilih</SubmitButton>
            </form>
          ) : null
        }
      >
        {rows.length === 0 ? (
          <Empty>Tidak ada sesi yang cocok dengan filter.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">
                    {verifiable > 0 ? <CheckAllToggle targetName="id[]" /> : null}
                  </th>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Host</th>
                  <th scope="col">Studio</th>
                  <th scope="col">Slot</th>
                  <th scope="col">Mulai–Selesai</th>
                  <th scope="col" className="num">Viewers</th>
                  <th scope="col" className="num">GMV</th>
                  <th scope="col" className="num">Komisi</th>
                  <th scope="col">Status</th>
                  <th scope="col">Verifikasi</th>
                  <th scope="col" aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const checkable = s.status === "selesai" && !s.verified && s.cover_of == null;
                  return (
                    <tr key={s.id}>
                      <td>
                        <input
                          type="checkbox"
                          name="id[]"
                          value={s.id}
                          form="form-verifikasi"
                          disabled={!checkable}
                          aria-label={`Pilih sesi ${s.host} ${s.date} ${s.slot_start}`}
                        />
                      </td>
                      <td className="num">{fmtDate(s.date)}</td>
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
                      <td className="num">{s.slot_start}</td>
                      <td className="num small">
                        {jakartaTime(s.started_at)}–{s.ended_at ? jakartaTime(s.ended_at) : "—"}
                      </td>
                      <td className="num">{s.viewers == null ? "—" : fmtNum(s.viewers)}</td>
                      <td className="num">{s.gmv == null ? "—" : fmtRp(s.gmv)}</td>
                      <td className="num">{s.commission == null ? "—" : fmtRp(s.commission)}</td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td>
                        <VerifyBadge verified={s.verified} />
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

      <p className="small muted">
        Hanya sesi berstatus selesai yang bisa diverifikasi. Centang beberapa baris lalu tekan Verifikasi terpilih.
      </p>
    </Shell>
  );
}

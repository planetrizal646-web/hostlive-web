import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { requireHost } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { Shell } from "@/components/Shell";
import { Empty, FlashBox, Panel, Stat, StatusBadge, VerifyBadge } from "@/components/ui";
import { LiveTimer, StopForm } from "@/components/LiveTimer";
import { StartSessionForm } from "@/components/StartSessionForm";
import {
  aggregate,
  studios,
  openSessionOf,
  sessionsOfMonth,
  availableSlots,
  studioBusy,
  coveredBy,
  liveTargets,
  sessionById,
  userById,
} from "@/lib/queries";
import {
  addMonths,
  fmtDate,
  fmtDuration,
  fmtMinutes,
  fmtMonth,
  fmtNum,
  fmtRp,
  jakartaDate,
  jakartaMonth,
  jakartaTime,
  isValidMonth,
  monthRange,
} from "@/lib/time";

export const metadata: Metadata = { title: "Sesi saya" };

export const dynamic = "force-dynamic";

export default async function HostPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireHost();
  const params = await searchParams;
  const f = flash(params);
  const today = jakartaDate();
  const month = isValidMonth(typeof params.bulan === "string" ? params.bulan : undefined)
    ? (params.bulan as string)
    : jakartaMonth();

  const open = openSessionOf(user.id);
  const studioList = studios();
  const now = new Date();
  const studioSlots = studioList.map((s) => ({
    ...s,
    busy: studioBusy(s.id, now),
    slots: availableSlots(s.id, now),
  }));
  const history = sessionsOfMonth(user.id, month);
  const summary = aggregate(monthRange(month), user.id);
  const studioName = (id: number) => studioList.find((s) => s.id === id)?.name ?? "—";
  const cover = open ? coveredBy(open.id) : undefined;
  const coverTarget = open?.cover_of ? sessionById(open.cover_of) : undefined;
  const coverTargetName = coverTarget ? userById(coverTarget.user_id)?.name : undefined;
  const targets = open ? [] : liveTargets(user.id);

  return (
    <Shell user={user} title="Sesi saya" sub={`${fmtDate(today)} · ${user.name}`}>
      <FlashBox flash={f} />

      {open?.status === "berjalan" ? (
        <section className={`live-card${cover ? " live-card-covered" : ""}`}>
          <div className="live-card-head">
            {cover ? (
              <span className="badge badge-wait">
                <span className="dot" aria-hidden="true" /> Dibackup {cover.host}
              </span>
            ) : (
              <span className="badge badge-onair">
                <span className="dot dot-pulse" aria-hidden="true" /> Sedang live
              </span>
            )}
            {open.cover_of ? <span className="badge badge-wait">Backup</span> : null}
            <span className="live-slot">
              Slot {open.slot_start}–{open.slot_end}
            </span>
          </div>

          <div className="live-card-main">
            <h2 className="live-studio">{studioName(open.studio_id)}</h2>
            <p className="live-meta">
              {open.cover_of
                ? `Menggantikan ${coverTargetName ?? "host lain"} · mulai ${jakartaTime(open.started_at)}`
                : `Mulai ${jakartaTime(open.started_at)}`}
            </p>
          </div>

          <div className="live-card-foot">
            <div className="live-clock" id={`durasi-${open.id}`}>
              <span className="live-clock-label">Durasi live</span>
              <LiveTimer startedAt={open.started_at} />
            </div>
            <div className="live-card-side">
              {cover ? (
                <p className="live-note">
                  Live kamu ditutup sementara oleh {cover.host}. Kamu live lagi otomatis setelah backup
                  selesai.
                </p>
              ) : open.cover_of ? (
                <>
                  <StopForm
                    sessionId={open.id}
                    label="Selesai backup"
                    title="Selesai backup?"
                    confirmLabel="Ya, selesai"
                    message="Host utama akan kembali live setelah backup selesai."
                    danger={false}
                  />
                  <p className="live-note">Durasi backup dihitung terpisah dari sesi host utama.</p>
                </>
              ) : (
                <>
                  <StopForm sessionId={open.id} />
                  <p className="live-note">Durasi dihitung dari waktu mulai aktual.</p>
                </>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {open?.status === "menunggu_hasil" ? (
        <Panel title="Isi hasil sesi">
          <div className="stack">
            <p className="muted small">
              {studioName(open.studio_id)} · slot {open.slot_start}–{open.slot_end} · live{" "}
              {jakartaTime(open.started_at)}–{jakartaTime(open.ended_at)} · durasi{" "}
              {fmtDuration((open.ended_at ?? 0) - open.started_at)}
            </p>
            <form action="/api/session/finish" method="post" className="stack">
              <input type="hidden" name="id" value={open.id} />
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="viewers">Total viewers</label>
                  <input id="viewers" name="viewers" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" required />
                </div>
                <div className="field">
                  <label htmlFor="gmv">Total GMV (Rp)</label>
                  <input id="gmv" name="gmv" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" required />
                </div>
                <div className="field">
                  <label htmlFor="commission">Estimasi komisi (Rp)</label>
                  <input id="commission" name="commission" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" required />
                </div>
                <div className="field">
                  <label htmlFor="closings">Total closing</label>
                  <input id="closings" name="closings" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" required />
                </div>
              </div>
              <div className="row">
                <SubmitButton className="btn btn-primary" pendingLabel="Memproses…">Simpan &amp; selesaikan sesi</SubmitButton>
                <span className="small muted">Sesi selesai setelah 4 angka tersimpan.</span>
              </div>
            </form>
          </div>
        </Panel>
      ) : null}

      {!open ? (
        <Panel title="Mulai sesi live">
          <StartSessionForm studios={studioSlots} />
          <p className="small muted">
            Pilih studio dan jam mulai. Satu sesi = 1 jam. Setelah lewat 1 jam kamu tetap bisa lanjut atau berhenti.
            Jadwal diatur di luar sistem.
          </p>
        </Panel>
      ) : null}

      {!open ? (
        <Panel title="Backup sesi live">
          {targets.length === 0 ? (
            <Empty>Tidak ada host lain yang sedang live saat ini.</Empty>
          ) : (
            <form action="/api/session/cover" method="post" className="stack">
              <div className="field">
                <label htmlFor="cover">Ganti host yang sedang live</label>
                <select id="cover" name="cover" required>
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.host} · {t.studio} · slot {t.slot_start}–{t.slot_end}
                    </option>
                  ))}
                </select>
                <span className="field-hint">
                  Studio dan slot mengikuti sesi yang digantikan. Setelah backup selesai, host utama live
                  lagi.
                </span>
              </div>
              <SubmitButton className="btn btn-primary" pendingLabel="Memproses…">
                Mulai backup
              </SubmitButton>
            </form>
          )}
        </Panel>
      ) : null}

      <div className="grid-stats">
        <Stat label="Sesi utama" value={fmtNum(summary.sessions)} note={fmtMonth(month)} />
        <Stat label="Sesi backup" value={fmtNum(summary.backupSessions)} />
        <Stat label="Jam utama" value={fmtMinutes(summary.minutes)} />
        <Stat label="Jam backup" value={fmtMinutes(summary.backupMinutes)} />
        <Stat
          label="Total jam kerja"
          value={fmtMinutes(summary.minutes + summary.backupMinutes)}
          note={`${fmtMinutes(summary.minutes)} utama + ${fmtMinutes(summary.backupMinutes)} backup`}
        />
      </div>

      <Panel
        title={`Riwayat sesi · ${fmtMonth(month)}`}
        tight
        actions={
          <div className="row">
            <Link className="btn btn-sm btn-ghost" href={`/host?bulan=${addMonths(month, -1)}`}>
              ‹ Sebelumnya
            </Link>
            <Link className="btn btn-sm btn-ghost" href={`/host?bulan=${addMonths(month, 1)}`}>
              Berikutnya ›
            </Link>
          </div>
        }
      >
        {history.length === 0 ? (
          <Empty>Belum ada sesi selesai bulan ini.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Studio</th>
                  <th scope="col" className="col-optional">Slot</th>
                  <th scope="col" className="col-optional">Live aktual</th>
                  <th scope="col">Durasi</th>
                  <th scope="col" className="num">Viewers</th>
                  <th scope="col" className="num">GMV</th>
                  <th scope="col" className="num">Komisi</th>
                  <th scope="col" className="num">Closing</th>
                  <th scope="col" className="col-optional">Verifikasi</th>
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
                      <td className="num col-optional">{s.slot_start}</td>
                      <td className="num col-optional">
                        {jakartaTime(s.started_at)}–{jakartaTime(s.ended_at)}
                      </td>
                      <td className="num">{fmtDuration((s.ended_at ?? 0) - s.started_at)}</td>
                      <td className="num">{isCover ? "—" : fmtNum(s.viewers)}</td>
                      <td className="num">{isCover ? "—" : fmtRp(s.gmv)}</td>
                      <td className="num">{isCover ? "—" : fmtRp(s.commission)}</td>
                      <td className="num">{isCover ? "—" : fmtNum(s.closings)}</td>
                      <td className="col-optional">
                        {isCover ? <span className="small muted">—</span> : <VerifyBadge verified={s.verified} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {open ? (
        <p className="small muted">
          Status sesi: <StatusBadge status={open.status} /> — selesaikan sesi ini sebelum memulai yang baru.
        </p>
      ) : null}
    </Shell>
  );
}

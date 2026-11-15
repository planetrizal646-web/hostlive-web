import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { Shell } from "@/components/Shell";
import { FlashBox, Panel, Stat, StatusBadge, VerifyBadge } from "@/components/ui";
import { coveredBy, sessionById, studios, userById } from "@/lib/queries";
import { fmtDate, fmtDuration, fmtNum, fmtRp, jakartaTime } from "@/lib/time";

export const metadata: Metadata = { title: "Detail sesi" };

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
  const s = sessionById(Number(id));
  if (!s) notFound();

  const done = s.status === "selesai";
  const duration = s.ended_at ? s.ended_at - s.started_at : null;
  const host = userById(s.user_id);
  const studio = studios().find((st) => st.id === s.studio_id);
  const cover = coveredBy(s.id);
  const parent = s.cover_of ? sessionById(s.cover_of) : undefined;
  const parentHost = parent ? userById(parent.user_id)?.name : undefined;

  return (
    <Shell user={admin} title={`Sesi #${s.id}`} sub={`${fmtDate(s.date)} · slot ${s.slot_start}–${s.slot_end}`}>
      <FlashBox flash={f} />

      <div className="row">
        <Link className="btn btn-sm" href="/dashboard/sessions">
          ‹ Semua sesi
        </Link>
        <span className="spacer" />
        {s.cover_of ? <span className="badge badge-wait">Backup</span> : null}
        <StatusBadge status={s.status} />
        {s.cover_of ? null : <VerifyBadge verified={s.verified} />}
      </div>

      {s.cover_of ? (
        <p className="small muted">
          Sesi backup untuk{" "}
          <Link href={`/dashboard/sessions/${s.cover_of}`}>{parentHost ?? "host lain"}</Link>.
        </p>
      ) : null}
      {cover ? (
        <p className="small muted">
          Sedang dibackup oleh {cover.host} sejak {jakartaTime(cover.started_at)}.
        </p>
      ) : null}

      <div className="grid-stats">
        <Stat label="Durasi live" value={duration == null ? "—" : fmtDuration(duration)} />
        <Stat label="Mulai" value={jakartaTime(s.started_at)} note={s.date} />
        <Stat label="Selesai" value={s.ended_at ? jakartaTime(s.ended_at) : "—"} />
        <Stat label="GMV" value={s.gmv == null ? "—" : fmtRp(s.gmv)} />
      </div>

      {done && s.cover_of == null ? (
        <Panel title="Koreksi hasil & verifikasi">
          <form action="/api/admin/session/update" method="post" className="form-grid">
            <input type="hidden" name="id" value={s.id} />
            <div className="field">
              <label htmlFor="viewers">Viewers</label>
              <input id="viewers" name="viewers" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" defaultValue={s.viewers ?? 0} />
            </div>
            <div className="field">
              <label htmlFor="gmv">GMV (Rp)</label>
              <input id="gmv" name="gmv" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" defaultValue={s.gmv ?? 0} />
            </div>
            <div className="field">
              <label htmlFor="commission">Estimasi komisi (Rp)</label>
              <input
                id="commission"
                name="commission"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                defaultValue={s.commission ?? 0}
              />
            </div>
            <div className="field">
              <label htmlFor="closings">Closing</label>
              <input id="closings" name="closings" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" defaultValue={s.closings ?? 0} />
            </div>
            <div className="field field-wide">
              <label htmlFor="note">Catatan admin</label>
              <textarea id="note" name="note" maxLength={500} defaultValue={s.note ?? ""} />
              <span className="field-hint">Maksimal 500 karakter. Terlihat oleh host pada detail sesi.</span>
            </div>
            <div className="field checkbox-field">
              <label htmlFor="verified">
                <input id="verified" type="checkbox" name="verified" value="1" defaultChecked={s.verified === 1} />{" "}
                Tandai terverifikasi
              </label>
            </div>
            <div className="form-actions">
              <SubmitButton className="btn btn-primary" pendingLabel="Memproses…">Simpan hasil</SubmitButton>
            </div>
          </form>
        </Panel>
      ) : (
        <Panel title="Hasil belum tersedia">
          <p className="small muted">
            Sesi masih berstatus {s.status === "berjalan" ? "sedang live" : "menunggu hasil dari host"}. Hasil bisa
            dikoreksi setelah host menyelesaikan sesi.
          </p>
        </Panel>
      )}

      <Panel title="Rincian">
        <dl className="detail-list">
          <dt>Host</dt>
          <dd>
            <Link href={`/dashboard/hosts/${s.user_id}`}>{host?.name ?? `Host #${s.user_id}`}</Link>
          </dd>
          <dt>Studio</dt>
          <dd>{studio?.name ?? `Studio #${s.studio_id}`}</dd>
          <dt>Viewers</dt>
          <dd className="num">{s.viewers == null ? "—" : fmtNum(s.viewers)}</dd>
          <dt>Komisi</dt>
          <dd className="num">{s.commission == null ? "—" : fmtRp(s.commission)}</dd>
          <dt>Closing</dt>
          <dd className="num">{s.closings == null ? "—" : fmtNum(s.closings)}</dd>
          <dt>Catatan</dt>
          <dd>{s.note ? s.note : "—"}</dd>
        </dl>
      </Panel>
    </Shell>
  );
}

import { db, type LiveSession } from "./db";
import { coveredBy, openSessionOf, sessionAt, studioBusy } from "./queries";
import { hourlySlots, jakartaDate, parseClock, slotStartable } from "./time";
import { clampNote, parseCount } from "./validate";

export type Result = { ok: true; cover?: boolean } | { ok: false; err: string };

export const MSG = {
  invalid: "Studio tidak valid.",
  slot: "Jam tidak tersedia. Pilih slot yang masih tersedia hari ini.",
  active: "Masih ada sesi yang belum selesai. Selesaikan dulu sesi tersebut.",
  taken: "Studio ini sudah dipakai host lain pada jam tersebut.",
  numbers: "Isi semua angka dengan benar — wajib diisi dan tidak boleh negatif.",
  noSession: "Sesi tidak ditemukan atau sudah berhenti.",
  noTarget: "Sesi yang mau dibackup sudah tidak live. Muat ulang halaman.",
  coverSelf: "Tidak bisa membackup sesi sendiri.",
  covered: "Sesi ini sudah sedang dibackup host lain.",
  isCovered: "Sesi ini sedang dibackup. Minta host backup menyelesaikan sesinya dulu.",
} as const;

/**
 * Mulai sesi manual: host memilih studio + slot 1 jam yang tersedia.
 * Durasi live tetap dihitung dari waktu mulai aktual.
 */
export function startSession(
  userId: number,
  studioId: number,
  slotStart: string,
  now: Date = new Date(),
): Result {
  const studioOk = db().prepare("SELECT id FROM studios WHERE id = ?").get(studioId);
  if (!studioOk) return { ok: false, err: MSG.invalid };

  const slot = hourlySlots(now).find((s) => s.start === slotStart);
  const startMin = slot ? parseClock(slot.start) : null;
  if (!slot || startMin === null || !slotStartable(startMin, now)) {
    return { ok: false, err: MSG.slot };
  }

  if (openSessionOf(userId)) return { ok: false, err: MSG.active };

  const date = jakartaDate(now);
  if (studioBusy(studioId, now)) return { ok: false, err: MSG.taken };

  if (sessionAt(studioId, date, slot.start)) return { ok: false, err: MSG.taken };

  try {
    db()
      .prepare(
        `INSERT INTO sessions (user_id, studio_id, date, slot_start, slot_end, started_at, status)
         VALUES (?,?,?,?,?,?,'berjalan')`,
      )
      .run(userId, studioId, date, slot.start, slot.end, now.getTime());
  } catch (e) {
    // Hanya pelanggaran UNIQUE yang berarti bentrok; error lain (mis. SQLITE_BUSY) dilempar.
    if (!isUniqueViolation(e)) throw e;
    if (openSessionOf(userId)) return { ok: false, err: MSG.active };
    return { ok: false, err: MSG.taken };
  }
  return { ok: true };
}

/**
 * Backup: host lain menutup sesi live yang sedang berjalan.
 * Studio, tanggal, dan slot diwarisi dari sesi induk; durasi dihitung dari sekarang.
 */
export function startCover(userId: number, coveredId: number, now: Date = new Date()): Result {
  const target = db()
    .prepare("SELECT * FROM sessions WHERE id = ? AND status = 'berjalan' AND cover_of IS NULL")
    .get(coveredId) as LiveSession | undefined;
  if (!target) return { ok: false, err: MSG.noTarget };
  if (target.user_id === userId) return { ok: false, err: MSG.coverSelf };
  if (openSessionOf(userId)) return { ok: false, err: MSG.active };
  if (coveredBy(coveredId)) return { ok: false, err: MSG.covered };

  try {
    db()
      .prepare(
        `INSERT INTO sessions
           (user_id, studio_id, date, slot_start, slot_end, started_at, status, cover_of)
         VALUES (?,?,?,?,?,?,'berjalan',?)`,
      )
      .run(
        userId,
        target.studio_id,
        target.date,
        target.slot_start,
        target.slot_end,
        now.getTime(),
        target.id,
      );
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    if (openSessionOf(userId)) return { ok: false, err: MSG.active };
    return { ok: false, err: MSG.covered };
  }
  return { ok: true };
}

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "errcode" in e &&
    (e as { errcode?: number }).errcode === 2067
  );
}

export function stopSession(userId: number, sessionId: number, now: Date = new Date()): Result {
  const s = db()
    .prepare("SELECT * FROM sessions WHERE id = ? AND user_id = ? AND status = 'berjalan'")
    .get(sessionId, userId) as LiveSession | undefined;
  if (!s) return { ok: false, err: MSG.noSession };

  if (s.cover_of != null) {
    db()
      .prepare("UPDATE sessions SET status = 'selesai', ended_at = ? WHERE id = ?")
      .run(now.getTime(), s.id);
    return { ok: true, cover: true };
  }

  if (coveredBy(s.id)) return { ok: false, err: MSG.isCovered };

  db()
    .prepare("UPDATE sessions SET status = 'menunggu_hasil', ended_at = ? WHERE id = ?")
    .run(now.getTime(), s.id);
  return { ok: true };
}

export function finishSession(
  userId: number,
  sessionId: number,
  raw: { viewers: unknown; gmv: unknown; commission: unknown; closings: unknown },
): Result {
  const s = db()
    .prepare("SELECT * FROM sessions WHERE id = ? AND user_id = ? AND status = 'menunggu_hasil'")
    .get(sessionId, userId) as LiveSession | undefined;
  if (!s) return { ok: false, err: MSG.noSession };

  const viewers = parseCount(raw.viewers);
  const gmv = parseCount(raw.gmv);
  const commission = parseCount(raw.commission);
  const closings = parseCount(raw.closings);
  if (viewers === null || gmv === null || commission === null || closings === null) {
    return { ok: false, err: MSG.numbers };
  }

  db()
    .prepare(
      `UPDATE sessions SET status = 'selesai', viewers = ?, gmv = ?, commission = ?, closings = ?
       WHERE id = ?`,
    )
    .run(viewers, gmv, commission, closings, s.id);
  return { ok: true };
}

export function updateSessionByAdmin(
  sessionId: number,
  raw: { viewers: unknown; gmv: unknown; commission: unknown; closings: unknown; note: unknown; verified: unknown },
): Result {
  const s = db()
    .prepare("SELECT * FROM sessions WHERE id = ? AND status = 'selesai' AND cover_of IS NULL")
    .get(sessionId) as LiveSession | undefined;
  if (!s) return { ok: false, err: "Hasil hanya bisa diedit setelah sesi selesai." };

  const viewers = parseCount(raw.viewers);
  const gmv = parseCount(raw.gmv);
  const commission = parseCount(raw.commission);
  const closings = parseCount(raw.closings);
  if (viewers === null || gmv === null || commission === null || closings === null) {
    return { ok: false, err: MSG.numbers };
  }

  db()
    .prepare(
      `UPDATE sessions SET viewers = ?, gmv = ?, commission = ?, closings = ?, note = ?, verified = ?
       WHERE id = ?`,
    )
    .run(viewers, gmv, commission, closings, clampNote(raw.note), raw.verified ? 1 : 0, s.id);
  return { ok: true };
}

/** Verifikasi massal; hanya sesi selesai yang tersentuh */
export function verifySessions(ids: number[]): number {
  if (ids.length === 0) return 0;
  const stmt = db().prepare(
    "UPDATE sessions SET verified = 1 WHERE id = ? AND status = 'selesai' AND cover_of IS NULL",
  );
  let n = 0;
  for (const id of ids) n += Number(stmt.run(id).changes);
  return n;
}

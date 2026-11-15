import { db, type LiveSession, type Studio, type User } from "./db";
import { hourlySlots, jakartaDate, monthRange, selectableSlots, type HourSlot } from "./time";

// ponytail: node:sqlite rows have a null prototype and cannot cross the
// server/client boundary. Plain-copy only the rows handed to client components.
const plain = <T>(rows: T[]): T[] => rows.map((r) => ({ ...r }));

export function studios(): Studio[] {
  return plain(db().prepare("SELECT * FROM studios ORDER BY id").all() as Studio[]);
}

export function hosts(onlyActive = false): User[] {
  const sql = onlyActive
    ? "SELECT * FROM users WHERE role = 'host' AND active = 1 AND archived = 0 ORDER BY name"
    : "SELECT * FROM users WHERE role = 'host' AND archived = 0 ORDER BY active DESC, name";
  return plain(db().prepare(sql).all() as User[]);
}

export function userById(id: number): User | undefined {
  return db().prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
}

export function emailTaken(email: string, exceptId?: number): boolean {
  const row = db()
    .prepare("SELECT id FROM users WHERE lower(email) = lower(?)")
    .get(email.trim()) as { id: number } | undefined;
  return !!row && row.id !== exceptId;
}

export function openSessionOf(userId: number): LiveSession | undefined {
  return db()
    .prepare(
      "SELECT * FROM sessions WHERE user_id = ? AND status IN ('berjalan','menunggu_hasil') ORDER BY id DESC LIMIT 1",
    )
    .get(userId) as LiveSession | undefined;
}

export function sessionById(id: number): LiveSession | undefined {
  return db().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as LiveSession | undefined;
}

export function sessionAt(studioId: number, date: string, slotStart: string): LiveSession | undefined {
  return db()
    .prepare("SELECT * FROM sessions WHERE studio_id = ? AND date = ? AND slot_start = ?")
    .get(studioId, date, slotStart) as LiveSession | undefined;
}

/** Studio sedang dipakai live hari ini. Sesi induk yang sedang dibackup tidak dihitung. */
export function studioBusy(studioId: number, now: Date = new Date()): boolean {
  return !!db()
    .prepare(
      `SELECT s.id FROM sessions s
       WHERE s.studio_id = ? AND s.date = ? AND s.status = 'berjalan'
         AND NOT EXISTS (
           SELECT 1 FROM sessions c
           WHERE c.cover_of = s.id AND c.status IN ('berjalan','menunggu_hasil')
         )`,
    )
    .get(studioId, jakartaDate(now));
}

/** Sesi live yang masih bisa dibackup, milik host lain. */
export type LiveTarget = {
  id: number;
  host: string;
  studio: string;
  slot_start: string;
  slot_end: string;
};

export function liveTargets(userId: number): LiveTarget[] {
  return db()
    .prepare(
      `SELECT s.id, u.name AS host, st.name AS studio, s.slot_start, s.slot_end
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN studios st ON st.id = s.studio_id
       WHERE s.status = 'berjalan' AND s.cover_of IS NULL AND s.user_id <> ?
         AND NOT EXISTS (
           SELECT 1 FROM sessions c
           WHERE c.cover_of = s.id AND c.status IN ('berjalan','menunggu_hasil')
         )
       ORDER BY s.started_at`,
    )
    .all(userId) as never;
}

/** Cover yang sedang berjalan untuk sebuah sesi induk. */
export function coveredBy(sessionId: number): (LiveSession & { host: string }) | undefined {
  return db()
    .prepare(
      `SELECT c.*, u.name AS host
       FROM sessions c JOIN users u ON u.id = c.user_id
       WHERE c.cover_of = ? AND c.status IN ('berjalan','menunggu_hasil')
       ORDER BY c.id DESC LIMIT 1`,
    )
    .get(sessionId) as never;
}

/** Slot hari ini yang belum dipesan dan sudah boleh dimulai di studio tersebut. */
export function availableSlots(studioId: number, now: Date = new Date()): HourSlot[] {
  if (studioBusy(studioId, now)) return [];
  const taken = new Set(
    (
      db()
        .prepare("SELECT slot_start FROM sessions WHERE studio_id = ? AND date = ?")
        .all(studioId, jakartaDate(now)) as { slot_start: string }[]
    ).map((r) => r.slot_start),
  );
  return selectableSlots(hourlySlots(now), taken, now);
}

export type LiveRow = LiveSession & {
  host: string;
  studio: string;
  initials: string;
  /** Nama host yang digantikan saat baris ini sesi backup. */
  covers_host: string | null;
};

function liveRows(order: "baru" | "lama"): LiveRow[] {
  return db()
    .prepare(
      `SELECT s.*, u.name AS host, u.initials, st.name AS studio, cu.name AS covers_host
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN studios st ON st.id = s.studio_id
       LEFT JOIN sessions cs ON cs.id = s.cover_of
       LEFT JOIN users cu ON cu.id = cs.user_id
       WHERE s.status IN ('berjalan','menunggu_hasil')
         AND NOT EXISTS (
           SELECT 1 FROM sessions c
           WHERE c.cover_of = s.id AND c.status IN ('berjalan','menunggu_hasil')
         )
       ORDER BY s.started_at ${order === "baru" ? "DESC" : "ASC"}`,
    )
    .all() as never;
}

export function liveSessions(): LiveRow[] {
  return liveRows("baru");
}

export function hangingSessions(): LiveRow[] {
  return liveRows("lama");
}

export type SessionRow = LiveSession & {
  host: string;
  studio: string;
  initials: string;
  covers_host: string | null;
};

export function sessionsOfMonth(userId: number, month: string): SessionRow[] {
  const [from, to] = monthRange(month);
  return db()
    .prepare(
      `SELECT s.*, u.name AS host, u.initials, st.name AS studio, cu.name AS covers_host
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN studios st ON st.id = s.studio_id
       LEFT JOIN sessions cs ON cs.id = s.cover_of
       LEFT JOIN users cu ON cu.id = cs.user_id
       WHERE s.user_id = ? AND s.date BETWEEN ? AND ? AND s.status = 'selesai'
       ORDER BY s.date DESC, s.slot_start DESC`,
    )
    .all(userId, from, to) as never;
}

export type SessionFilter = {
  date?: string;
  hostId?: number;
  studioId?: number;
  status?: string;
  verified?: string;
};

export function searchSessions(f: SessionFilter): SessionRow[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (f.date) {
    where.push("s.date = ?");
    args.push(f.date);
  }
  if (f.hostId) {
    where.push("s.user_id = ?");
    args.push(f.hostId);
  }
  if (f.studioId) {
    where.push("s.studio_id = ?");
    args.push(f.studioId);
  }
  if (f.status) {
    where.push("s.status = ?");
    args.push(f.status);
  }
  if (f.verified) {
    where.push("s.verified = ?");
    args.push(f.verified === "sudah" ? 1 : 0);
  }
  const sql = `SELECT s.*, u.name AS host, u.initials, st.name AS studio, cu.name AS covers_host
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN studios st ON st.id = s.studio_id
    LEFT JOIN sessions cs ON cs.id = s.cover_of
    LEFT JOIN users cu ON cu.id = cs.user_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY s.date DESC, s.slot_start DESC LIMIT 300`;
  return db().prepare(sql).all(...args) as never;
}

export function sessionsOnDate(date: string): SessionRow[] {
  return db()
    .prepare(
      `SELECT s.*, u.name AS host, u.initials, st.name AS studio, cu.name AS covers_host
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN studios st ON st.id = s.studio_id
       LEFT JOIN sessions cs ON cs.id = s.cover_of
       LEFT JOIN users cu ON cu.id = cs.user_id
       WHERE s.date = ? ORDER BY s.slot_start`,
    )
    .all(date) as never;
}

export type Aggregate = {
  sessions: number;
  minutes: number;
  backupSessions: number;
  backupMinutes: number;
  viewers: number;
  gmv: number;
  commission: number;
  closings: number;
  verified: number;
};

/** Sesi backup tidak dihitung; durasinya dikurangkan dari sesi induk. */
const EFFECTIVE_MS = `(s.ended_at - s.started_at) - COALESCE(
  (SELECT SUM(c.ended_at - c.started_at) FROM sessions c
   WHERE c.cover_of = s.id AND c.ended_at IS NOT NULL), 0)`;

export function aggregate(range: [string, string], userId?: number): Aggregate {
  const sql = `SELECT COUNT(*) AS sessions,
      COALESCE(SUM(${EFFECTIVE_MS}), 0) AS ms,
      COALESCE(SUM(s.viewers), 0) AS viewers,
      COALESCE(SUM(s.gmv), 0) AS gmv,
      COALESCE(SUM(s.commission), 0) AS commission,
      COALESCE(SUM(s.closings), 0) AS closings,
      COALESCE(SUM(s.verified), 0) AS verified
    FROM sessions s
    WHERE s.status = 'selesai' AND s.cover_of IS NULL AND s.date BETWEEN ? AND ?
      ${userId ? "AND s.user_id = ?" : ""}`;
  const args = userId ? [range[0], range[1], userId] : [range[0], range[1]];
  const row = db().prepare(sql).get(...args) as Record<string, number>;
  const cover = db()
    .prepare(
      `SELECT COUNT(*) AS sessions, COALESCE(SUM(ended_at - started_at), 0) AS ms
       FROM sessions
       WHERE cover_of IS NOT NULL AND status = 'selesai' AND date BETWEEN ? AND ?
         ${userId ? "AND user_id = ?" : ""}`,
    )
    .get(...args) as Record<string, number>;
  return {
    sessions: row.sessions,
    minutes: Math.round(row.ms / 60_000),
    backupSessions: cover.sessions,
    backupMinutes: Math.round(cover.ms / 60_000),
    viewers: row.viewers,
    gmv: row.gmv,
    commission: row.commission,
    closings: row.closings,
    verified: row.verified,
  };
}

export function dailyAggregate(userId: number, month: string): (Aggregate & { date: string })[] {
  const [from, to] = monthRange(month);
  const byDate = new Map<string, Aggregate & { date: string }>();

  const primary = db()
    .prepare(
      `SELECT s.date, COUNT(*) AS sessions,
        COALESCE(SUM(${EFFECTIVE_MS}), 0) AS ms,
        COALESCE(SUM(s.viewers), 0) AS viewers,
        COALESCE(SUM(s.gmv), 0) AS gmv,
        COALESCE(SUM(s.commission), 0) AS commission,
        COALESCE(SUM(s.closings), 0) AS closings,
        COALESCE(SUM(s.verified), 0) AS verified
       FROM sessions s
       WHERE s.user_id = ? AND s.status = 'selesai' AND s.cover_of IS NULL
         AND s.date BETWEEN ? AND ?
       GROUP BY s.date`,
    )
    .all(userId, from, to) as Record<string, number | string>[];

  for (const r of primary) {
    byDate.set(String(r.date), {
      date: String(r.date),
      sessions: Number(r.sessions),
      minutes: Math.round(Number(r.ms) / 60_000),
      backupSessions: 0,
      backupMinutes: 0,
      viewers: Number(r.viewers),
      gmv: Number(r.gmv),
      commission: Number(r.commission),
      closings: Number(r.closings),
      verified: Number(r.verified),
    });
  }

  const covers = db()
    .prepare(
      `SELECT date, COUNT(*) AS sessions, COALESCE(SUM(ended_at - started_at), 0) AS ms
       FROM sessions
       WHERE user_id = ? AND cover_of IS NOT NULL AND status = 'selesai'
         AND date BETWEEN ? AND ?
       GROUP BY date`,
    )
    .all(userId, from, to) as Record<string, number | string>[];

  for (const r of covers) {
    const date = String(r.date);
    const base = byDate.get(date) ?? {
      date,
      sessions: 0,
      minutes: 0,
      backupSessions: 0,
      backupMinutes: 0,
      viewers: 0,
      gmv: 0,
      commission: 0,
      closings: 0,
      verified: 0,
    };
    byDate.set(date, {
      ...base,
      backupSessions: Number(r.sessions),
      backupMinutes: Math.round(Number(r.ms) / 60_000),
    });
  }

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export function perHostReport(month: string): (Aggregate & { id: number; name: string; email: string })[] {
  const [from, to] = monthRange(month);
  return db()
    .prepare(
      `SELECT u.id, u.name, u.email,
        COUNT(s.id) AS sessions,
        COALESCE(SUM(${EFFECTIVE_MS}), 0) AS ms,
        COALESCE(MAX(b.n), 0) AS backup_sessions,
        COALESCE(MAX(b.ms), 0) AS backup_ms,
        COALESCE(SUM(s.viewers), 0) AS viewers,
        COALESCE(SUM(s.gmv), 0) AS gmv,
        COALESCE(SUM(s.commission), 0) AS commission,
        COALESCE(SUM(s.closings), 0) AS closings,
        COALESCE(SUM(s.verified), 0) AS verified
       FROM users u
       LEFT JOIN sessions s
         ON s.user_id = u.id AND s.status = 'selesai' AND s.cover_of IS NULL
         AND s.date BETWEEN ? AND ?
       LEFT JOIN (
         SELECT user_id, COUNT(*) AS n, COALESCE(SUM(ended_at - started_at), 0) AS ms
         FROM sessions
         WHERE cover_of IS NOT NULL AND status = 'selesai' AND date BETWEEN ? AND ?
         GROUP BY user_id
       ) b ON b.user_id = u.id
       WHERE u.role = 'host'
       GROUP BY u.id ORDER BY gmv DESC, u.name`,
    )
    .all(from, to, from, to)
    .map((r) => {
      const row = r as Record<string, number | string>;
      return {
        id: Number(row.id),
        name: String(row.name),
        email: String(row.email),
        sessions: Number(row.sessions),
        minutes: Math.round(Number(row.ms) / 60_000),
        backupSessions: Number(row.backup_sessions),
        backupMinutes: Math.round(Number(row.backup_ms) / 60_000),
        viewers: Number(row.viewers),
        gmv: Number(row.gmv),
        commission: Number(row.commission),
        closings: Number(row.closings),
        verified: Number(row.verified),
      };
    });
}

export function unverifiedCount(): number {
  const row = db()
    .prepare(
      "SELECT COUNT(*) AS n FROM sessions WHERE status = 'selesai' AND cover_of IS NULL AND verified = 0",
    )
    .get() as { n: number };
  return row.n;
}

export type BackupCount = { id: number; name: string; count: number; minutes: number };

/** Siapa paling sering dibackup, dan siapa paling sering membackup. */
export function backupStats(month: string): { covered: BackupCount[]; covering: BackupCount[] } {
  const [from, to] = monthRange(month);
  const toCount = (rows: unknown[]) =>
    (rows as { id: number; name: string; count: number; ms: number }[]).map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      count: Number(r.count),
      minutes: Math.round(Number(r.ms) / 60_000),
    }));

  const covered = toCount(
    db()
      .prepare(
        `SELECT u.id, u.name, COUNT(*) AS count,
           COALESCE(SUM(c.ended_at - c.started_at), 0) AS ms
         FROM sessions c
         JOIN sessions p ON p.id = c.cover_of
         JOIN users u ON u.id = p.user_id
         WHERE c.status = 'selesai' AND c.date BETWEEN ? AND ?
         GROUP BY u.id ORDER BY count DESC, u.name LIMIT 5`,
      )
      .all(from, to),
  );

  const covering = toCount(
    db()
      .prepare(
        `SELECT u.id, u.name, COUNT(*) AS count,
           COALESCE(SUM(c.ended_at - c.started_at), 0) AS ms
         FROM sessions c JOIN users u ON u.id = c.user_id
         WHERE c.cover_of IS NOT NULL AND c.status = 'selesai' AND c.date BETWEEN ? AND ?
         GROUP BY u.id ORDER BY count DESC, u.name LIMIT 5`,
      )
      .all(from, to),
  );

  return { covered, covering };
}

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { hashPassword } from "./password";

export type User = {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  initials: string;
  role: "host" | "admin";
  active: number;
  /** Disembunyikan dari daftar host; riwayat sesi tetap utuh. */
  archived: number;
};

export type Studio = { id: number; name: string };

export type SessionStatus = "berjalan" | "menunggu_hasil" | "selesai";

export type LiveSession = {
  id: number;
  user_id: number;
  studio_id: number;
  date: string;
  slot_start: string;
  slot_end: string;
  started_at: number;
  ended_at: number | null;
  viewers: number | null;
  gmv: number | null;
  commission: number | null;
  closings: number | null;
  status: SessionStatus;
  verified: number;
  /** ID sesi induk saat sesi ini menjadi backup. */
  cover_of: number | null;
  note: string | null;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS studios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('host','admin')),
  active INTEGER NOT NULL DEFAULT 1,
  archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  studio_id INTEGER NOT NULL REFERENCES studios(id),
  date TEXT NOT NULL,
  slot_start TEXT NOT NULL,
  slot_end TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  viewers INTEGER,
  gmv INTEGER,
  commission INTEGER,
  closings INTEGER,
  status TEXT NOT NULL CHECK (status IN ('berjalan','menunggu_hasil','selesai')),
  verified INTEGER NOT NULL DEFAULT 0,
  cover_of INTEGER REFERENCES sessions(id),
  note TEXT
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
`;

/**
 * v10: backup = sesi penutup atas sesi live yang sedang berjalan.
 * v11: host bisa diarsipkan (disembunyikan dari daftar) tanpa menghapus riwayat.
 */
export const DB_VERSION = 11;

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function seed(db: DatabaseSync): void {
  const studios = ["Elektronik", "Furniture", "Cellular"];
  for (const name of studios) db.prepare("INSERT INTO studios (name) VALUES (?)").run(name);

  const adminPw = hashPassword("admin123");
  const hostPw = hashPassword("host123");
  db.prepare(
    "INSERT INTO users (email, password_hash, name, initials, role, active) VALUES (?,?,?,?,?,1)",
  ).run("admin@hostlive.id", adminPw, "Admin Studio", "AS", "admin");

  for (let i = 1; i <= 7; i++) {
    const name = `Host ${i}`;
    db.prepare(
      "INSERT INTO users (email, password_hash, name, initials, role, active) VALUES (?,?,?,?,?,1)",
    ).run(`host${i}@hostlive.id`, hostPw, name, initialsOf(name), "host");
  }
}

let conn: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (conn) return conn;
  const file = process.env.HOSTLIVE_DB ?? path.join(process.cwd(), "data", "hostlive.db");
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  conn = new DatabaseSync(file);
  conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  conn.exec(SCHEMA);

  const userCols = new Set(
    (conn.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!userCols.has("archived")) {
    conn.exec("ALTER TABLE users ADD COLUMN archived INTEGER NOT NULL DEFAULT 0");
  }

  const cols = new Set(
    (conn.prepare("PRAGMA table_info(sessions)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has("cover_of")) {
    conn.exec("ALTER TABLE sessions ADD COLUMN cover_of INTEGER REFERENCES sessions(id)");
  }
  // v9 sempat memakai kolom ini; model v10 menurunkannya dari cover_of.
  if (cols.has("is_backup")) conn.exec("ALTER TABLE sessions DROP COLUMN is_backup");
  if (cols.has("backup_note")) conn.exec("ALTER TABLE sessions DROP COLUMN backup_note");

  const slotIdx = conn
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'sessions_studio_slot'")
    .get() as { sql?: string } | undefined;
  if (slotIdx?.sql && !slotIdx.sql.includes("cover_of")) {
    conn.exec("DROP INDEX sessions_studio_slot");
  }

  conn.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS sessions_studio_slot
      ON sessions (studio_id, date, slot_start) WHERE cover_of IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS sessions_one_open
      ON sessions (user_id) WHERE status IN ('berjalan','menunggu_hasil');
    CREATE UNIQUE INDEX IF NOT EXISTS sessions_one_cover
      ON sessions (cover_of) WHERE cover_of IS NOT NULL AND status IN ('berjalan','menunggu_hasil');
  `);

  const count = conn.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (count.n === 0) seed(conn);

  conn.exec(`PRAGMA user_version = ${DB_VERSION}`);
  return conn;
}

export function initialsFor(name: string): string {
  return initialsOf(name);
}

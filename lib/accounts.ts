import { db, initialsFor, type User } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { deleteUserTokens } from "./auth";
import { emailTaken, userById } from "./queries";
import { normalizeEmail, validEmail, validName, validPassword } from "./validate";

export type Result = { ok: true } | { ok: false; err: string };

export const ACCOUNT_MSG = {
  invalidHost: "Data tidak valid. Nama minimal 2 karakter, email valid, password minimal 6 karakter.",
  invalidEdit: "Data tidak valid. Nama minimal 2 karakter, email valid, password baru minimal 6 karakter.",
  emailTaken: "Email sudah dipakai akun lain.",
} as const;

export function createHost(name: string, email: string, password: string): Result {
  if (!validName(name) || !validEmail(email) || !validPassword(password)) {
    return { ok: false, err: ACCOUNT_MSG.invalidHost };
  }
  const mail = normalizeEmail(email);
  if (emailTaken(mail)) return { ok: false, err: ACCOUNT_MSG.emailTaken };

  const trimmed = name.trim();
  db()
    .prepare(
      "INSERT INTO users (email, password_hash, name, initials, role, active) VALUES (?,?,?,?,'host',1)",
    )
    .run(mail, hashPassword(password), trimmed, initialsFor(trimmed));
  return { ok: true };
}

/** action=update: nama/email/status/password opsional. action=toggle: aktif/nonaktif */
export function updateHost(
  id: number,
  fields: { name: string; email: string; active: number; password?: string },
): Result {
  const user = userById(id);
  if (!user || user.role !== "host") return { ok: false, err: ACCOUNT_MSG.invalidEdit };

  const password = fields.password ?? "";
  if (!validName(fields.name) || !validEmail(fields.email) || (password && !validPassword(password))) {
    return { ok: false, err: ACCOUNT_MSG.invalidEdit };
  }
  const mail = normalizeEmail(fields.email);
  if (emailTaken(mail, id)) return { ok: false, err: ACCOUNT_MSG.emailTaken };

  const trimmed = fields.name.trim();
  db()
    .prepare("UPDATE users SET name = ?, initials = ?, email = ?, active = ? WHERE id = ?")
    .run(trimmed, initialsFor(trimmed), mail, fields.active ? 1 : 0, id);

  if (password) {
    db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), id);
    deleteUserTokens(id);
  }
  if (!fields.active) deleteUserTokens(id);
  return { ok: true };
}

export function toggleHost(id: number): Result {
  const user = userById(id);
  if (!user || user.role !== "host") return { ok: false, err: ACCOUNT_MSG.invalidEdit };
  const next = user.active ? 0 : 1;
  db().prepare("UPDATE users SET active = ? WHERE id = ?").run(next, id);
  if (!next) deleteUserTokens(id);
  return { ok: true };
}

/**
 * Hapus host dari daftar. Tanpa riwayat sesi → baris user dihapus permanen.
 * Dengan riwayat → diarsipkan agar laporan lama tetap utuh.
 */
export function deleteHost(id: number): { ok: true; archived: boolean } | { ok: false; err: string } {
  const user = userById(id);
  if (!user || user.role !== "host") return { ok: false, err: ACCOUNT_MSG.invalidEdit };

  const { n } = db().prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(id) as {
    n: number;
  };

  deleteUserTokens(id);
  if (n === 0) {
    db().prepare("DELETE FROM users WHERE id = ?").run(id);
    return { ok: true, archived: false };
  }

  db().prepare("UPDATE users SET archived = 1, active = 0 WHERE id = ?").run(id);
  return { ok: true, archived: true };
}

export const PROFILE_MSG = {
  invalid: "Data tidak valid. Nama minimal 2 karakter, email valid, password baru minimal 6 karakter.",
  emailTaken: "Email sudah dipakai akun lain.",
  wrongCurrent: "Password saat ini salah.",
  mismatch: "Konfirmasi password baru tidak sama.",
} as const;

export function updateProfile(user: User, name: string, email: string): Result {
  if (!validName(name) || !validEmail(email)) return { ok: false, err: PROFILE_MSG.invalid };
  const mail = normalizeEmail(email);
  if (emailTaken(mail, user.id)) return { ok: false, err: PROFILE_MSG.emailTaken };

  const trimmed = name.trim();
  db()
    .prepare("UPDATE users SET name = ?, initials = ?, email = ? WHERE id = ?")
    .run(trimmed, initialsFor(trimmed), mail, user.id);
  return { ok: true };
}

export function changePassword(
  user: User,
  currentToken: string | undefined,
  current: string,
  next: string,
  confirm: string,
): Result {
  if (!verifyPassword(current, user.password_hash)) return { ok: false, err: PROFILE_MSG.wrongCurrent };
  if (next !== confirm) return { ok: false, err: PROFILE_MSG.mismatch };
  if (!validPassword(next)) return { ok: false, err: PROFILE_MSG.invalid };

  db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), user.id);
  deleteUserTokens(user.id, currentToken);
  return { ok: true };
}

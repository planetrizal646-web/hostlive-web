import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, type User } from "./db";
import { verifyPassword } from "./password";

export const COOKIE_NAME = "hostlive_token";
const WEEK_MS = 7 * 24 * 3_600_000;

export function createToken(userId: number): string {
  const token = randomBytes(32).toString("hex");
  db().prepare("INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?,?,?)").run(
    token,
    userId,
    Date.now() + WEEK_MS,
  );
  return token;
}

export function deleteToken(token: string): void {
  db().prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
}

export function deleteUserTokens(userId: number, except?: string): void {
  if (except) {
    db().prepare("DELETE FROM auth_sessions WHERE user_id = ? AND token <> ?").run(userId, except);
  } else {
    db().prepare("DELETE FROM auth_sessions WHERE user_id = ?").run(userId);
  }
}

/** Baca user dari cookie; token kedaluwarsa atau akun nonaktif = tidak login */
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT u.* FROM auth_sessions a JOIN users u ON u.id = a.user_id
       WHERE a.token = ? AND a.expires_at > ?`,
    )
    .get(token, Date.now()) as User | undefined;
  if (!row || row.active !== 1) return null;
  return row;
}

export async function currentToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value;
}

export async function requireHost(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login-user");
  if (user.role !== "host") redirect("/dashboard");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login-admin");
  if (user.role !== "admin") redirect("/host");
  return user;
}

export function authenticate(email: string, password: string): User | null {
  const row = db()
    .prepare("SELECT * FROM users WHERE lower(email) = ?")
    .get(email.trim().toLowerCase()) as User | undefined;
  if (!row || row.active !== 1) return null;
  return verifyPassword(password, row.password_hash) ? row : null;
}

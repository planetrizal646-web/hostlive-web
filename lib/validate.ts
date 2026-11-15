const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validName(name: string): boolean {
  return name.trim().length >= 2;
}

export function validEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function validPassword(password: string): boolean {
  return password.length >= 6;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** 4 angka hasil: bilangan bulat >= 0 */
export function parseCount(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

export function clampNote(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  return s ? s.slice(0, 500) : null;
}

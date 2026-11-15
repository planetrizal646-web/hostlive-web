export const TZ_OFFSET_MIN = 7 * 60;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function fmtClock(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function parseClock(s: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(s)) return null;
  const [h, m] = s.split(":").map(Number);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Slot sesi: 06:00–22:00, per 1 jam. Slot yang sudah lewat tidak ditawarkan. */
export const SLOT_FIRST_MIN = 6 * 60;
export const SLOT_LAST_MIN = 22 * 60;
/** Slot boleh dimulai 10 menit sebelum jamnya sampai akhir slot. */
export const SLOT_LEAD_MIN = 10;

export type HourSlot = { start: string; end: string };

export function slotStartable(startMin: number, now: Date = new Date()): boolean {
  const current = jakartaMinutes(now);
  return current >= startMin - SLOT_LEAD_MIN && current < startMin + 60;
}

export function hourlySlots(now: Date = new Date()): HourSlot[] {
  const current = jakartaMinutes(now);
  const slots: HourSlot[] = [];
  for (let m = SLOT_FIRST_MIN; m < SLOT_LAST_MIN; m += 60) {
    if (m + 60 <= current) continue;
    slots.push({ start: fmtClock(m), end: fmtClock(m + 60) });
  }
  return slots;
}

/** Buang slot yang sudah dipesan atau belum masuk jendela mulai. */
export function selectableSlots(
  slots: HourSlot[],
  taken: ReadonlySet<string>,
  now: Date = new Date(),
): HourSlot[] {
  return slots.filter((s) => {
    const start = parseClock(s.start);
    return start !== null && slotStartable(start, now) && !taken.has(s.start);
  });
}

/** Waktu Jakarta sebagai Date yang digeser ke UTC — baca dengan getUTC* */
export function jakartaNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + TZ_OFFSET_MIN * 60_000);
}

export function jakartaDate(now: Date = new Date()): string {
  const j = jakartaNow(now);
  return `${j.getUTCFullYear()}-${pad(j.getUTCMonth() + 1)}-${pad(j.getUTCDate())}`;
}

export function jakartaMonth(now: Date = new Date()): string {
  return jakartaDate(now).slice(0, 7);
}

export function jakartaMinutes(now: Date = new Date()): number {
  const j = jakartaNow(now);
  return j.getUTCHours() * 60 + j.getUTCMinutes();
}

export function jakartaTime(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const j = new Date(ms + TZ_OFFSET_MIN * 60_000);
  return `${pad(j.getUTCHours())}:${pad(j.getUTCMinutes())}`;
}

export function jakartaDateOf(ms: number): string {
  return jakartaDate(new Date(ms));
}

export function isValidDate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function isValidMonth(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}$/.test(s)) return false;
  const [y, m] = s.split("-").map(Number);
  return y >= 2000 && m >= 1 && m <= 12;
}

export function monthRange(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  return [`${month}-01`, `${month}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`];
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function fmtDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function fmtMonth(month: string): string {
  const names = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const [y, m] = month.split("-").map(Number);
  return `${names[m - 1]} ${y}`;
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const total = Math.max(0, Math.floor(ms / 60_000));
  return fmtMinutes(total);
}

export function fmtMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}j ${m}m` : `${m}m`;
}

const nf = new Intl.NumberFormat("id-ID");

export function fmtNum(n: number | null | undefined): string {
  return nf.format(n ?? 0);
}

export function fmtRp(n: number | null | undefined): string {
  return `Rp${nf.format(n ?? 0)}`;
}

/** BR sesi menggantung: berjalan > 2 jam, menunggu_hasil > 1 jam */
export const HANGING_RUNNING_MS = 2 * 3_600_000;
export const HANGING_WAITING_MS = 3_600_000;

export function isHanging(
  s: { status: string; started_at: number; ended_at: number | null },
  now: number = Date.now(),
): boolean {
  if (s.status === "berjalan") return now - s.started_at > HANGING_RUNNING_MS;
  if (s.status === "menunggu_hasil") {
    return s.ended_at != null && now - s.ended_at > HANGING_WAITING_MS;
  }
  return false;
}

import { test } from "node:test";
import assert from "node:assert/strict";

process.env.HOSTLIVE_DB = ":memory:";

const {
  fmtClock,
  parseClock,
  hourlySlots,
  selectableSlots,
  slotStartable,
  jakartaDate,
  jakartaMonth,
  jakartaTime,
  isValidDate,
  isValidMonth,
  monthRange,
  addDays,
  addMonths,
  isHanging,
  HANGING_RUNNING_MS,
  HANGING_WAITING_MS,
} = await import("../lib/time.ts");

test("slot per jam 06:00-22:00, lewati jam yang sudah selesai", () => {
  const at = (hhmm: string) => new Date(`2026-05-01T${hhmm}:00+07:00`);

  assert.equal(fmtClock(360), "06:00");
  assert.equal(fmtClock(1320), "22:00");

  assert.deepEqual(hourlySlots(at("05:30"))[0], { start: "06:00", end: "07:00" });
  assert.deepEqual(hourlySlots(at("10:30"))[0], { start: "10:00", end: "11:00" });
  assert.deepEqual(hourlySlots(at("10:30")).at(-1), { start: "21:00", end: "22:00" });
  assert.deepEqual(hourlySlots(at("21:30")), [{ start: "21:00", end: "22:00" }]);
  assert.deepEqual(hourlySlots(at("22:00")), []);
  assert.equal(hourlySlots(at("10:30")).length, 12);
});

test("slot boleh dimulai 10 menit sebelum jamnya sampai akhir slot", () => {
  const at = (hhmm: string) => new Date(`2026-05-01T${hhmm}:00+07:00`);
  assert.equal(parseClock("10:00"), 600);
  assert.equal(parseClock("24:00"), null);
  assert.equal(parseClock("9:00"), null);

  assert.equal(slotStartable(600, at("09:49")), false);
  assert.equal(slotStartable(600, at("09:50")), true);
  assert.equal(slotStartable(600, at("10:59")), true);
  assert.equal(slotStartable(600, at("11:00")), false);
});

test("slot terpakai dan slot mendatang tidak ditawarkan", () => {
  const at = (hhmm: string) => new Date(`2026-05-01T${hhmm}:00+07:00`);
  const now = at("10:30");

  assert.deepEqual(selectableSlots(hourlySlots(now), new Set(), now), [
    { start: "10:00", end: "11:00" },
  ]);
  assert.deepEqual(selectableSlots(hourlySlots(now), new Set(["10:00"]), now), []);
  assert.deepEqual(selectableSlots(hourlySlots(at("10:55")), new Set(), at("10:55")), [
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
  ]);
});

test("Jakarta UTC+7 dan tanggal ikut bergeser lewat tengah malam", () => {
  // 2026-03-10T18:30:00Z = 2026-03-11 01:30 WIB
  const d = new Date("2026-03-10T18:30:00Z");
  assert.equal(jakartaDate(d), "2026-03-11");
  assert.equal(jakartaMonth(d), "2026-03");
  assert.equal(jakartaTime(d.getTime()), "01:30");
});

test("rentang bulan dan aritmetika tanggal", () => {
  assert.deepEqual(monthRange("2026-02"), ["2026-02-01", "2026-02-28"]);
  assert.deepEqual(monthRange("2024-02"), ["2024-02-01", "2024-02-29"]);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.equal(addMonths("2026-12", 1), "2027-01");
});

test("validasi format tanggal dan bulan", () => {
  assert.equal(isValidDate("2026-02-29"), false);
  assert.equal(isValidDate("2024-02-29"), true);
  assert.equal(isValidDate("2026-2-1"), false);
  assert.equal(isValidMonth("2026-13"), false);
  assert.equal(isValidMonth("2026-12"), true);
});

test("deteksi sesi menggantung", () => {
  const now = 10_000_000_000;
  const run = (elapsed: number) =>
    isHanging({ status: "berjalan", started_at: now - elapsed, ended_at: null }, now);
  assert.equal(run(HANGING_RUNNING_MS - 1), false);
  assert.equal(run(HANGING_RUNNING_MS + 1), true);

  const wait = (elapsed: number) =>
    isHanging({ status: "menunggu_hasil", started_at: now - 5_400_000, ended_at: now - elapsed }, now);
  assert.equal(wait(HANGING_WAITING_MS - 1), false);
  assert.equal(wait(HANGING_WAITING_MS + 1), true);
  assert.equal(isHanging({ status: "selesai", started_at: 0, ended_at: 1 }, now), false);
});

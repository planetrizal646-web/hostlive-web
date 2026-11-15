import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// lib/*.ts memakai import tanpa ekstensi (gaya Next); Node butuh .ts saat dites langsung.
const nextStub = new URL("./stubs/next.ts", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/headers" || specifier === "next/navigation") {
      return { url: nextStub, shortCircuit: true };
    }
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // biarkan resolusi normal yang melaporkan errornya
      }
    }
    return nextResolve(specifier, context);
  },
});

process.env.HOSTLIVE_DB = ":memory:";

const { startSession, startCover, stopSession, finishSession } = await import("../lib/actions.ts");
const {
  aggregate,
  backupStats,
  coveredBy,
  dailyAggregate,
  hosts,
  liveSessions,
  liveTargets,
  openSessionOf,
  studioBusy,
} = await import("../lib/queries.ts");
const { monthRange } = await import("../lib/time.ts");
const { createHost, deleteHost } = await import("../lib/accounts.ts");
const { db } = await import("../lib/db.ts");

const HOST1 = 2;
const HOST2 = 3;
const STUDIO = 1;
const t0 = Date.parse("2026-05-01T03:30:00Z"); // 10:30 WIB
const at = (min: number) => new Date(t0 + min * 60_000);

test("backup menutup sesi induk, lalu host utama live lagi", () => {
  assert.deepEqual(startSession(HOST1, STUDIO, "10:00", at(0)), { ok: true });
  const primary = openSessionOf(HOST1);
  assert.ok(primary);
  assert.equal(primary.cover_of, null);
  assert.equal(liveTargets(HOST1).length, 0, "sesi sendiri tidak boleh jadi target");

  const target = liveTargets(HOST2).find((t) => t.id === primary.id);
  assert.ok(target);
  assert.equal(target.host, "Host 1");

  assert.deepEqual(startCover(HOST2, primary.id, at(5)), { ok: true });
  const cover = openSessionOf(HOST2);
  assert.ok(cover);
  assert.equal(cover.cover_of, primary.id);
  assert.equal(coveredBy(primary.id)?.host, "Host 2");

  const live = liveSessions();
  assert.equal(live.length, 1);
  assert.equal(live[0].host, "Host 2");
  assert.equal(live[0].covers_host, "Host 1");
  assert.equal(studioBusy(STUDIO, at(5)), true);

  const blocked = stopSession(HOST1, primary.id, at(6));
  assert.equal(blocked.ok, false);
  assert.match(blocked.ok ? "" : blocked.err, /sedang dibackup/);

  assert.deepEqual(stopSession(HOST2, cover.id, at(10)), { ok: true, cover: true });
  assert.equal(coveredBy(primary.id), undefined);
  assert.equal(liveSessions()[0].host, "Host 1", "host utama live lagi setelah cover selesai");

  assert.deepEqual(stopSession(HOST1, primary.id, at(20)), { ok: true });
  const waiting = openSessionOf(HOST1);
  assert.equal(waiting?.status, "menunggu_hasil");
  assert.ok(waiting);
  assert.deepEqual(
    finishSession(HOST1, waiting.id, { viewers: 10, gmv: 100_000, commission: 5_000, closings: 2 }),
    { ok: true },
  );
});

test("durasi efektif host utama dikurangi cover; jam backup masuk ke host backup", () => {
  const summary = aggregate(monthRange("2026-05"), HOST1);
  assert.equal(summary.sessions, 1);
  assert.equal(summary.minutes, 15, "20 menit live dikurangi 5 menit backup");
  assert.equal(summary.backupSessions, 0);

  const backup = aggregate(monthRange("2026-05"), HOST2);
  assert.equal(backup.sessions, 0, "backup bukan sesi penjualan");
  assert.equal(backup.minutes, 0);
  assert.equal(backup.backupSessions, 1);
  assert.equal(backup.backupMinutes, 5);

  const day = dailyAggregate(HOST2, "2026-05")[0];
  assert.equal(day.date, "2026-05-01");
  assert.equal(day.sessions, 0);
  assert.equal(day.backupSessions, 1);
  assert.equal(day.backupMinutes, 5);

  const stats = backupStats("2026-05");
  assert.deepEqual(stats.covered.map((b) => [b.name, b.count, b.minutes]), [["Host 1", 1, 5]]);
  assert.deepEqual(stats.covering.map((b) => [b.name, b.count, b.minutes]), [["Host 2", 1, 5]]);
});

test("satu sesi induk hanya boleh punya satu cover aktif", () => {
  const HOST3 = 4;
  assert.deepEqual(startSession(HOST1, 2, "10:00", at(0)), { ok: true });
  const primary = openSessionOf(HOST1);
  assert.ok(primary);

  assert.deepEqual(startCover(HOST2, primary.id, at(0)), { ok: true });
  const second = startCover(HOST3, primary.id, at(1));
  assert.equal(second.ok, false);
  assert.match(second.ok ? "" : second.err, /sudah sedang dibackup/);
});

test("hapus host: tanpa riwayat hilang permanen, dengan riwayat diarsipkan", () => {
  assert.deepEqual(createHost("Host Baru", "host-baru@hostlive.id", "rahasia1"), { ok: true });
  const baru = db()
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("host-baru@hostlive.id") as { id: number };

  assert.deepEqual(deleteHost(baru.id), { ok: true, archived: false });
  assert.equal(db().prepare("SELECT id FROM users WHERE id = ?").get(baru.id), undefined);

  assert.deepEqual(deleteHost(HOST1), { ok: true, archived: true });
  const archived = db().prepare("SELECT active, archived FROM users WHERE id = ?").get(HOST1) as {
    active: number;
    archived: number;
  };
  assert.deepEqual({ ...archived }, { active: 0, archived: 1 });
  assert.equal(hosts().some((h) => h.id === HOST1), false, "host diarsipkan tidak tampil di daftar");
});

import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton, SubmitButton } from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { Shell } from "@/components/Shell";
import { FlashBox, Empty, Panel, Stat } from "@/components/ui";
import { hosts } from "@/lib/queries";
import { fmtNum, fmtRp, monthRange, jakartaMonth } from "@/lib/time";
import { aggregate } from "@/lib/queries";

export const metadata: Metadata = { title: "Kelola host" };

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const f = flash(await searchParams);
  const list = hosts();

  return (
    <Shell user={admin} title="Host" sub={`${list.filter((h) => h.active === 1).length} aktif dari ${list.length} host`}>
      <FlashBox flash={f} />

      <Panel title="Tambah host">
        <form action="/api/admin/host/create" method="post" className="form-grid">
          <div className="field">
            <label htmlFor="name">Nama host</label>
            <input id="name" name="name" required minLength={2} maxLength={60} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password awal</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <span className="field-hint">Minimal 6 karakter. Sampaikan ke host untuk login pertama.</span>
          </div>
          <div className="form-actions">
            <SubmitButton className="btn btn-primary" pendingLabel="Memproses…">Tambah host</SubmitButton>
          </div>
        </form>
      </Panel>

      <Panel title="Daftar host" tight>
        {list.length === 0 ? (
          <Empty>Belum ada host. Tambahkan host pertama di atas.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Host</th>
                  <th scope="col">Email</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">Sesi bulan ini</th>
                  <th scope="col" className="num">GMV bulan ini</th>
                  <th scope="col" aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {list.map((h) => {
                  const agg = aggregate(monthRange(jakartaMonth()), h.id);
                  return (
                    <tr key={h.id}>
                      <td>
                        <span className="row-host">
                          <span className="avatar">{h.initials}</span>
                          {h.name}
                        </span>
                      </td>
                      <td className="small muted">{h.email}</td>
                      <td>
                        {h.active === 1 ? (
                          <span className="badge badge-done">Aktif</span>
                        ) : (
                          <span className="badge badge-mute">Nonaktif</span>
                        )}
                      </td>
                      <td className="num">{fmtNum(agg.sessions)}</td>
                      <td className="num">{fmtRp(agg.gmv)}</td>
                      <td className="row-actions">
                        <Link className="btn btn-sm btn-ghost" href={`/dashboard/hosts/${h.id}`}>
                          Edit
                        </Link>
                        <form action="/api/admin/host/update" method="post">
                          <input type="hidden" name="action" value="toggle" />
                          <input type="hidden" name="id" value={h.id} />
                          <ConfirmButton
                            className={`btn btn-sm ${h.active === 1 ? "btn-danger" : ""}`}
                            title={h.active === 1 ? "Nonaktifkan host?" : "Aktifkan host?"}
                            message={
                              h.active === 1
                                ? `Nonaktifkan ${h.name}? Host tidak bisa memulai sesi baru.`
                                : `Aktifkan kembali ${h.name}?`
                            }
                          >
                            {h.active === 1 ? "Nonaktifkan" : "Aktifkan"}
                          </ConfirmButton>
                        </form>
                        <form action="/api/admin/host/update" method="post">
                          <input type="hidden" name="action" value="delete" />
                          <input type="hidden" name="id" value={h.id} />
                          <ConfirmButton
                            className="btn btn-sm btn-ghost"
                            title="Hapus host dari daftar?"
                            message={`Hapus ${h.name} dari daftar? Host tanpa riwayat sesi dihapus permanen. Host yang sudah punya riwayat diarsipkan dan tetap muncul di laporan.`}
                            confirmLabel="Ya, hapus"
                          >
                            Hapus
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="small muted">
        Host nonaktif tetap tampil di laporan dan riwayat, tetapi tidak bisa memulai live baru. Host
        yang dihapus tanpa riwayat sesi benar-benar hilang; yang punya riwayat diarsipkan dan tidak
        lagi tampil di daftar ini.
      </p>
    </Shell>
  );
}

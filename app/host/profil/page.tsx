import type { Metadata } from "next";
import { requireHost } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { flash } from "@/lib/flash";
import { Shell } from "@/components/Shell";
import { FlashBox, Panel } from "@/components/ui";

export const metadata: Metadata = { title: "Profil" };

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireHost();
  const f = flash(await searchParams);

  return (
    <Shell user={user} title="Profil" sub={user.email}>
      <FlashBox flash={f} />

      <div className="split">
        <Panel title="Data akun">
          <form action="/api/profile/update" method="post" className="stack">
            <div className="field">
              <label htmlFor="name">Nama</label>
              <input id="name" name="name" type="text" autoComplete="name" defaultValue={user.name} minLength={2} required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={user.email} required />
            </div>
            <div>
              <SubmitButton className="btn btn-primary" pendingLabel="Memproses…">Simpan perubahan</SubmitButton>
            </div>
          </form>
        </Panel>

        <Panel title="Ganti password">
          <form action="/api/profile/password" method="post" className="stack">
            <div className="field">
              <label htmlFor="current">Password saat ini</label>
              <input id="current" name="current" type="password" autoComplete="current-password" required />
            </div>
            <div className="field">
              <label htmlFor="next">Password baru</label>
              <input id="next" name="next" type="password" minLength={6} autoComplete="new-password" required />
            </div>
            <div className="field">
              <label htmlFor="confirm">Konfirmasi password baru</label>
              <input id="confirm" name="confirm" type="password" minLength={6} autoComplete="new-password" required />
              <span className="field-hint">Perangkat lain otomatis keluar setelah password diganti.</span>
            </div>
            <div>
              <SubmitButton className="btn btn-primary" pendingLabel="Memproses…">Ganti password</SubmitButton>
            </div>
          </form>
        </Panel>
      </div>
    </Shell>
  );
}

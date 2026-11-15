import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginScreen({
  role,
  flash,
}: {
  role: "host" | "admin";
  flash: { msg?: string; err?: string };
}) {
  const isAdmin = role === "admin";
  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <span className="auth-brand">Hostlive</span>
        <p className="auth-lede">
          {isAdmin
            ? "Susun jadwal, pantau studio, dan verifikasi hasil live seluruh host."
            : "Catat jam live dan hasil penjualanmu tanpa ribet."}
        </p>
        <div className="auth-note">
          <span className="auth-note-label">Kredensial demo</span>
          {isAdmin ? (
            <p>
              admin@hostlive.id
              <br />
              admin123
            </p>
          ) : (
            <p>
              host1@hostlive.id
              <br />
              host123
            </p>
          )}
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <h1 className="auth-title">{isAdmin ? "Masuk sebagai admin" : "Masuk sebagai host"}</h1>
          <p className="auth-sub">{isAdmin ? "Area operasional studio." : "Area pribadi host affiliate."}</p>
          {flash.err ? (
            <div className="flash flash-err" role="alert">
              {flash.err}
            </div>
          ) : null}
          <form action="/login" method="post" className="stack">
            <input type="hidden" name="from" value={isAdmin ? "/login-admin" : "/login-user"} />
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <SubmitButton className="btn btn-primary" pendingLabel="Memeriksa…">Masuk</SubmitButton>
          </form>
          <p className="auth-switch">
            {isAdmin ? (
              <Link href="/login-user">Masuk sebagai host</Link>
            ) : (
              <Link href="/login-admin">Masuk sebagai admin</Link>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

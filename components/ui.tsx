import type { Flash } from "@/lib/flash";

export function FlashBox({ flash }: { flash: Flash }) {
  if (!flash.msg && !flash.err) return null;
  return (
    <>
      {flash.err ? (
        <div className="flash flash-err" role="alert">
          {flash.err}
        </div>
      ) : null}
      {flash.msg ? (
        <div className="flash flash-ok" role="status">
          {flash.msg}
        </div>
      ) : null}
    </>
  );
}

export function Panel({
  title,
  actions,
  children,
  tight,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  tight?: boolean;
}) {
  return (
    <section className="panel">
      {title || actions ? (
        <div className="panel-head">
          {title ? <h2>{title}</h2> : null}
          <span className="spacer" />
          {actions}
        </div>
      ) : null}
      <div className={tight ? "panel-body tight" : "panel-body"}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {note ? <span className="stat-note">{note}</span> : null}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}

const STATUS_LABEL: Record<string, string> = {
  berjalan: "Sedang live",
  menunggu_hasil: "Menunggu hasil",
  selesai: "Selesai",
};

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "berjalan" ? "badge badge-live" : status === "menunggu_hasil" ? "badge badge-wait" : "badge badge-done";
  return (
    <span className={cls}>
      {status === "berjalan" ? <span className="dot dot-pulse" aria-hidden="true" /> : null}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function VerifyBadge({ verified }: { verified: number }) {
  return (
    <span className={verified ? "badge badge-done" : "badge badge-mute"}>
      {verified ? "Terverifikasi" : "Belum verifikasi"}
    </span>
  );
}

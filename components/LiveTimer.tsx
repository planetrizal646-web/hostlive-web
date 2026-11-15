"use client";

import { useEffect, useState } from "react";
import { ConfirmButton } from "./SubmitButton";

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function LiveTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    setElapsed(Date.now() - startedAt);
    const id = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const overTarget = elapsed !== null && elapsed >= 3_600_000;

  return (
    <>
      <span className="live-timer" aria-label="Durasi live berjalan">
        {elapsed === null ? "--:--:--" : fmt(elapsed)}
      </span>
      {overTarget ? (
        <span className="small muted" role="status">
          Sudah lewat target 1 jam. Sesi boleh dilanjutkan atau dihentikan.
        </span>
      ) : null}
    </>
  );
}

/** Tombol Berhenti dengan konfirmasi dialog native */
export function StopForm({
  sessionId,
  label = "Berhenti",
  title = "Berhenti live?",
  confirmLabel = "Ya, berhenti",
  message = "Live akan dihentikan sekarang. Hasil sesi diisi setelahnya.",
  danger = true,
}: {
  sessionId: number;
  label?: string;
  title?: string;
  confirmLabel?: string;
  message?: string;
  danger?: boolean;
}) {
  return (
    <form action="/api/session/stop" method="post">
      <input type="hidden" name="id" value={sessionId} />
      <ConfirmButton
        className={danger ? "btn btn-danger" : "btn btn-primary"}
        title={title}
        confirmLabel={confirmLabel}
        message={message}
      >
        {label}
      </ConfirmButton>
    </form>
  );
}

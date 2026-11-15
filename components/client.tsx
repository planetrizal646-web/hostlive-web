"use client";

import { useEffect } from "react";

/** Auto-refresh dashboard admin tiap 60 detik; jeda saat tab tidak aktif */
export function AutoRefresh() {
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") window.location.reload();
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}

/** Centang semua sesi selesai yang bisa diverifikasi */
export function CheckAllToggle({ targetName }: { targetName: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Pilih semua sesi selesai"
      onChange={(e) => {
        // ponytail: checkbox tak terkontrol; cukup sinkronkan DOM, tak perlu state React

        const boxes = document.querySelectorAll<HTMLInputElement>(`input[name="${targetName}"]:not(:disabled)`);
        boxes.forEach((b) => {
          b.checked = e.currentTarget.checked;
        });
      }}
    />
  );
}

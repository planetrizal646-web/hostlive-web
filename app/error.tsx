"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="notice-page">
      <h1 className="serif">Terjadi kesalahan pada server.</h1>
      <p className="muted">Coba lagi. Kalau tetap gagal, muat ulang halamannya.</p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Coba lagi
        </button>
        <Link className="btn" href="/">
          Kembali
        </Link>
      </div>
    </div>
  );
}

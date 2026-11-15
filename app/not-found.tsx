import Link from "next/link";

export default function NotFound() {
  return (
    <div className="notice-page">
      <h1 className="serif">Halaman tidak ditemukan.</h1>
      <p className="muted">Alamat yang kamu buka tidak tersedia.</p>
      <Link className="btn" href="/">
        Kembali
      </Link>
    </div>
  );
}

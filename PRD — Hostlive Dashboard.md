# PRD — Hostlive Dashboard

**Product Requirement Document: Manajemen Sesi Live Host Affiliate**

| Field | Isi |
| --- | --- |
| Produk | Hostlive Dashboard (aplikasi web internal) |
| Versi dokumen | 2.0 (sesi manual 1 jam; TIM & jadwal dihapus) |
| Versi aplikasi | v0.6.0 |
| Tanggal | 10 November 2026 |
| Status | Menggambarkan perilaku aplikasi yang sudah diimplementasikan (as-built) |
| Teknologi | Next.js 16 (App Router, server-rendered), React 19, SQLite (`node:sqlite`), Node ≥ 24 |
| Bahasa antarmuka | Bahasa Indonesia |

> **Catatan v2.0:** fitur TIM, shift, jadwal host, absen/pengganti, keadilan, dan host backup sudah **dihapus** dari aplikasi. Jadwal diatur di luar sistem. Bagian dokumen yang masih menyebut fitur tersebut (§4.1, §4.4, §5.2–§5.3, §6.2 H2/H2b, §6.3 A2/A2b/A2c, §7.3, dan riwayat versi lama) disimpan hanya sebagai catatan sejarah dan tidak berlaku.

---

## Ringkasan Satu Menit

**Apa ini?** Aplikasi web internal untuk mengelola sesi live streaming affiliate di studio: 7 host, 3 studio (Elektronik, Furniture, Cellular). Jadwal diatur di luar sistem.

**Alur inti:** Host memilih studio dan menekan Mulai → Host berhenti → Host mengisi 4 angka hasil → Admin memverifikasi → Rekap bulanan / ekspor CSV.

**Lima aturan terpenting:**

1. Setiap host hanya boleh punya **satu sesi terbuka** (`berjalan` atau `menunggu_hasil`) pada satu waktu.
2. Sesi dimulai **manual kapan saja**; slot dicatat dari jam mulai aktual sampai **1 jam** setelahnya.
3. Satu studio hanya boleh punya **satu sesi `berjalan`** pada satu waktu.
4. Target satu sesi adalah **1 jam**. Lewat 1 jam hanya memunculkan **peringatan**; host tetap boleh melanjutkan atau berhenti.
5. Sesi baru dianggap **selesai** setelah 4 angka hasil (viewers, GMV, estimasi komisi, closing) diisi.

Semua logika tanggal dan jam memakai zona **Asia/Jakarta (UTC+7)**. Tidak ada batas jam operasional di sistem.

---

## 1. Latar Belakang dan Tujuan

### 1.1 Masalah yang diselesaikan

1. Tidak ada pencatatan terpusat untuk jam live tiap host dan hasil penjualannya.
2. Admin sulit mengalokasikan host ke studio/slot tanpa risiko bentrok (host ganda di jam yang sama, studio dipakai dobel).
3. Hasil sesi sering tidak terisi karena aplikasi ditutup sebelum selesai, sehingga dibutuhkan mekanisme yang memaksa penyelesaian.
4. Rekap performa bulanan dan verifikasi hasil dilakukan manual dan tidak bisa diekspor.

### 1.2 Tujuan produk

- Mencatat setiap sesi live dengan waktu mulai/berhenti **aktual**; durasi live dihitung dari keduanya.
- Mengelola jadwal host per tanggal × studio × slot tanpa konflik.
- Memastikan setiap sesi ditutup dengan hasil lengkap sebelum host memulai sesi berikutnya.
- Menyediakan ringkasan performa untuk host, serta rekap dan verifikasi untuk admin.

### 1.3 Di luar cakupan

Streaming itu sendiri, penggajian/komisi riil, dan notifikasi eksternal. Item pengembangan lanjutan ada di §13.

---

## 2. Pengguna dan Peran

| Peran | Deskripsi | Area akses |
| --- | --- | --- |
| **Admin** | Pengelola operasional: menyusun jadwal, memantau live, mengelola akun host, mengoreksi hasil, verifikasi, rekap | Seluruh `/dashboard/*` |
| **Host** | Pembawa live: memulai/mengakhiri sesi, mengisi hasil, melihat jadwal, performa, dan profil sendiri | Seluruh `/host/*` (hanya data miliknya) |

### 2.1 Akun demo

Dibuat otomatis saat tabel `users` kosong. **Wajib diganti sebelum produksi** (lihat §12).

| Peran | Email | Password |
| --- | --- | --- |
| Admin | `admin@hostlive.id` | `admin123` |
| Host 1–7 | `host1@hostlive.id` sampai `host7@hostlive.id` | `host123` |

### 2.2 Aturan akses (dipaksa di server)

| Situasi | Hasil |
| --- | --- |
| Belum login membuka area host | Redirect ke `/login-user` |
| Belum login membuka area admin | Redirect ke `/login-admin` |
| Host membuka `/dashboard*` | Redirect ke `/host` |
| Admin membuka `/host*` | Redirect ke `/dashboard` |
| Akun nonaktif mencoba login | Ditolak (dianggap gagal login) |
| Akun dinonaktifkan | Semua sesi login lamanya dihapus |

---

## 3. Glosarium

| Istilah | Definisi |
| --- | --- |
| **Studio** | Ruangan tempat live dilakukan. Ada 3: Elektronik, Furniture, Cellular. |
| **Shift** | Blok kerja bernama dengan jam mulai/selesai tetap, mis. Pagi 06:00–15:00, Siang 13:00–22:00, Middle 08:00–17:00, Cellular 08:00–17:00. Bisa diubah admin; Pagi dan Siang tumpang tindih 13:00–15:00. |
| **Kapasitas** | Jumlah host yang dibutuhkan untuk satu studio × shift, disimpan di tabel `capacity` dan bisa diubah admin. |
| **Libur** | Baris jadwal `kind='libur'`: host tidak bertugas pada tanggal itu. Maksimal satu per host per tanggal. |
| **Jadwal** | *Rencana* admin: host X bertugas di studio Y pada tanggal Z shift S (atau Libur). Belum berarti live sudah terjadi. |
| **Draft / Terkunci** | Draft masih bisa diedit bebas; setelah dikunci, perubahan hanya lewat alur absen/pengganti atau tukar shift. |
| **Absen** | Catatan host tidak masuk pada tanggal + shift tertentu (sakit/izin/lainnya). |
| **Pengganti (penyelamat)** | Host yang ditugaskan menggantikan host absen. Jumlahnya dihitung per bulan di halaman Keadilan. |
| **Sesi** | *Kejadian aktual*: satu kegiatan live seorang host di satu studio pada satu tanggal dan shift. Dibuat saat host menekan Mulai. |
| **Jendela mulai** | Rentang waktu sesi boleh dimulai: dari 10 menit sebelum shift mulai sampai akhir shift. |
| **Status sesi** | `berjalan` → `menunggu_hasil` → `selesai` (satu arah, tidak bisa mundur). |
| **Sesi terbuka** | Sesi berstatus `berjalan` atau `menunggu_hasil`. |
| **Hasil sesi** | 4 angka wajib: total viewers, total GMV (Rp), total estimasi komisi (Rp), total closing. |
| **Verifikasi** | Penandaan admin bahwa hasil sesi selesai sudah dicek. |
| **Sesi menggantung** | Sesi `berjalan` lebih dari 2 jam, atau `menunggu_hasil` lebih dari 1 jam (lihat §4.5). |
| **Tanggal Jakarta** | Tanggal dan jam menurut Asia/Jakarta (UTC+7, tanpa DST), bukan jam server. |

---

## 4. Aturan Bisnis Inti

### 4.1 Shift dan waktu

- **BR-1** Jam operasional **06:00–22:00**. Jadwal memakai **shift**, bukan slot 1 jam:

  | Shift | Jam | Keterangan |
  | --- | --- | --- |
  | Pagi | 06:00–15:00 | dipakai rotasi otomatis |
  | Siang | 13:00–22:00 | dipakai rotasi otomatis |
  | Middle | 08:00–17:00 | dipilih manual saat kekurangan orang |

  Hanya **tiga** shift ini yang ada di sistem; shift lain tidak dapat dipilih dari menu. Pagi dan Siang **tumpang tindih 13:00–15:00**.
- **BR-2** Shift hanya patokan jadwal. Waktu mulai dan berhenti dicatat **aktual**; durasi live = waktu berhenti − waktu mulai (bukan panjang shift).
- **BR-3** Sebuah shift bisa dimulai bila waktu Jakarta sekarang ≥ (mulai shift − 10 menit) **dan** < akhir shift (fungsi `isShiftStartable`). *Contoh:* Pagi `06:00–15:00` bisa dimulai 05:50 sampai sebelum 15:00.

### 4.2 Siklus hidup sesi

```text
berjalan ──(host klik Berhenti)──▶ menunggu_hasil ──(host isi hasil & Simpan)──▶ selesai
```

| Langkah | Pelaku | Syarat | Efek |
| --- | --- | --- | --- |
| **Mulai** | Host | Tidak ada sesi terbuka milik host; studio dan slot valid; dalam jendela mulai; studio+tanggal+slot belum dipakai sesi lain | Sesi `berjalan`, waktu mulai aktual dicatat |
| **Berhenti** | Host | Sesi `berjalan` milik host; konfirmasi dengan durasi berjalan | Status `menunggu_hasil`, waktu berhenti dicatat, durasi dihitung |
| **Selesaikan** | Host | Sesi `menunggu_hasil`; 4 angka hasil terisi (bilangan bulat ≥ 0) | Status `selesai`, masuk riwayat, host bebas memulai sesi baru |

Aturan tambahan:

- **BR-4** Selama ada sesi `berjalan` atau `menunggu_hasil`, host tidak bisa memulai sesi baru.
- **BR-5** Jika aplikasi ditutup saat `menunggu_hasil`, form hasil muncul lagi saat host login kembali.

### 4.3 Keunikan data (dijamin di database)

| Aturan | Jaminan di database |
| --- | --- |
| Satu sesi per studio + tanggal + jam mulai | `UNIQUE (studio_id, date, slot_start)` pada `sessions` |
| Satu sesi terbuka per host | `UNIQUE INDEX` parsial pada `sessions (user_id) WHERE status IN ('berjalan','menunggu_hasil')` |
| Satu Libur per host per tanggal | `UNIQUE INDEX` parsial `schedules_libur_once ON schedules (user_id, date) WHERE kind = 'libur'` |

### 4.4 Aturan jadwal (admin)

- **BR-6** Jadwal hanya boleh diisi dengan **host aktif** (host nonaktif ditolak).
- **BR-7** Satu host **hanya satu giliran per jam** pada tanggal yang sama.
- **BR-8** Jumlah host per studio per giliran **tidak dibatasi**.
- **BR-9** **TIM** (`shift_teams` + `team_members`) adalah unit penjadwalan. Satu TIM punya studio, window jam (`start_min`–`end_min`), panjang giliran (`slot_minutes`, default 60), dan `member_quota`.
- **BR-10** Window TIM dipotong menjadi giliran dan dibagikan **bergilir per jam** ke anggotanya. `member_quota > 0` berarti satu anggota memegang beberapa giliran berturut-turut sebelum estafet. Contoh: Elektronik punya TIM 1 (06:00–15:00, 2 orang) dan TIM 2 (13:00–22:00, 2 orang) → tiap jam ada 1 host per TIM, bergantian antar anggota.
- **BR-11** Studio **tanpa TIM tidak dijadwalkan otomatis**; admin mengisinya manual.
- **BR-12** Host yang sedang Libur dilewati; gilirannya dipegang anggota berikutnya. Bila semua anggota libur, giliran dilaporkan kosong.
- **BR-13** **Isi otomatis** membangun jadwal sebulan dari seluruh TIM aktif. Host di luar TIM tidak pernah muncul otomatis.
- **BR-14** Bulan bisa **dikunci** (`schedule_locks`); selama terkunci semua perubahan ditolak.
- **BR-15** **Host backup** (`users.is_backup = 1`) tidak dijadwalkan generator. Tombol **Isi kekosongan (backup)** mengisi giliran kosong dari daftar backup secara round-robin, melewati backup yang sudah bertugas pada tanggal itu.

### 4.5 Sesi menggantung

| Status | Dianggap menggantung bila |
| --- | --- |
| `berjalan` | Sudah berjalan lebih dari 2 jam |
| `menunggu_hasil` | Sudah berhenti tetapi hasil belum diisi lebih dari 1 jam |

Sesi seperti ini muncul sebagai **alert merah** di dashboard admin dengan link ke detail sesi.

### 4.6 Verifikasi dan koreksi

- **BR-9** Hanya sesi `selesai` yang bisa diverifikasi atau diedit hasilnya oleh admin.
- **BR-10** Host tidak bisa mengubah sesi yang sudah `selesai`.

---

## 5. Alur Pengguna

### 5.1 Autentikasi

```text
Pengunjung → GET /
  ├─ sudah login sebagai host  → /host
  ├─ sudah login sebagai admin → /dashboard
  └─ belum login               → /login-user

Login (POST /login)
  ├─ email/password salah → kembali ke halaman login asal dengan pesan error
  ├─ akun nonaktif        → dianggap gagal login
  └─ berhasil → cookie token (7 hari, HttpOnly, SameSite=Lax)
                → host  → /host
                → admin → /dashboard

Logout (POST /logout) → hapus token dan cookie → /login-user
```

### 5.2 Alur host: sesi live

```text
Host login → /host (Sesi saya)
  │
  ├─ Ada sesi terbuka?
  │   ├─ berjalan: kartu sesi (studio, slot, mulai aktual, timer live) → [Berhenti]
  │   │     → konfirmasi “Berhenti live sekarang? Durasi berjalan X.” → menunggu_hasil
  │   └─ menunggu_hasil: form hasil (viewers, GMV, estimasi komisi, closing)
  │         → [Simpan & selesaikan sesi] → selesai → masuk Riwayat sesi
  │
  └─ Tidak ada sesi terbuka:
        ├─ Kartu “Jadwal Anda hari ini” (bila ada) → tombol [Mulai] saat dalam jendela mulai
        └─ Form “Mulai sesi live manual”: pilih Studio → pilih Slot → [Mulai sesi]
              (slot terpakai / di luar jendela otomatis nonaktif di dropdown)
```

Urutan pengecekan server saat memulai sesi: data valid → tidak ada sesi terbuka → dalam jendela mulai → studio belum terpakai. Kode dan pesan error ada di §7.1.

### 5.3 Alur admin: operasional

```text
Admin login → /dashboard
  ├─ Pantau: sesi live sekarang, status studio (Terpakai/Kosong), statistik hari ini,
  │          alert sesi menggantung, jumlah sesi belum terverifikasi
  │          (auto-refresh tiap 60 detik, jeda saat tab tidak aktif)
  │
  ├─ /dashboard/schedules?tanggal=YYYY-MM-DD
  │     Matriks Slot × Studio → klik sel kosong [Pilih host] atau tombol ganti
  │     → modal pilih host → [Simpan jadwal]
  │     Tombol hapus pada sel berisi → konfirmasi → hapus
  │
  ├─ /dashboard/hosts
  │     Tambah host (nama ≥ 2 karakter, email valid & unik, password ≥ 6 karakter)
  │     Aktifkan/Nonaktifkan (nonaktif = host logout dari semua perangkat)
  │     Edit akun → /dashboard/hosts/:id
  │
  ├─ /dashboard/sessions
  │     Filter: tanggal, host, studio, status, verifikasi (maks 300 baris)
  │     Verifikasi massal: centang (hanya sesi selesai) → [Tandai terverifikasi]
  │     Edit sesi selesai → /dashboard/sessions/:id
  │         koreksi 4 angka + catatan (≤ 500 karakter) + centang verifikasi
  │
  └─ /dashboard/reports
        Rekap per host untuk bulan terpilih (sesi, durasi, viewers, GMV, komisi, closing)
        [Ekspor CSV] → rekap-hostlive-YYYY-MM.csv (BOM UTF-8, kompatibel Excel)
```

---

## 6. Spesifikasi Halaman

### 6.1 Halaman bersama

| # | Halaman | URL | Isi / perilaku |
| --- | --- | --- | --- |
| 1 | Login host | `GET /login-user` | Form email + password. Menampilkan kredensial demo host. Pesan error bila kredensial salah. |
| 2 | Login admin | `GET /login-admin` | Sama seperti login host, dengan kredensial demo admin. |
| 3 | Akar | `GET /` | Redirect sesuai role / status login (lihat §5.1). |
| 4 | 404 | path tak dikenal | “Halaman tidak ditemukan.” (HTTP 404) |
| 5 | 500 | error server | “Terjadi kesalahan pada server.” (HTTP 500) |

Layout standar: sidebar (bisa di-collapse), navbar, footer, memakai template SkyDash (Bootstrap 4). Halaman login memakai layout terpisah.

### 6.2 Area host

**H1. Sesi saya** — `GET /host`

- Perilaku sesuai alur §5.2.
- Kartu `berjalan`: studio, slot, mulai aktual, **timer yang bertambah tiap detik** (JS klien).
- Kartu `menunggu_hasil`: slot, mulai/berhenti aktual, durasi live, dan **form hasil** (4 input angka, wajib, `min=0`).
- **Riwayat sesi**: tabel per bulan (filter `bulan`) berisi sesi `selesai` milik host tersebut. Kolom: tanggal, studio, slot, waktu mulai–berhenti aktual, durasi live, viewers, GMV, estimasi komisi, closing, status verifikasi. Angka berformat `id-ID`, uang dalam Rupiah.

**H2. Jadwal saya** — `GET /host/jadwal`

- Tampilan “Mendatang” (default, maks 50 baris) atau “Per bulan” (pilih bulan).
- Statistik: jadwal hari ini, jadwal bulan ini, total mendatang.
- Status baris: `Sedang live`, `Siap dimulai`, `Terjadwal`, `Lewat`. Baris Libur menampilkan `—` / `Libur`.
- Tombol **\[Mulai live\]** hanya aktif bila: jadwal hari ini, dalam jendela mulai, dan tidak ada sesi terbuka.
- Baris kerja memiliki form **\[Lapor absen\]** (kategori + catatan singkat); ditolak server bila lewat batas lapor (§4.4 BR-14).

**H2b. Keadilan saya** — `GET /host/keadilan?bulan=`

- Tabel keadilan yang sama dengan admin, dengan baris host tersebut ditandai. Host bisa melihat counter Libur, jadi penyelamat, double shift, dan absen miliknya dibanding rekan lain.

**H3. Performa saya** — `GET /host/performa`

- Ringkasan bulan terpilih: jumlah sesi, jam live, GMV, komisi, viewers, closing, persen terverifikasi, rata-rata GMV per sesi.
- Grafik SVG: tren GMV dan closing 6 bulan terakhir, serta tren per hari pada bulan terpilih.
- Rincian hari yang memiliki sesi. Parameter: `tampilan=hari|bulan`, `bulan`.

**H4. Profil** — `GET /host/profil`

- Ubah nama/email: nama ≥ 2 karakter, email valid dan unik.
- Ganti password: password baru ≥ 6 karakter, konfirmasi cocok, password saat ini benar. **Semua perangkat lain otomatis logout**; perangkat yang dipakai tetap login.

### 6.3 Area admin

**A1. Dashboard** — `GET /dashboard`

- 4 kartu statistik: sedang live, sesi hari ini, GMV hari ini, estimasi komisi hari ini.
- Alert merah: sesi menggantung (dengan link “Tinjau”). Alert kuning: jumlah sesi belum terverifikasi.
- Kartu per studio: `Terpakai` (host, slot, jam mulai) atau `Kosong`.
- Tabel sesi live sekarang.
- **Auto-refresh 60 detik**, dijeda saat tab tidak aktif (`visibilitychange`).

**A2. Jadwal host** — `GET /dashboard/schedules?bulan=`

- Default bulan berjalan (Jakarta); navigasi bulan ‹ ›, pemilih bulan, tombol "Bulan ini".
- Tampilan **matriks host × hari** (baris = host, kolom = tanggal 1..akhir bulan), seperti spreadsheet. Sel berisi chip `Studio Shift` atau `Libur`; tombol `+` membuka dialog penugasan; `×` menghapus.
- Aksi: **Buat draft** (generator rotasi sebulan), **Kunci jadwal** / **Buka kunci**, dan tabel kapasitas studio × shift yang bisa diubah admin.
- Statistik: host aktif, hari dalam bulan, kursi terisi, kursi kosong. Kekurangan tenaga dilaporkan sebagai shortfall, bukan disembunyikan.
- Bulan terkunci: chip tidak bisa dihapus, tombol `+` nonaktif; perubahan hanya lewat alur absen/pengganti atau tukar shift.

**A2b. Absen & pengganti** — `GET /dashboard/absences?bulan=`

- Form catat absen: host, tanggal, shift, kategori (sakit/izin/lainnya), catatan opsional.
- Tabel absen bulan itu: tanggal, host, studio, shift, kategori, status (`Perlu pengganti`/`Tergantikan`), tombol \[Rekomendasi\].
- Panel rekomendasi: daftar pengganti berurutan (urutan, host, alasan, jumlah jadi penyelamat bulan ini) + tombol \[Tugaskan\].
- Panel "Urutan prioritas studio & kursi kosong hari ini": prioritas berdasarkan GMV per jam bulan berjalan, lalu daftar kursi yang belum terisi pada urutan itu.

**A2c. Keadilan** — `GET /dashboard/fairness?bulan=`

- Tabel per host per bulan: shift kerja, Libur, Libur Sabtu/Minggu, jadi penyelamat, double shift, absen. Baris total di `tfoot`. Bisa dilihat bersama tanpa debat.

**A3. Kelola host** — `GET /dashboard/hosts`

- Daftar host: nama, email, status (Aktif/Nonaktif), jumlah sesi selesai; tombol Edit dan Aktifkan/Nonaktifkan.
- Form tambah host.

**A4. Edit host** — `GET /dashboard/hosts/:id`

- Edit nama, email, status. Password opsional: dikosongkan = tidak diganti; bila diisi minimal 6 karakter.

**A5. Semua sesi** — `GET /dashboard/sessions`

- Filter: tanggal, host, studio, status (`berjalan` / `menunggu_hasil` / `selesai`), verifikasi (`sudah` / `belum`); tombol Filter dan Reset. Maks 300 baris.
- Kolom: checkbox, tanggal, host, studio, slot, waktu, durasi, status, viewers, GMV, estimasi komisi, closing, verifikasi, aksi.
- Verifikasi massal: hanya baris `selesai` yang bisa dicentang (lainnya disabled); ada konfirmasi jumlah. Bila tidak ada yang dipilih, muncul alert.

**A6. Detail sesi** — `GET /dashboard/sessions/:id`

- Info sesi: status, mulai, berhenti, durasi, verifikasi.
- Bila `selesai`: form edit 4 angka + catatan (≤ 500 karakter) + centang “Tandai terverifikasi” → \[Simpan hasil\].
- Bila belum selesai: info “Hasil hanya bisa diedit setelah sesi selesai.”

**A7. Rekap bulanan** — `GET /dashboard/reports?bulan=`

- Default bulan berjalan.
- Total: sesi, durasi live, GMV, estimasi komisi, plus tabel per host (termasuk viewers dan closing), diurutkan dari GMV tertinggi.

**A8. Ekspor CSV** — `GET /dashboard/reports.csv?bulan=`

- Kolom: Host, Email, Sesi, Durasi live (menit), Viewers, GMV, Estimasi komisi, Closing.
- Berkas ber-BOM UTF-8 bernama `rekap-hostlive-YYYY-MM.csv`.

---

## 7. Validasi dan Pesan Error

### 7.1 Sesi

| Kode | Kondisi | Pesan |
| --- | --- | --- |
| `invalid` | Studio/slot tidak valid | “Studio atau slot waktu tidak valid.” |
| `active` | Masih ada sesi terbuka | “Masih ada sesi yang belum selesai. Selesaikan dulu sesi tersebut.” |
| `window` | Di luar jendela mulai | “Slot ini belum bisa dimulai. Sesi hanya bisa dimulai 10 menit sebelum slot sampai akhir slot.” |
| `taken` | Studio+slot sudah dipakai | “Studio ini sudah dipakai host lain pada slot tersebut.” |
| — | Hasil: angka tidak valid | “Isi semua angka dengan benar — wajib diisi dan tidak boleh negatif.” |
| — | Berhenti/selesai: sesi tidak ditemukan atau status salah | “Sesi tidak ditemukan atau sudah berhenti.” |

### 7.2 Profil dan akun

| Konteks | Kondisi | Pesan |
| --- | --- | --- |
| Profil (host) | Nama/email/password tidak valid | “Data tidak valid. Nama minimal 2 karakter, email valid, password baru minimal 6 karakter.” |
| Profil (host) | Email terpakai | “Email sudah dipakai akun lain.” |
| Profil (host) | Password saat ini salah | “Password saat ini salah.” |
| Profil (host) | Konfirmasi berbeda | “Konfirmasi password baru tidak sama.” |
| Akun (admin) | Data tidak valid | “Data tidak valid. Nama minimal 2 karakter, email valid, password minimal 6 karakter.” |
| Akun (admin) | Email terpakai | “Email sudah dipakai akun lain.” |
| Login | Kredensial salah | Pesan error kredensial ditampilkan di halaman login. |

### 7.3 Jadwal (admin)

| Kondisi | Pesan |
| --- | --- |
| Tanggal tidak valid | “Format tanggal tidak valid.” |
| Slot tidak valid | “Slot waktu tidak valid.” |
| Host bentrok (`host_clash`) | “Host ini sudah memiliki jadwal di studio lain pada jam yang sama.” |
| Host nonaktif (`host_inactive`) | “Host yang dipilih sedang nonaktif.” |

### 7.4 Aturan validasi bersama

- Nama: ≥ 2 karakter setelah di-trim.
- Email: regex dasar, unik (tidak peka huruf besar/kecil; di-trim dan di-lowercase).
- Password: ≥ 6 karakter.
- 4 angka hasil: bilangan bulat ≥ 0.
- Catatan: dipotong pada 500 karakter.

---

## 8. Model Data (SQLite)

File `data/hostlive.db` (git-ignored; bisa diganti lewat `HOSTLIVE_DB`). Mode WAL, `foreign_keys = ON`. Waktu disimpan sebagai epoch ms; `date` berformat `YYYY-MM-DD` (Jakarta). Versi skema dikelola dengan `PRAGMA user_version` (**saat ini v3**). Migrasi berjalan otomatis saat membuat koneksi: v1→v2 membangun ulang `schedules` (kolom `kind`, `shift_id`), v2→v3 menambah `leave_weekday`/`rotation_offset` dan **menghapus** tabel `capacity`, `studio_shifts`, `absences`, `substitutions`, `swap_requests`).

| Tabel | Kolom | Keterangan |
| --- | --- | --- |
| `users` | `id, email UNIQUE, password_hash (scrypt), name, initials, role CHECK('host','admin'), active (1/0), home_studio_id, leave_weekday, week1_shift_id, week2_shift_id, is_backup` | `leave_weekday` 1=Senin..7=Minggu (acuan Oktober 2026, maju 1 hari/bulan); `week1_shift_id`/`week2_shift_id` shift per minggu; `is_backup=1` = host cadangan yang tidak dijadwalkan generator |
| `studios` | `id, name UNIQUE` | Seed: Elektronik, Furniture, Cellular |
| `shifts` | `id, name UNIQUE, start_min, end_min` | Menit dari tengah malam; seed Pagi 360–900, Middle 480–1020, Siang 780–1320 |
| `shift_teams` | `id, name, studio_id, start_min, end_min, slot_minutes, member_quota, active` | TIM: window jam + panjang giliran. Satu studio boleh punya beberapa TIM |
| `team_members` | `team_id, user_id, position` | Anggota TIM; `position` menentukan urutan giliran |
| `schedule_locks` | `month PK, locked_at` | Bulan terkunci (BR-12) |
| `sessions` | `id, user_id, studio_id, date, slot_start, slot_end, started_at, ended_at, viewers, gmv, commission, closings, status CHECK('berjalan','menunggu_hasil','selesai'), verified (0/1), note` | Keunikan lihat §4.3 |
| `schedules` | `id, date, kind CHECK('kerja','libur'), shift_id, slot_start, slot_end, studio_id, user_id, created_at` | `kind='libur'` → `shift_id`/`studio_id` NULL. Keunikan lihat §4.3 |
| `auth_sessions` | `token PK, user_id, expires_at` | Sesi login 7 hari |

---

## 9. Rute dan Aksi (Ringkasan API)

| Metode | Rute | Akses | Aksi |
| --- | --- | --- | --- |
| POST | `/login` | publik | Login; set cookie sesi |
| POST | `/logout` | publik | Hapus sesi login dan cookie |
| POST | `/api/session/start` | host | Mulai sesi (`studio`, `slot`) |
| POST | `/api/session/stop` | host | Berhenti (`id`) → `menunggu_hasil` |
| POST | `/api/session/finish` | host | Simpan 4 angka hasil → `selesai` |
| POST | `/api/profile/update` | host | Ubah nama/email |
| POST | `/api/profile/password` | host | Ganti password |
| POST | `/api/admin/schedule` | admin | `action=delete` hapus baris; selain itu simpan sel (`date, shift_id, studio_id, host_id, mode, existing_id`) |
| POST | `/api/admin/team` | admin | `create` buat TIM; `update` ubah TIM; `members` susun anggota; `delete` hapus TIM |
| POST | `/api/admin/schedule/generate` | admin | Isi otomatis sebulan dari TIM (`bulan`) |
| POST | `/api/admin/schedule/fill-gaps` | admin | Tambal kekosongan pakai host backup (`bulan`) |
| POST | `/api/admin/schedule/lock` | admin | Kunci / buka kunci bulan (`action=unlock`) |
| POST | `/api/admin/host/create` | admin | Tambah host |
| POST | `/api/admin/host/update` | admin | Edit akun, atau aktif/nonaktif (`action=toggle`) |
| POST | `/api/admin/session/update` | admin | Koreksi hasil sesi `selesai` + catatan + verifikasi |
| POST | `/api/admin/session/verify` | admin | Verifikasi massal (`id[]`, kembali ke `next` yang valid) |

Semua aksi tulis diakhiri redirect untuk menampilkan pesan sukses/error. Role dan kepemilikan data dicek di server.

---

## 10. Persyaratan Non-Fungsional

| Aspek | Persyaratan |
| --- | --- |
| Zona waktu | Seluruh logika tanggal/jam memakai Asia/Jakarta (UTC+7) |
| Format | Locale `id-ID` (pemisah ribuan titik); uang berawalan `Rp` |
| Performa | Server-rendered (Next.js App Router); auto-refresh dashboard 60 detik dan jeda saat tab tersembunyi |
| Kompatibilitas | Bootstrap 4 / SkyDash; tanpa CDN (aset disalin lokal) |
| Keamanan | Lihat §12 |
| Data | SQLite lokal; reset = hapus `data/hostlive.db*` lalu jalankan ulang |
| Lingkungan | Node ≥ 24. Dev: `pnpm dev` (port 3100). Produksi: `pnpm build && node server/index.ts --prod`. Tes: `pnpm test` (logika slot, tanggal Jakarta, sesi menggantung) dan `pnpm type-check` |

---

## 11. Kasus Tepi

| # | Situasi | Perilaku |
| --- | --- | --- |
| 1 | Aplikasi ditutup saat `menunggu_hasil` | Form hasil tampil lagi saat login; sesi baru tetap diblokir |
| 2 | Slot sudah terpakai | Opsi dinonaktifkan dengan label “— terpakai” (klien) dan ditolak server (`taken`) |
| 3 | Di luar jendela mulai | Opsi dinonaktifkan dengan label “— di luar waktu” (klien) dan ditolak server (`window`) |
| 4 | Lewat tengah malam | “Hari ini” mengikuti Jakarta, bukan jam server |
| 5 | Host bentrok jadwal di jam yang sama | Ditolak (`host_clash`), termasuk saat ganti host |
| 6 | Sesi menggantung | Ditandai di dashboard admin, dengan link ke detail sesi |
| 7 | Verifikasi massal tanpa pilihan | Muncul alert; hanya sesi `selesai` yang bisa dicentang |
| 8 | Sesi dibiarkan `berjalan` melewati akhir slot | Dibolehkan (slot hanya patokan), tetapi dianggap menggantung setelah 2 jam |
| 9 | Ganti password | Login perangkat lain dihapus; perangkat saat ini dipertahankan |
| 10 | Slot berisi host yang kemudian nonaktif | Jadwal lama tetap tampil; penggantian hanya bisa memilih host aktif |
| 11 | Tanggal/bulan tidak valid pada query | Fallback ke tanggal/bulan berjalan (Jakarta) |

---

## 12. Keamanan

- Password di-hash dengan **scrypt**; tidak pernah disimpan atau ditampilkan polos.
- Cookie token: `HttpOnly`, `SameSite=Lax`, `Secure` di produksi, berlaku 7 hari.
- Guard rute server-side per area (`/host*`, `/dashboard*`, `/api/*`) disertai pengecekan role.
- Query milik host selalu difilter `user_id`, sehingga host tidak bisa melihat atau mengubah data host lain.
- Admin tidak bisa mengubah sesi yang belum `selesai`.
- **Sebelum produksi:** wajib HTTPS, ganti akun demo, tambah rate limit login dan token CSRF (lihat §13).

---

## 13. Backlog

| # | Item | Catatan |
| --- | --- | --- |
| 1 | Audit log perubahan hasil oleh admin | Belum ada jejak siapa mengubah apa |
| 2 | Pagination tabel sesi admin | Saat ini dibatasi `LIMIT 300` |
| 3 | Rate limit login dan token CSRF | Mitigasi saat ini hanya cookie `SameSite=Lax` |
| 4 | Migrasi skema bertahap | Saat ini menaikkan versi = rebuild DB dev (aman selama belum ada data produksi) |
| 5 | Onboarding akun produksi | Akun demo di-seed otomatis; belum ada mekanisme penggantian terkelola |

---

## 14. Pertanyaan Terbuka

Hal-hal di bawah tidak terjawab di dokumen versi 1.0. Mohon dikonfirmasi lalu dimasukkan ke aturan bisnis.

| # | Pertanyaan | Mengapa penting |
| --- | --- | --- |
| 1 | Bila host tidak merespons, bagaimana sesi menggantung ditutup? Admin hanya bisa mengedit sesi `selesai` (BR-9), sementara host diblokir memulai sesi baru (BR-4). | Berpotensi membuat host terkunci |
| 2 | Apakah host boleh memulai sesi manual di studio+slot yang dijadwalkan untuk host lain, atau di studio/slot yang berbeda dari jadwalnya sendiri? Server hanya mengecek sesi yang sudah ada (`taken`), bukan jadwal. | Jadwal bisa terlewati tanpa konsekuensi |
| 3 | Apakah angka “hari ini”, rekap bulanan, dan performa hanya menghitung sesi `selesai`, atau semua status? Apakah hanya yang terverifikasi? | Menentukan arti angka GMV dan komisi |
| 4 | Apakah admin boleh menjadwalkan tanggal yang sudah lewat? Adakah batas ke depan? | Validasi jadwal belum jelas |
| 5 | Apa yang terjadi pada sesi terbuka dan jadwal mendatang bila host dinonaktifkan? | Konsistensi data |
| 6 | Apakah admin perlu cara mengganti password sendiri? Halaman Profil hanya ada untuk host. | Akun admin demo sulit diganti |
| 7 | Indikator keberhasilan (misalnya persentase sesi dengan hasil lengkap) belum didefinisikan. | Tidak ada tolok ukur keberhasilan produk |

---

## 15. Kriteria Penerimaan

**Host**

- [ ] Host dapat login dan hanya melihat data miliknya.
- [ ] Host bisa memulai sesi dari jadwal hari ini atau manual, hanya dalam jendela mulai (BR-3).
- [ ] Host tidak bisa memulai sesi baru selama ada sesi `berjalan`/`menunggu_hasil` (BR-4).
- [ ] Host bisa melaporkan absennya sendiri selama masih di atas batas lapor (BR-14).
- [ ] Timer durasi live berjalan real-time; tombol Berhenti meminta konfirmasi dengan durasi.
- [ ] Hasil wajib 4 angka valid; sesi masuk riwayat setelah disimpan; durasi = waktu berhenti − waktu mulai aktual.
- [ ] Form hasil muncul kembali bila sesi ditinggalkan sebelum diisi (BR-5).
- [ ] Jadwal, performa (grafik 6 bulan dan harian), riwayat bulanan, dan profil berfungsi sesuai §6.2.

**Admin**

- [ ] Dashboard menampilkan sesi live, status studio, statistik hari ini, alert menggantung, dan auto-refresh 60 detik.
- [ ] Matriks jadwal bisa tambah/ganti/hapus host; bentrok dan host nonaktif ditolak dengan pesan jelas (BR-6 sampai BR-8).
- [ ] Admin dapat membuat jadwal sebulan dalam beberapa klik (generator draft) dan hasilnya memenuhi kapasitas studio; kekurangan tenaga dilaporkan sebagai shortfall (BR-12).
- [ ] Kelola host: tambah, edit, aktif/nonaktif; nonaktif memutus sesi login host.
- [ ] Semua sesi bisa difilter; verifikasi massal hanya menyentuh sesi selesai.
- [ ] Hasil sesi selesai bisa dikoreksi + catatan + verifikasi; sesi non-selesai tidak bisa diedit (BR-9).
- [ ] Rekap bulanan per host benar dan ekspor CSV terbuka rapi di Excel (BOM UTF-8).
- [ ] Satu host absen: sistem langsung menyarankan pengganti tanpa perlu diskusi (BR-15).
- [ ] Dua host absen: kursi kosong diurutkan menurut prioritas studio dari GMV per jam (BR-16).
- [ ] Semua host dapat melihat counter keadilan dan jadwal bulan terkunci (A2c, H2b).

**Umum**

- [ ] Seluruh waktu tampil dalam zona Jakarta; angka dan Rupiah berformat `id-ID`.
- [ ] Akses per role dan kepemilikan data dipaksa di server, bukan hanya di UI.
- [ ] `npm test` dan `npx tsc --noEmit` lolos; mode produksi berjalan dari `next build`.

---

## 16. Riwayat Revisi

| Versi | Tanggal | Perubahan |
| --- | --- | --- |
| 1.6 | 9 Nov 2026 | **Penjadwalan berbasis TIM.** Tabel baru `shift_teams` (nama, studio, window jam, `slot_minutes`, `member_quota`) dan `team_members`. Window TIM dipotong jadi giliran per jam lalu dibagikan bergilir ke anggotanya; host yang libur dilewati. Studio tanpa TIM tidak dijadwalkan otomatis. Halaman baru **Kelola TIM** (buat/ubah/hapus TIM + susun anggota). Setelan shift per host (`week1_shift_id`/`week2_shift_id`) dilepas (migrasi v6→v7). Aturan bisnis ditulis ulang BR-6..BR-15. |
| 1.5 | 9 Nov 2026 | **Shift Cellular dihapus.** Daftar shift kini tetap tiga: Pagi, Siang, Middle. Migrasi v5→v6 memindahkan baris jadwal dan setelan `week1_shift_id`/`week2_shift_id` yang menunjuk Cellular ke Pagi, lalu menghapus baris shift itu. Menu pemilihan shift di halaman host tidak lagi menampilkan Cellular. |
| 1.4 | 9 Nov 2026 | **Host backup.** `users.is_backup` menandai host cadangan; host backup dilewati generator dan dipakai menambal kekosongan lewat `findGaps()` + `fillGapsWithBackup()` (round-robin, tanpa dobel shift). Halaman Kelola host menampilkan badge **Fokus**/**Backup** + tombol tukar peran; papan jadwal menyorot baris backup dan menyediakan tombol “Isi kekosongan (backup)”. Tambah BR-13. |
| 1.3 | 9 Nov 2026 | **Penjadwalan disederhanakan total.** Hapus generator rotasi berbasis kapasitas, tangga cadangan/absen, halaman Keadilan, dan alur tukar shift. Jadwal kini per host: 3 shift (Pagi 06–15, Siang 13–22, Middle 08–17) dipilih bebas admin; rotasi Pagi↔Siang per **1 minggu** per host (`rotation_offset`); Libur 1 hari/minggu per host yang harinya **maju satu hari tiap bulan** (`leave_weekday`). Skema naik ke v3; tabel `capacity`, `studio_shifts`, `absences`, `substitutions`, `swap_requests` dihapus. Halaman Jadwal jadi papan host × tanggal dengan satu tombol "Isi otomatis". Aturan bisnis ditulis ulang BR-1..BR-12. |
| 1.2 | 9 Nov 2026 | **Sistem penjadwalan diganti dari slot 1 jam menjadi shift** (Pagi/Siang/Middle/Cellular). Jam operasional 06:00–22:00. Skema naik ke v2 dengan migrasi otomatis + cadangan `data/backup-v1.db`; batasan UNIQUE per slot diganti tabel `capacity` yang bisa diubah admin. Halaman jadwal admin menjadi matriks host × hari dengan generator rotasi, kunci bulan, dan shortfall yang dilaporkan. Tambah alur absen + pengganti berurutan (`absences`, `substitutions`) dan halaman Keadilan untuk admin & host. Perbarui §3 glosarium, §4 aturan bisnis (BR-1..BR-17), §6 halaman, §8 model data, §9 rute. Perbaiki klaim stack (Next.js 16 + React 19, bukan Express/Handlebars/Vite) dan perintah verifikasi (`npm test`, `npx tsc --noEmit`). |
| 1.1 | 8 Nov 2026 | Tambah Ringkasan Satu Menit; bedakan versi dokumen dan versi aplikasi; perbaiki rujukan antar-bagian yang salah (§14 → §13, §13 → §12); pisahkan istilah Jadwal vs Sesi; ubah aturan menjadi tabel/ID (BR-1 sampai BR-10); gabungkan tabel error ganda ke §7; seragamkan istilah (“estimasi komisi”); tambah contoh jendela mulai; tambah Pertanyaan Terbuka (§14) |
| 1.0 | 8 Nov 2026 | Versi awal |

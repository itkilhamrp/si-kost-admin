# 🏠 Si‑LibreKost-Admin

Aplikasi manajemen rumah kos **offline‑first** berbasis Tauri v2 + Vanilla Web.  
Dibangun untuk pemilik kos yang ingin mengelola data kamar, penghuni, dan keuangan
langsung dari HP Android maupun desktop Linux/Windows/macOS.

![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)
![Rust](https://img.shields.io/badge/Rust-1.77+-DEA584?logo=rust)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/license-AGPL_v3-blue)

---

## ✨ Fitur Utama

- **Multi‑Page (MPA)** – navigasi antar halaman yang cepat tanpa framework SPA.
- **Mode Gelap / Terang / Otomatis** – tema disimpan lokal, bebas flash putih.
- **Manajemen Data**:
  - Rumah kos, kamar, fasilitas unit.
  - Data kontak penghuni.
  - Penghuni aktif & riwayat kamar.
  - Pembayaran & ringkasan keuangan.
- **Offline‑first** – semua data disimpan di SQLite lokal.
- **Android & Desktop** – satu basis kode, dua platform.
- **UI Responsif** – optimal di layar kecil (Android) maupun desktop.
- **Dialog kustom** – konfirmasi hapus, logout, dll. tanpa `confirm()` bawaan.

---

## 🧰 Teknologi

| Lapisan   | Teknologi                          |
|-----------|------------------------------------|
| Frontend  | HTML, CSS, JavaScript (Vanilla)    |
| Bundler   | Vite 6                             |
| Backend   | Rust (Tauri v2)                    |
| Database  | SQLite (via `rusqlite`)            |
| Platform  | Android (APK) & Desktop            |

---

## 📋 Prasyarat

- **Node.js** ≥ 18 + **pnpm** (direkomendasikan) atau npm
- **Rust** ≥ 1.77 (https://rustup.rs)
- **Android SDK & NDK** (hanya untuk build Android)
  - Android SDK Platform 33+
  - NDK 26.1.10909125 atau yang direkomendasikan Tauri
  - Environment variable `ANDROID_HOME` diarahkan ke SDK
- **Keystore** untuk menandatangani APK (development: `my-release-key.keystore`, password `123456`)

---

## 🚀 Mulai Cepat

### 1. Clone & Install Dependensi

```bash
git clone [https://github.com/username/si-kost-admin.git](https://github.com/username/si-kost-admin.git)
cd si-librekost-admin
pnpm install
```

### 2. Jalankan di Desktop (Dev Mode)

```bash
pnpm tauri dev
```

Aplikasi akan terbuka di jendela desktop dengan hot‑reload.

### 3. Build APK Android

Pastikan Android SDK sudah di‑setup, lalu jalankan:

```bash
npm run build-android
```

APK yang sudah ditandatangani akan muncul sebagai `Si-LibreKost-Admin.apk` di root proyek.

> **Catatan:** Password keystore yang digunakan adalah `123456` (development). Untuk produksi, ganti dengan keystore Anda sendiri dan perbarui script di `package.json`.

---

## ⚙️ Konfigurasi Penting

| File | Fungsi |
|------|--------|
| `src-tauri/tauri.conf.json` | Konfigurasi jendela, build, CSP, dll. |
| `vite.config.js` | Build frontend, MPA entry, plugin anti‑flash |
| `package.json` | Script npm, dependensi |
| `src-tauri/src/lib.rs` | Backend Rust: database, perintah, tema |
| `src-tauri/Cargo.toml` | Dependensi Rust & profil rilis |

### Warna Latar Jendela (Anti‑Flash Putih)
Untuk mencegah layar putih sekejap saat navigasi, kami mengatur `backgroundColor` di `tauri.conf.json` dan menyisipkan script/inline style otomatis melalui plugin Vite. Jika Anda mengubah tema, warna latar akan menyesuaikan.

---

## 📁 Struktur Proyek

```text
si-librekost-admin/
├── src/                     # Sumber frontend
│   ├── assets/              # Aset statis (favicon, gambar)
│   ├── css/                 # Stylesheet
│   │   ├── styles.bundle.min.css
│   │   ├── mobile.css
│   │   ├── desktop.css
│   │   └── _partials/       # Partials CSS (opsional)
│   ├── js/                  # JavaScript
│   │   ├── core/            # API, auth, theme, utils
│   │   ├── pages/           # Inisialisasi halaman
│   │   └── ui/              # Komponen UI (toast, datepicker, sidebar)
│   ├── page/                # Halaman HTML (login, settings, dll.)
│   └── index.html           # Beranda
├── src-tauri/               # Backend Rust
│   ├── src/
│   │   ├── main.rs          # Entry point
│   │   ├── lib.rs           # Setup builder & command
│   │   ├── db.rs            # Inisialisasi SQLite
│   │   ├── models.rs        # Struct data
│   │   ├── commands/        # Perintah Tauri (auth, unit, rumah, dll.)
│   │   └── error.rs         # Error handling
│   ├── Cargo.toml
│   ├── icons/               # Ikon aplikasi
│   └── gen/android/         # Proyek Android (auto‑generated)
├── dist/                    # Output build frontend
├── package.json
├── vite.config.js
├── README.md
└── LICENSE
```

---

## 🖥️ Penggunaan Aplikasi

### Login
Akun dibuat secara lokal. Saat pertama kali, Anda akan diminta membuat akun admin.

### Navigasi
Gunakan Sidebar (desktop) atau Bottom Navigation (mobile) untuk berpindah halaman.
* Halaman utama menampilkan daftar rumah kos.
* Klik kartu kos untuk melihat detail kamar.
* Di detail kamar, Anda bisa menambah/edit kamar, melihat penghuni, pembayaran, dll.

### Manajemen Data
* Tambah data melalui form di masing‑masing halaman.
* Hapus data akan memunculkan dialog konfirmasi bergaya material.
* Cache disimpan untuk mempercepat akses; bisa dihapus dari halaman Pengaturan.

### Tema
Buka Pengaturan, pilih tema: Terang, Gelap, atau Otomatis (mengikuti sistem).

---

## 🔧 Troubleshooting

### Elemen rusak atau layout berantakan di Android
Pastikan file CSS tersalin ke folder `dist/`. Jalankan ulang build:

```bash
npm run build:frontend
```
Jika masih rusak, hapus folder `dist/` dan build ulang.

### Aplikasi crash saat `pnpm tauri dev`
Pastikan tidak ada duplikasi pemanggilan `tauri dev` di script `package.json` (sudah diperbaiki dalam versi ini).

### Flash putih saat pindah halaman
* Pastikan `backgroundColor` di `tauri.conf.json` sudah sesuai dengan tema.
* Script anti-flash sudah terinjeksi otomatis; jangan hapus plugin `injectAntiFlash` di `vite.config.js`.

### Build Android gagal
* Cek apakah `ANDROID_HOME` dan NDK sudah terinstal dengan benar.
* Pastikan file `my-release-key.keystore` ada di root proyek, dengan password `123456`.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **GNU Affero General Public License v3.0**.

Dibangun dengan 🧠 oleh **ORANG**
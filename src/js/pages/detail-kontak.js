/**
 * pages/detail-kontak.js — Detail kontak penghuni
 * v2: tambah fitur Pindah Kamar via tombol "Lainnya" toggle
 */
import { getKontakById, hapusKontak } from "../core/api.js";
import { requireAuth }  from "../core/auth.js";
import { Theme }        from "../core/theme.js";
import { buildUrl }     from "../core/utils.js";
import { showToast }    from "../ui/toast.js";
import { showDropdown } from "../ui/dropdown.js";

export async function initDetailKontak() {
  const _st = new URLSearchParams(location.search).get("status");
  if (_st === "edited") setTimeout(() => showToast("Kontak diperbarui ✅"), 200);
  if (_st === "pindah") setTimeout(() => showToast("Penghuni berhasil dipindah! 🔄"), 200);
  if (!requireAuth()) return;
  Theme.init();

  const params   = new URLSearchParams(location.search);
  const idKontak = parseInt(params.get("id"));
  if (!idKontak) { location.replace("/page/kontak_penghuni.html"); return; }

  let kontak;
  try {
    kontak = await getKontakById(idKontak);
  } catch (e) {
    showToast("Gagal memuat kontak.", "error");
    setTimeout(() => location.replace("/page/kontak_penghuni.html"), 1200);
    return;
  }

  document.getElementById("judul-kontak").textContent = kontak.nama;

  document.getElementById("dialog-overlay")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) closeDialog();
  });

  /* ── Profile Card ── */
  const inisial = kontak.nama.charAt(0).toUpperCase();
  const jkCls   = kontak.jenis_kelamin === "Pria" ? "laki" : "perempuan";
  const jkLabel = kontak.jenis_kelamin === "Pria" ? "👨 Pria" : "👩 Wanita";
  const avatar  = kontak.foto_profil
    ? `<img src="${kontak.foto_profil}" alt="${kontak.nama}">`
    : `<span class="kdh-avatar-initials">${inisial}</span>`;

  document.getElementById("kontak-profile-card").innerHTML = `
    <div class="kontak-detail-header">
      <div class="kdh-avatar">${avatar}</div>
      <div class="kdh-body">
        <p class="kdh-nama">${kontak.nama}</p>
        <div class="kdh-meta">
          <span class="kontak-jk-badge ${jkCls}">${jkLabel}</span>
          ${kontak.no_hp
            ? `<button class="kdh-no-hp kdh-copy-hp" data-hp="${kontak.no_hp}" title="Tap untuk copy">📞 ${kontak.no_hp}</button>`
            : `<span class="kdh-no-hp" style="color:var(--text-3)">Tidak ada HP</span>`}
        </div>
        ${kontak.deskripsi
          ? `<p style="font-size:.82rem;color:var(--text-2);margin-top:var(--sp-2);line-height:1.55">${kontak.deskripsi}</p>`
          : ""}
        <div class="kdh-actions">
          <a href="${buildUrl("/page/edit_kontak_penghuni.html", { id: idKontak })}"
             class="btn-secondary" style="font-size:.8rem;padding:7px 14px">✏️ Edit</a>
          <button class="btn-outline-danger" id="btn-hapus-kontak"
             style="width:auto;margin-top:0;padding:7px 14px;font-size:.8rem">🗑️ Hapus</button>
        </div>
      </div>
    </div>
    ${kontak.foto_ktp ? `
      <div class="info-card ktp-card">
        <p class="info-label">📋 Foto Kartu Identitas</p>
        <div class="ktp-img-wrap" id="ktp-viewer-trigger" title="Klik untuk perbesar">
          <img src="${kontak.foto_ktp}" alt="Kartu Identitas" class="ktp-img">
          <div class="ktp-zoom-hint">🔍 Tap untuk perbesar</div>
        </div>
      </div>
      <!-- KTP Lightbox -->
      <div class="ktp-lightbox" id="ktp-lightbox" role="dialog" aria-label="Lihat KTP">
        <button class="ktp-lb-close" id="ktp-lb-close" aria-label="Tutup">✕</button>
        <div class="ktp-lb-inner">
          <img src="${kontak.foto_ktp}" alt="Kartu Identitas" class="ktp-lb-img">
        </div>
        <p class="ktp-lb-hint">Tap di luar gambar untuk menutup</p>
      </div>` : ""}`;

  document.getElementById("btn-hapus-kontak")?.addEventListener("click", () => konfirmasiHapus(kontak));

  /* ── KTP Lightbox ── */
  const ktpTrigger  = document.getElementById("ktp-viewer-trigger");
  const ktpLightbox = document.getElementById("ktp-lightbox");
  const ktpClose    = document.getElementById("ktp-lb-close");
  if (ktpTrigger && ktpLightbox) {
    const openLb  = () => { ktpLightbox.classList.add("active"); document.body.style.overflow = "hidden"; };
    const closeLb = () => { ktpLightbox.classList.remove("active"); document.body.style.overflow = ""; };
    ktpTrigger.addEventListener("click", openLb);
    ktpClose?.addEventListener("click", closeLb);
    // tap di luar gambar = tutup
    ktpLightbox.addEventListener("click", (e) => {
      if (e.target === ktpLightbox || e.target.classList.contains("ktp-lb-inner") || e.target.classList.contains("ktp-lb-hint")) closeLb();
    });
    // ESC = tutup
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });
  }

  // Copy no HP
  document.querySelector(".kdh-copy-hp")?.addEventListener("click", async (e) => {
    const hp = e.currentTarget.dataset.hp;
    try {
      await navigator.clipboard.writeText(hp);
      showToast(`📋 ${hp} disalin!`);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = hp; ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
      showToast(`📋 ${hp} disalin!`);
    }
  });

  /* ── Status Hunian ── */
  const statusEl = document.getElementById("kontak-status-card");
  if (kontak.kamar_aktif) {
    const kamarUrl = buildUrl("/page/detail_kamar.html", {
      id:        kontak.id_kamar_aktif,
      idRumah:   kontak.id_rumah_aktif,
      nama:      kontak.no_kamar_aktif,
      namaRumah: kontak.nama_rumah_aktif,
    });
    const pindahUrl = buildUrl("/page/pindah_kamar.html", {
      idPenghuni:    kontak.id_penghuni_aktif,
      idKontakAsal:  idKontak,
      namaKontak:    kontak.nama,
      idKamarAsal:   kontak.id_kamar_aktif,
      namaKamarAsal: kontak.no_kamar_aktif,
      namaRumahAsal: kontak.nama_rumah_aktif,
    });

    statusEl.innerHTML = `
      <div class="info-card" style="margin-bottom:var(--sp-2)">
        <p class="info-label">Status Hunian</p>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--sp-2)">
          <div>
            <p style="font-weight:700;font-size:.95rem;color:var(--green-dk)">🏠 Sedang Menghuni</p>
            <p style="font-size:.83rem;color:var(--text-2);margin-top:3px">${kontak.kamar_aktif}</p>
          </div>
          <span class="badge badge-green">Aktif</span>
        </div>
        <div class="info-actions" style="flex-wrap:wrap">
          <a href="${kamarUrl}" class="btn-secondary" style="font-size:.8rem;padding:7px 14px">
            🚪 Lihat Kamar
          </a>
          <button class="btn-secondary" id="btn-lainnya"
            style="font-size:.8rem;padding:7px 14px">
            ⋯ Lainnya
          </button>
        </div>
        <!-- Dropdown opsi lainnya — tersembunyi by default -->
        <div id="opsi-lainnya" class="opsi-lainnya-wrap hidden">
          <a href="${pindahUrl}" class="opsi-lainnya-item">
            <span class="opsi-lainnya-icon">🔄</span>
            <div>
              <p class="opsi-lainnya-label">Pindah Kamar</p>
              <p class="opsi-lainnya-desc">Pindahkan ke kamar lain, data pembayaran tetap tersimpan</p>
            </div>
            <span style="color:var(--text-3);font-size:1.1rem">›</span>
          </a>
        </div>
      </div>`;

    // Toggle tombol Lainnya
    document.getElementById("btn-lainnya")?.addEventListener("click", () => {
      const opsi = document.getElementById("opsi-lainnya");
      const btn  = document.getElementById("btn-lainnya");
      const open = opsi.classList.toggle("hidden");
      // open = true artinya baru di-hide → tampilkan "Lainnya"
      // open = false artinya sedang tampil → tampilkan "Sembunyikan"
      btn.textContent = open ? "⋯ Lainnya" : "✕ Sembunyikan";
    });

  } else {
    const assignUrl = buildUrl("/page/add_penghuni_kamar.html", {
      idKontak,
      namaKontak: kontak.nama,
    });
    statusEl.innerHTML = `
      <div class="info-card" style="text-align:center;padding:var(--sp-5);margin-bottom:var(--sp-2)">
        <p style="font-size:2rem;margin-bottom:var(--sp-2)">🏠</p>
        <p style="font-weight:600;color:var(--text);margin-bottom:var(--sp-1)">Tidak Sedang Menghuni</p>
        <p style="font-size:.82rem;color:var(--text-3);margin-bottom:var(--sp-4)">
          Kontak ini belum ditempatkan di kamar manapun.
        </p>
        <a href="${assignUrl}" class="save-btn"
           style="display:inline-flex;text-decoration:none;padding:11px 28px;max-width:240px;margin:0 auto">
          ➕ Tempatkan ke Kamar
        </a>
      </div>`;
  }

  /* ── Opsi menu titik 3 ── */
  document.getElementById("btn-opsi-kontak")?.addEventListener("click", (e) => {
    e.stopPropagation();
    showDropdown(e.currentTarget, [
      { label: "✏️ Edit Kontak",
        action: () => location.href = buildUrl("/page/edit_kontak_penghuni.html", { id: idKontak }) },
      { label: "🗑️ Hapus Kontak", danger: true,
        action: () => konfirmasiHapus(kontak) },
    ]);
  });
}

/* ── Dialog helpers ── */
function openDialog(html) {
  const el = document.getElementById("dialog-content");
  const ov = document.getElementById("dialog-overlay");
  if (el) el.innerHTML = html;
  if (ov) ov.classList.add("active");
}
function closeDialog() {
  document.getElementById("dialog-overlay")?.classList.remove("active");
}

async function konfirmasiHapus(kontak) {
  openDialog(`
    <div class="dialog-icon danger">🗑️</div>
    <p class="dialog-title">Hapus Kontak?</p>
    <p class="dialog-body">
      Hapus data kontak <strong>${kontak.nama}</strong>?<br>
      Riwayat hunian yang sudah ada tidak akan terhapus.
    </p>
    <div class="dialog-actions">
      <button class="dialog-btn btn-red"   id="dlg-konfirm">Ya, Hapus</button>
      <button class="dialog-btn btn-ghost" id="dlg-batal">Batal</button>
    </div>`);
  document.getElementById("dlg-batal").onclick   = closeDialog;
  document.getElementById("dlg-konfirm").onclick = async () => {
    closeDialog();
    try {
      await hapusKontak(kontak.id_kontak);
      showToast("Kontak dihapus.");
      setTimeout(() => location.replace("/page/kontak_penghuni.html"), 800);
    } catch (e) {
      showToast("Gagal: " + e, "error");
    }
  };
}
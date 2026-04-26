/**
 * pages/detail-kost.js — v2
 */
import {
  getKamarByRumah, togglePinRumah, hapusRumah,
  getRingkasanKeuangan, getSemualRumah
} from "../core/api.js";
import { requireAuth }      from "../core/auth.js";
import { Theme }            from "../core/theme.js";
import { getParams, buildUrl, formatRupiah } from "../core/utils.js";
import { showToast }        from "../ui/toast.js";
import { showConfirmTyped } from "../ui/modal.js";
import { showDropdown }     from "../ui/dropdown.js";
import { startLiveClock }   from "../ui/clock.js";

export async function initDetailKost() {
  if (!requireAuth()) return;
  Theme.init();
  startLiveClock("live-time");

  const params    = getParams();
  const idRumah   = parseInt(params.get("id"));
  const namaRumah = params.get("nama") ?? "";

  document.getElementById("judul-kost").textContent = namaRumah;

  const status = params.get("status");
  if (status === "kamar_added") showToast("Kamar berhasil ditambahkan! 🎉");
  else if (status === "edited") showToast("Rumah kos berhasil diperbarui! ✅");
  if (status) history.replaceState({}, "", buildUrl("/page/detail_kost.html", { id: idRumah, nama: namaRumah }));

  // Bind tombol tambah kamar (desktop)
  document.getElementById("btn-desktop-tambah-kamar")?.addEventListener("click", () => {
    location.href = buildUrl("/page/add_kamar_kost.html", { id: idRumah, nama: namaRumah });
  });

  // Bind tombol tambah kamar (mobile FAB)
  document.getElementById("btn-fab-kamar")?.addEventListener("click", () => {
    location.href = buildUrl("/page/add_kamar_kost.html", { id: idRumah, nama: namaRumah });
  });

  document.getElementById("btn-opsi-rumah")?.addEventListener("click", (e) => {
    e.stopPropagation();
    showDropdown(e.currentTarget, [
      { label: "✏️ Edit Rumah",
        action: () => location.href = buildUrl("/page/edit_rumah_kost.html", { id: idRumah, nama: namaRumah }) },
      { label: "📌 Toggle Pin",
        action: async () => { await togglePinRumah(idRumah); showToast("Status pin diperbarui."); } },
      { label: "🗑️ Hapus Rumah", danger: true,
        action: () => showConfirmTyped(
          `Hapus "${namaRumah}" beserta semua kamar dan datanya?`, "HAPUS",
          async () => { await hapusRumah(idRumah); location.replace("/index.html"); }
        )},
    ]);
  });

  let _allKamar = [];

  // Skeleton
  document.getElementById("list-kamar").innerHTML = Array.from({ length: 3 }, (_, i) => `
    <div class="kamar-card skeleton-card" style="animation-delay:${i * 55}ms">
      <div class="kamar-thumb skeleton skeleton-img"></div>
      <div class="kamar-info">
        <div class="skeleton skeleton-line w-55" style="height:12px;margin-bottom:6px"></div>
        <div class="skeleton skeleton-line w-80" style="height:9px;margin-bottom:4px"></div>
        <div class="skeleton skeleton-line w-40" style="height:9px"></div>
      </div>
    </div>`).join("");

  async function reload() {
    const [kamarList, ringkasan, rumahList] = await Promise.all([
      getKamarByRumah(idRumah).catch(() => []),
      getRingkasanKeuangan(idRumah).catch(() => null),
      getSemualRumah().catch(() => []),
    ]);
    _allKamar = kamarList;
    const rumah  = rumahList.find(r => r.id_rumah === idRumah);
    const alamat = rumah?.alamat ?? "";
    const subEl  = document.getElementById("sub-alamat");
    if (subEl) subEl.textContent = alamat ? "📍 " + alamat : "";
    renderBanner(namaRumah, alamat, kamarList, ringkasan);
    renderKamar(kamarList);
  }

  function renderBanner(nama, alamat, kamarList, ringkasan) {
    const el = document.getElementById("rumah-banner");
    if (!el) return;
    const kosong = kamarList.filter(k => k.status === "Kosong").length;
    const terisi = kamarList.filter(k => k.status === "Terisi").length;
    const penuh  = kamarList.filter(k => k.status === "Penuh").length;
    const total  = kamarList.length;
    const bln    = ringkasan?.bulan_ini ?? 0;
    el.innerHTML = `
      <div class="rumah-banner">
        <div class="rb-info">
          <p class="rb-nama">🏠 ${nama}</p>
          ${alamat ? `<p class="rb-alamat">📍 ${alamat}</p>` : ""}
          <p class="rb-alamat" style="margin-top:1px">📋 ${total} kamar terdaftar</p>
        </div>
        <div class="rb-stats">
          <div class="rb-stat green">
            <span class="rb-stat-val">${kosong}</span>
            <span class="rb-stat-label">Kosong</span>
          </div>
          <div class="rb-stat amber">
            <span class="rb-stat-val">${terisi}</span>
            <span class="rb-stat-label">Terisi</span>
          </div>
          ${penuh > 0 ? `<div class="rb-stat red">
            <span class="rb-stat-val">${penuh}</span>
            <span class="rb-stat-label">Penuh</span>
          </div>` : ""}
          ${ringkasan ? `<div class="rb-stat blue">
            <span class="rb-stat-val">${formatRupiah(bln)}</span>
            <span class="rb-stat-label">Bln Ini</span>
          </div>` : ""}
        </div>
      </div>`;
  }

  function renderKamar(list) {
    const el = document.getElementById("list-kamar");
    if (!list.length) {
      el.innerHTML = `<p class="empty-state">Belum ada kamar.<br>Tekan <strong>+</strong> untuk menambahkan.</p>`;
      return;
    }

    const adaLantai = list.some(k => k.lantai && k.lantai.trim());
    const grouped   = {};
    if (adaLantai) {
      list.forEach(k => {
        const key = k.lantai?.trim() || "—";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(k);
      });
    } else {
      grouped[""] = list;
    }

    let html    = "";
    let animIdx = 0;

    for (const [lantai, kamarLantai] of Object.entries(grouped)) {
      if (adaLantai) {
        html += `<div class="lantai-header">Lantai ${lantai}</div>`;
      }

      kamarLantai.forEach(k => {
        const url = buildUrl("/page/detail_kamar.html", {
          id: k.id_kamar, idRumah, nama: k.no_kamar, namaRumah
        });
        const chips = (k.unit ?? []).map(u =>
          `<span class="unit-chip">${u.ikon} ${u.nama}</span>`
        ).join("");
        const adaDiskon = k.diskon > 0;
        const dotCls  = k.status === "Kosong" ? "kosong" : k.status === "Penuh" ? "penuh" : "terisi";
        const badgeCls = k.status === "Kosong" ? "badge-green" : k.status === "Penuh" ? "badge-red" : "badge-amber";
        const jkIcon  = { Bebas: "", Pria: "👨", Wanita: "👩" }[k.jenis_kelamin] ?? "";
        const kapBadge = k.kapasitas > 1
          ? `<span class="kamar-kap-badge">${k.jumlah_penghuni}/${k.kapasitas}</span>`
          : "";

        // Simpan url di data-url, hapus onclick inline
        html += `
          <div class="kamar-card" style="animation-delay:${animIdx++ * 40}ms"
               data-url="${url}">
            <div class="kamar-thumb">
              ${k.gambar
                ? `<img src="${k.gambar}" alt="Kamar ${k.no_kamar}" loading="lazy">`
                : `<span class="kamar-thumb-emoji">🚪</span>`}
              <span class="kamar-dot ${dotCls}"></span>
              ${kapBadge}
            </div>
            <div class="kamar-info">
              <p class="kamar-no-text">
                Kamar ${k.no_kamar}${jkIcon
                  ? ` <span style="font-size:.75rem">${jkIcon}</span>`
                  : ""}
              </p>
              <div class="kamar-harga-stack">
                ${adaDiskon
                  ? `<p class="kamar-harga-coret">${formatRupiah(k.harga)}</p>`
                  : ""}
                <p class="kamar-harga-text${adaDiskon ? " with-diskon" : ""}">
                  ${formatRupiah(k.harga_efektif)}<span>/bln</span>
                </p>
                ${adaDiskon
                  ? `<span class="kamar-diskon-pill">-${k.diskon}%</span>`
                  : ""}
              </div>
              <div class="kamar-badge-row">
                <span class="badge ${badgeCls}">${k.status}</span>
              </div>
            </div>
            ${chips ? `<div class="kamar-chips">${chips}</div>` : ""}
          </div>`;
      });
    }

    el.innerHTML = html;

    // Event delegation — satu listener untuk semua kamar-card
    el.addEventListener("click", (e) => {
      const card = e.target.closest(".kamar-card[data-url]");
      if (!card) return;
      location.href = card.dataset.url;
    });
  }

  await reload();

  const qIn  = document.getElementById("q-kamar");
  const qClr = document.getElementById("q-kamar-clear");
  qIn?.addEventListener("input", () => {
    const q = qIn.value.trim().toLowerCase();
    qClr?.classList.toggle("hidden", !q);
    renderKamar(!q ? _allKamar : _allKamar.filter(k =>
      k.no_kamar.toLowerCase().includes(q)
    ));
  });
  qClr?.addEventListener("click", () => {
    qIn.value = "";
    qClr.classList.add("hidden");
    renderKamar(_allKamar);
    qIn.focus();
  });
}

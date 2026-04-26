/**
 * pages/index.js — Halaman utama: daftar rumah kos
 */
import { getSemualRumah, getDisplayName, togglePinRumah } from "../core/api.js";
import { requireAuth }    from "../core/auth.js";
import { Theme }          from "../core/theme.js";
import { getParams, buildUrl, formatRupiah } from "../core/utils.js";
import { showToast }      from "../ui/toast.js";
import { startLiveClock } from "../ui/clock.js";

export async function initIndex() {
  if (!requireAuth()) return;
  Theme.init();
  startLiveClock("live-time");

  const params = getParams();
  if (params.get("status") === "added")  { showToast("Rumah kos ditambahkan! 🎉"); history.replaceState({}, "", "/index.html"); }
  if (params.get("status") === "edited") { showToast("Rumah kos diperbarui! ✅");  history.replaceState({}, "", "/index.html"); }

  getDisplayName()
    .then(n => { const el = document.getElementById("salam-user"); if (el) el.textContent = `Hai, ${n || "Owner"}! 👋`; })
    .catch(() => {});

  await renderDaftarRumah();
  initSearch();
  initContextMenu();
}

let _allRumah = [];

async function renderDaftarRumah() {
  const el = document.getElementById("list-rumah");
  if (!el) return;

  el.innerHTML = Array.from({ length: 4 }, (_, i) => `
    <div class="kos-card skeleton-card" style="animation-delay:${i * 50}ms">
      <div class="kos-thumb skeleton skeleton-img"></div>
      <div class="kos-info">
        <div class="skeleton skeleton-line w-70" style="height:12px;margin-bottom:6px"></div>
        <div class="skeleton skeleton-line w-90" style="height:9px;margin-bottom:4px"></div>
        <div class="skeleton skeleton-line w-50" style="height:9px"></div>
      </div>
    </div>`).join("");

  try {
    _allRumah = await getSemualRumah();
    renderCards(_allRumah);
    renderStatsBar(_allRumah);
  } catch (err) {
    el.innerHTML = `<p class="empty-state">Gagal memuat data.<br><small>${err}</small></p>`;
    showToast("Gagal memuat data.", "error");
  }
}

/* ── Stats bar — hanya tampil di desktop via CSS ── */
function renderStatsBar(list) {
  const el = document.getElementById("desk-stats-bar");
  if (!el) return;

  const totalKamar = list.reduce((s, r) => s + (r.jumlah_kamar ?? 0), 0);
  const pinned     = list.filter(r => r.is_pinned).length;

  el.innerHTML = `
    <div class="desk-stat-pill">
      🏘️ <span class="dsp-val">${list.length}</span> Rumah Kos
    </div>
    <div class="desk-stat-sep"></div>
    <div class="desk-stat-pill">
      🚪 <span class="dsp-val">${totalKamar}</span> Total Kamar
    </div>
    ${pinned > 0 ? `
    <div class="desk-stat-sep"></div>
    <div class="desk-stat-pill green">
      📌 <span class="dsp-val">${pinned}</span> Di-pin
    </div>` : ""}
    <div class="desk-stat-spacer"></div>
    <a href="/page/add_kost.html" class="btn-secondary"
       style="font-size:.8rem;padding:7px 16px;text-decoration:none">
      ＋ Tambah Kos
    </a>`;
}

function renderCards(list) {
  const el = document.getElementById("list-rumah");
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `
      <div class="desk-empty">
        <div class="desk-empty-icon">🏘️</div>
        <p class="desk-empty-title">Belum ada rumah kos</p>
        <p class="desk-empty-sub">Tambahkan rumah kos pertama Anda<br>dengan menekan tombol <strong>+</strong> di bawah.</p>
      </div>
      <p class="empty-state">Belum ada rumah kos terdaftar.<br>Tekan <strong>+</strong> untuk menambahkan.</p>`;
    return;
  }

  el.innerHTML = list.map((r, i) => {
    const url = buildUrl("/page/detail_kost.html", { id: r.id_rumah, nama: r.nama_rumah });
    return `
      <div class="kos-card${r.is_pinned ? " is-pinned" : ""}"
           data-id="${r.id_rumah}"
           data-url="${url}"
           data-nama="${encodeURIComponent(r.nama_rumah)}"
           data-pinned="${r.is_pinned ? "1" : "0"}"
           style="animation-delay:${i * 45}ms">
        <div class="kos-thumb">
          ${r.gambar
            ? `<img src="${r.gambar}" alt="${r.nama_rumah}" loading="lazy">`
            : `<span class="kos-thumb-emoji">🏠</span>`}
          ${r.is_pinned ? `<span class="kos-pin-badge">📌</span>` : ""}
        </div>
        <div class="kos-info">
          <p class="kos-nama">${r.nama_rumah}</p>
          <p class="kos-alamat">📍 ${r.alamat || "—"}</p>
          <div class="kos-footer">
            <span class="kos-kamar-chip">🚪 ${r.jumlah_kamar} kamar</span>
          </div>
        </div>
      </div>`;
  }).join("");

  // Event delegation — tangkap klik dari child manapun, bubble ke .kos-card
  el.addEventListener("click", (e) => {
    const card = e.target.closest(".kos-card[data-url]");
    if (!card) return;
    location.href = card.dataset.url;
  });
}

function initSearch() {
  const input = document.getElementById("q-rumah");
  const clear = document.getElementById("q-rumah-clear");
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    clear?.classList.toggle("hidden", !q);
    renderCards(!q ? _allRumah : _allRumah.filter(r =>
      r.nama_rumah.toLowerCase().includes(q) || (r.alamat ?? "").toLowerCase().includes(q)
    ));
  });
  clear?.addEventListener("click", () => {
    input.value = ""; clear.classList.add("hidden"); renderCards(_allRumah); input.focus();
  });
}

function initContextMenu() {
  const grid = document.getElementById("list-rumah");
  if (!grid) return;
  let pressTimer = null;
  const getCard = e => e.target.closest(".kos-card[data-id]");

  function openMenu(card, x, y) {
    document.getElementById("ctx-menu")?.remove();
    const idRumah  = parseInt(card.dataset.id);
    const nama     = decodeURIComponent(card.dataset.nama);
    const isPinned = card.dataset.pinned === "1";
    const menu = document.createElement("div");
    menu.id = "ctx-menu"; menu.className = "ctx-menu";
    [
      { label: isPinned ? "📌 Lepas Pin" : "📌 Pin di Atas",
        action: async () => {
          try {
            await togglePinRumah(idRumah);
            showToast(isPinned ? "Pin dilepas." : "Di-pin ke atas! 📌");
            await renderDaftarRumah(); initSearch(); initContextMenu();
          } catch (e) { showToast("Gagal: " + e, "error"); }
        }},
      { label: "✏️ Edit Rumah",
        action: () => location.href = buildUrl("/page/edit_rumah_kost.html", { id: idRumah, nama }) },
    ].forEach(({ label, action }) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.onclick = () => { menu.remove(); action(); };
      menu.appendChild(btn);
    });
    document.body.appendChild(menu);
    const mw = 188;
    menu.style.left = `${Math.min(x, window.innerWidth - mw - 12)}px`;
    menu.style.top  = `${Math.min(y + 4, window.innerHeight - 120)}px`;
    setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }), 50);
  }

  grid.addEventListener("contextmenu", e => {
    const card = getCard(e); if (!card) return;
    e.preventDefault(); openMenu(card, e.clientX, e.clientY);
  });
  grid.addEventListener("pointerdown", e => {
    const card = getCard(e); if (!card) return;
    pressTimer = setTimeout(() => openMenu(card, e.clientX, e.clientY), 520);
  });
  ["pointerup","pointermove","pointercancel"].forEach(ev =>
    grid.addEventListener(ev, () => clearTimeout(pressTimer))
  );
}
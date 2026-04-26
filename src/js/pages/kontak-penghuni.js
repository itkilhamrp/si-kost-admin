/**
 * pages/kontak-penghuni.js — Daftar semua kontak penghuni
 * v2: dual layout — mobile (single list) + desktop (2-panel sidebar)
 */
import { getSemualKontak } from "../core/api.js";
import { requireAuth }     from "../core/auth.js";
import { Theme }           from "../core/theme.js";
import { buildUrl }        from "../core/utils.js";
import { showToast }       from "../ui/toast.js";
import { startLiveClock }  from "../ui/clock.js";

export async function initKontakPenghuni() {
  if (!requireAuth()) return;
  Theme.init();
  startLiveClock("live-time");

  const params = new URLSearchParams(location.search);
  if (params.get("status") === "added")  { showToast("Kontak ditambahkan! 🎉"); history.replaceState({}, "", "/page/kontak_penghuni.html"); }
  if (params.get("status") === "edited") { showToast("Kontak diperbarui ✅");   history.replaceState({}, "", "/page/kontak_penghuni.html"); }

  let _all = [];
  let _q   = "";
  let _jk  = "semua";

  async function load() {
    renderSkeleton();
    try {
      _all = await getSemualKontak();
      updateJumlah(_all.length);
      updateCounts();
      renderFiltered();
    } catch (e) {
      const msg = `<p class="empty-state">Gagal memuat.<br><small>${e}</small></p>`;
      setListHTML(msg);
    }
  }

  function renderSkeleton() {
    const skl = Array.from({length:4}, (_,i) => `
      <div class="kontak-card skeleton-card" style="animation-delay:${i*50}ms">
        <div class="kontak-avatar skeleton" style="width:46px;height:46px;border-radius:50%;flex-shrink:0"></div>
        <div class="kontak-body" style="flex:1">
          <div class="skeleton skeleton-line w-60" style="height:13px;margin-bottom:6px"></div>
          <div class="skeleton skeleton-line w-80" style="height:9px"></div>
        </div>
      </div>`).join("");
    setListHTML(skl);
  }

  function setListHTML(html) {
    const desk = document.getElementById("list-kontak");
    if (desk) {
      desk.innerHTML = html;
      attachDelegation(desk);
    }
    const mob = document.getElementById("list-kontak-mobile");
    if (mob) {
      mob.innerHTML = html;
      attachDelegation(mob);
    }
  }

  // Event delegation untuk kontak-card — dipasang setiap kali innerHTML diganti
  function attachDelegation(container) {
    container.addEventListener("click", (e) => {
      const card = e.target.closest(".kontak-card[data-url]");
      if (!card) return;
      location.href = card.dataset.url;
    });
  }

  function renderFiltered() {
    let list = _all;
    if (_jk === "aktif")      list = list.filter(k => !!k.kamar_aktif);
    else if (_jk !== "semua") list = list.filter(k => k.jenis_kelamin === _jk);
    if (_q) list = list.filter(k =>
      k.nama.toLowerCase().includes(_q) || (k.no_hp ?? "").includes(_q)
    );
    setListHTML(buildListHTML(list));
  }

  function buildListHTML(list) {
    if (!list.length) {
      return `<p class="empty-state">Tidak ada kontak ditemukan.</p>`;
    }
    return list.map((k, i) => {
      const url     = buildUrl("/page/detail_kontak_penghuni.html", { id: k.id_kontak });
      const inisial = k.nama.charAt(0).toUpperCase();
      const avatar  = k.foto_profil
        ? `<img src="${k.foto_profil}" alt="${k.nama}">`
        : `<span class="kontak-avatar-initials">${inisial}</span>`;
      const jkCls   = k.jenis_kelamin === "Pria" ? "laki" : "perempuan";
      const jkLabel = k.jenis_kelamin === "Pria" ? "Pria" : "Wanita";
      // Simpan url di data-url, hapus onclick inline
      return `
        <div class="kontak-card" style="animation-delay:${i*40}ms" data-url="${url}">
          <div class="kontak-avatar">${avatar}</div>
          <div class="kontak-body">
            <p class="kontak-nama">${k.nama}</p>
            ${k.no_hp ? `<p class="kontak-sub">📞 ${k.no_hp}</p>` : ""}
            ${k.kamar_aktif
              ? `<span class="kontak-kamar-badge">🏠 ${k.kamar_aktif}</span>`
              : `<span class="kontak-kosong-badge">Tidak menghuni</span>`}
          </div>
          <div class="kontak-meta">
            <span class="kontak-jk-badge ${jkCls}">${jkLabel}</span>
          </div>
        </div>`;
    }).join("");
  }

  function updateJumlah(total) {
    const el = document.getElementById("jumlah-kontak");
    if (el) el.textContent = `${total} kontak terdaftar`;
  }

  function updateCounts() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("count-semua",  _all.length);
    set("count-aktif",  _all.filter(k => !!k.kamar_aktif).length);
    set("count-pria",   _all.filter(k => k.jenis_kelamin === "Pria").length);
    set("count-wanita", _all.filter(k => k.jenis_kelamin === "Wanita").length);
  }

  /* ── Search mobile ── */
  const qIn  = document.getElementById("q-kontak");
  const qClr = document.getElementById("q-kontak-clear");
  qIn?.addEventListener("input", () => {
    _q = qIn.value.trim().toLowerCase();
    qClr?.classList.toggle("hidden", !_q);
    renderFiltered();
  });
  qClr?.addEventListener("click", () => {
    qIn.value = ""; _q = ""; qClr.classList.add("hidden");
    renderFiltered(); qIn.focus();
  });

  /* ── Filter mobile ── */
  document.querySelectorAll("#filter-jk .kf-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filter-jk .kf-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      _jk = btn.dataset.jk;
      syncDesktopFilter(_jk);
      renderFiltered();
    });
  });

  /* ── Search desktop ── */
  const qDesk    = document.getElementById("q-kontak-desk");
  const qDeskClr = document.getElementById("q-kontak-desk-clear");
  qDesk?.addEventListener("input", () => {
    _q = qDesk.value.trim().toLowerCase();
    qDeskClr?.classList.toggle("hidden", !_q);
    if (qIn) qIn.value = qDesk.value;
    renderFiltered();
  });
  qDeskClr?.addEventListener("click", () => {
    qDesk.value = ""; _q = ""; qDeskClr.classList.add("hidden");
    if (qIn) { qIn.value = ""; qClr?.classList.add("hidden"); }
    renderFiltered(); qDesk.focus();
  });

  /* ── Filter desktop ── */
  document.querySelectorAll("#filter-jk-desk .ksf-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filter-jk-desk .ksf-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      _jk = btn.dataset.jk;
      syncMobileFilter(_jk);
      renderFiltered();
    });
  });

  function syncDesktopFilter(jk) {
    document.querySelectorAll("#filter-jk-desk .ksf-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.jk === jk);
    });
  }
  function syncMobileFilter(jk) {
    document.querySelectorAll("#filter-jk .kf-tab").forEach(b => {
      b.classList.toggle("active", b.dataset.jk === jk);
    });
  }

  await load();
}
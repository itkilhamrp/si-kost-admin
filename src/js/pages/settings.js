/**
 * pages/settings.js
 */

import { gantiPassword, getDisplayName, setDisplayName } from "../core/api.js";
import { requireAuth, setLoggedOut }                     from "../core/auth.js";
import { Theme }                                         from "../core/theme.js";
import { showToast }                                     from "../ui/toast.js";
import { clear as clearCache, info as cacheInfo }        from "../core/cache.js";

export async function initSettings() {
  if (!requireAuth()) return;

  // Init tema dulu — pastikan localStorage & DB sinkron
  await Theme.init();

  /* ── Tema ─────────────────────────────────────── */
  // Baca dari localStorage (sudah disync oleh Theme.init())
  const cur = Theme.current;
  document.querySelectorAll(".theme-option").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === cur);
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".theme-option").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      await Theme.set(btn.dataset.theme);
    });
  });

  /* ── Display Name ─────────────────────────────── */
  const inpNama = document.getElementById("input-display-name");
  try {
    const name = await getDisplayName();
    if (inpNama) inpNama.value = name ?? "";
  } catch (e) {
    console.error("getDisplayName error:", e);
  }

  document.getElementById("btn-simpan-nama")?.addEventListener("click", async () => {
    const name = inpNama?.value?.trim();
    if (!name) { showToast("Nama tidak boleh kosong.", "error"); return; }
    try {
      await setDisplayName(name);
      showToast(`Nama diubah ke "${name}" ✅`);
    } catch (e) {
      showToast("Gagal menyimpan nama: " + e, "error");
    }
  });

  /* ── Ganti Password ───────────────────────────── */
  document.getElementById("btn-ganti-pass")?.addEventListener("click", async () => {
    const lama = document.getElementById("pass-lama")?.value;
    const baru = document.getElementById("pass-baru")?.value;
    if (!lama || !baru) { showToast("Isi password lama dan baru.", "error"); return; }
    try {
      const result = await gantiPassword(lama, baru);
      showToast(result.pesan, result.sukses ? "default" : "error");
      if (result.sukses) {
        document.getElementById("pass-lama").value = "";
        document.getElementById("pass-baru").value = "";
      }
    } catch (e) { showToast("Gagal: " + e, "error"); }
  });

  /* ── Cache Info ───────────────────────────────── */
  function refreshCacheInfo() {
    const el = document.getElementById("cache-info-text");
    if (!el) return;
    try {
      const { count, bytes } = cacheInfo();
      const kb = (bytes / 1024).toFixed(1);
      el.textContent = count > 0 ? `${count} item (±${kb} KB)` : "Kosong";
    } catch { el.textContent = "—"; }
  }
  refreshCacheInfo();

  document.getElementById("btn-hapus-cache")?.addEventListener("click", () => {
    openDialog({
      icon: "🗑️", title: "Hapus Cache?",
      body: "Cache yang tersimpan akan dihapus. Data akan dimuat ulang dari database.",
      confirmLabel: "Ya, Hapus", confirmClass: "btn-red",
      onConfirm: () => { clearCache(); showToast("Cache dibersihkan ✅"); refreshCacheInfo(); },
    });
  });

  /* ── Logout ───────────────────────────────────── */
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    openDialog({
      icon: "🚪", title: "Keluar dari Aplikasi?",
      body: "Sesi akan diakhiri. Kamu perlu login lagi untuk melanjutkan.",
      confirmLabel: "Ya, Logout", confirmClass: "btn-red",
      onConfirm: () => {
        setLoggedOut();
        location.replace("/page/login.html");
      },
    });
  });
}

/* ── Dialog helper ──────────────────────────────── */
function openDialog({ icon, title, body, confirmLabel, confirmClass, onConfirm }) {
  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay active";
  overlay.innerHTML = `
    <div class="dialog-sheet">
      <div class="dialog-handle"></div>
      <div class="dialog-icon danger" style="margin:var(--sp-4) auto var(--sp-2)">${icon}</div>
      <p class="dialog-title">${title}</p>
      <p class="dialog-body">${body}</p>
      <div class="dialog-actions">
        <button class="dialog-btn ${confirmClass}" id="_dlg_ok">${confirmLabel}</button>
        <button class="dialog-btn btn-ghost" id="_dlg_cancel">Batal</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector("#_dlg_ok").onclick     = () => { close(); onConfirm(); };
  overlay.querySelector("#_dlg_cancel").onclick  = close;
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
}
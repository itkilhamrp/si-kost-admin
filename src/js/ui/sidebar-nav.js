/**
 * ui/sidebar-nav.js — Desktop sidebar navigation v6
 *
 * Pola sama seperti bottom-nav mobile:
 * - Satu HTML sidebar yang SAMA di semua halaman
 * - Active icon di-set via CSS [data-active] SEBELUM paint → no flicker
 * - Sidebar selalu tertutup saat load halaman baru
 */

const LS_KEY     = "sikost_sidebar_open";
const BREAKPOINT = 900;

// Mapping pathname → index item (0=Kost, 1=Keuangan, 2=Kontak, 3=Pengaturan)
const ACTIVE_MAP = [
  { idx: 0, pages: ["/index.html", "/", "/page/detail_kost.html"] },
  { idx: 1, pages: ["/page/keuangan.html"] },
  { idx: 2, pages: [
      "/page/kontak_penghuni.html",
      "/page/detail_kontak_penghuni.html",
      "/page/add_kontak_penghuni.html",
      "/page/edit_kontak_penghuni.html",
      "/page/pindah_kamar.html",
  ]},
  { idx: 3, pages: [
      "/page/settings.html",
      "/page/unit.html",
  ]},
];

export function initSidebarNav() {
  const sidebar = document.querySelector(".desk-sidebar-nav");
  if (!sidebar) {
    document.body.style.paddingLeft = "";
    return;
  }

  const isDesktop = () => window.innerWidth >= BREAKPOINT;

  // ── 1. SET ACTIVE via data-attribute SEBELUM paint ───────────
  // Inject <style> di <head> yang pakai data-dsn-active
  // sehingga active styling sudah ada sejak frame pertama
  const path      = location.pathname;
  const activeMap = ACTIVE_MAP.find(m => m.pages.includes(path));
  const activeIdx = activeMap?.idx ?? -1;

  // Set data attribute di sidebar element
  sidebar.setAttribute("data-dsn-active", activeIdx);

  // Inject CSS rule — .dsn-item ke-N dapat class active via CSS
  // TANPA JS mengubah class → tidak ada flicker
  if (!document.getElementById("dsn-active-style")) {
    const style = document.createElement("style");
    style.id = "dsn-active-style";
    style.textContent = `
      .desk-sidebar-nav .dsn-item { }
      .desk-sidebar-nav[data-dsn-active="0"] .dsn-item:nth-child(1),
      .desk-sidebar-nav[data-dsn-active="1"] .dsn-item:nth-child(2),
      .desk-sidebar-nav[data-dsn-active="2"] .dsn-item:nth-child(3),
      .desk-sidebar-nav[data-dsn-active="3"] .dsn-item:nth-child(4) {
        color: var(--green-dk);
        background: var(--green-lt);
      }
      [data-theme="dark"]
      .desk-sidebar-nav[data-dsn-active="0"] .dsn-item:nth-child(1),
      [data-theme="dark"]
      .desk-sidebar-nav[data-dsn-active="1"] .dsn-item:nth-child(2),
      [data-theme="dark"]
      .desk-sidebar-nav[data-dsn-active="2"] .dsn-item:nth-child(3),
      [data-theme="dark"]
      .desk-sidebar-nav[data-dsn-active="3"] .dsn-item:nth-child(4) {
        color: var(--green);
        background: var(--green-lt);
      }
      .desk-sidebar-nav[data-dsn-active="0"] .dsn-item:nth-child(1)::before,
      .desk-sidebar-nav[data-dsn-active="1"] .dsn-item:nth-child(2)::before,
      .desk-sidebar-nav[data-dsn-active="2"] .dsn-item:nth-child(3)::before,
      .desk-sidebar-nav[data-dsn-active="3"] .dsn-item:nth-child(4)::before {
        content: "";
        position: absolute;
        left: 0; top: 20%; bottom: 20%;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: var(--green);
      }
    `;
    document.head.appendChild(style);
  }

  // ── 2. SIDEBAR SELALU TERTUTUP saat load ─────────────────────
  if (isDesktop()) {
    sidebar.style.transition = "none";
    sidebar.classList.remove("dsn-open");
    applyBodyPadding(false);
    void sidebar.offsetWidth;
    requestAnimationFrame(() => { sidebar.style.transition = ""; });
  }

  if (!isDesktop()) return;

  // ── 3. EVENTS ─────────────────────────────────────────────────

  document.getElementById("dsn-toggle-btn")
    ?.addEventListener("click", toggle);

  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "\\") {
      e.preventDefault();
      toggle();
    }
  });

  // Tutup sidebar sebelum pindah halaman
  document.querySelectorAll(".dsn-item").forEach(el => {
    el.addEventListener("click", () => {
      localStorage.setItem(LS_KEY, "0");
    });
  });

  window.addEventListener("resize", () => {
    if (!isDesktop()) {
      sidebar.classList.remove("dsn-open");
      document.body.style.paddingLeft = "";
    } else {
      applyBodyPadding(sidebar.classList.contains("dsn-open"));
    }
  });

  // ── 4. HELPERS ────────────────────────────────────────────────

  function toggle() {
    const willOpen = !sidebar.classList.contains("dsn-open");
    setSidebarOpen(willOpen);
  }

  function setSidebarOpen(open, save = true) {
    sidebar.classList.toggle("dsn-open", open);
    applyBodyPadding(open);
    if (save) localStorage.setItem(LS_KEY, open ? "1" : "0");
  }

  function applyBodyPadding(open) {
    if (!isDesktop()) { document.body.style.paddingLeft = ""; return; }
    document.body.style.transition = "padding-left .22s cubic-bezier(.4,0,.2,1)";
    document.body.style.paddingLeft = open ? "200px" : "64px";
  }
}
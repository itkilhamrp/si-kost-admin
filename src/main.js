/**
 * main.js — Entry point global.
 * Di-load di <head> tanpa defer/async.
 *
 * Hanya set tema (data-theme attribute) untuk cegah FOUC.
 * Anti-flash background sudah ditangani oleh CSS inline di setiap HTML
 * yang di-inject otomatis oleh antiFlashPlugin() di vite.config.js.
 */

// main.js – Hanya untuk sinkronisasi tambahan dengan Rust
// Tema sudah dijalankan oleh inline script di HTML.
(async () => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme) await invoke('set_theme', { theme });
  } catch (e) {
    // Bukan environment Tauri (misal browser), abaikan
  }
})();

// DEBUG TOUCH — hapus setelah masalah ketemu

// document.addEventListener("touchstart", (e) => {
//   const el = e.target;
//   const div = document.createElement("div");
//   div.style.cssText = `position:fixed;top:60px;left:0;right:0;z-index:9999;
//     background:rgba(0,0,0,.8);color:#fff;padding:8px;font-size:11px;
//     word-break:break-all;pointer-events:none`;
//   div.textContent = `TOUCH: ${el.tagName}.${el.className} | id=${el.id}`;
//   document.body.appendChild(div);
//   setTimeout(() => div.remove(), 2000);
// }, { passive: true });
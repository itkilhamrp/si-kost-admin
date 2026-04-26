/**
 * main.js — Entry point global, di-load PERTAMA di <head> tanpa defer.
 *
 * HANYA handle tema. Sidebar padding TIDAK dihandle di sini.
 * sidebar-nav.js yang set padding setelah DOM ready.
 */
(function () {
  var LS_THEME = "sikost_theme";
  var mode     = localStorage.getItem(LS_THEME) || "system";
  var isDark   = mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme",      isDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme-pref", mode);
})();



// window.addEventListener("error", (e) => {
//   document.body.insertAdjacentHTML("afterbegin",
//     `<div style="position:fixed;top:0;left:0;right:0;z-index:9999;
//      background:red;color:#fff;padding:10px;font-size:12px;word-break:break-all">
//      ERROR: ${e.message}<br>${e.filename}:${e.lineno}
//      </div>`
//   );
// });

// window.addEventListener("unhandledrejection", (e) => {
//   document.body.insertAdjacentHTML("afterbegin",
//     `<div style="position:fixed;top:0;left:0;right:0;z-index:9999;
//      background:orange;color:#000;padding:10px;font-size:12px;word-break:break-all">
//      PROMISE: ${e.reason}
//      </div>`
//   );
// });

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
/**
 * ui/toast.js
 * Notifikasi toast ringan.
 */

let _timer = null;

export function showToast(message, type = "default") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  clearTimeout(_timer);

  toast.textContent = message;
  toast.className   = `toast show${type !== "default" ? ` ${type}` : ""}`;

  _timer = setTimeout(() => toast.classList.remove("show"), 3000);
}
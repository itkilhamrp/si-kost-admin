/**
 * pages/login.js
 *
 * Alur:
 *   cekAkun() → { ada: false } → form DAFTAR (pertama kali)
 *   cekAkun() → { ada: true }  → form LOGIN  (setelah logout)
 *   isLoggedIn() === true       → redirect langsung ke /index.html
 */

import { cekAkun, daftarAkun, login } from "../core/api.js";
import { setLoggedIn, isLoggedIn }    from "../core/auth.js";
import { showToast }                  from "../ui/toast.js";

export async function initLogin() {
  // Sudah login → langsung masuk
  if (isLoggedIn()) {
    location.replace("/index.html");
    return;
  }

  let akunAda = false;
  try {
    const info = await cekAkun();
    akunAda = info.ada; // AkunInfo { ada: bool }
  } catch (e) {
    console.error("cek_akun error:", e);
    showToast("Gagal cek status akun: " + e, "error");
  }

  if (akunAda) {
    showFormLogin();
  } else {
    showFormDaftar();
  }
}

/* ── Form Login ──────────────────────────────────────────────── */
function showFormLogin() {
  document.getElementById("form-login")?.classList.remove("hidden");
  document.getElementById("form-daftar")?.classList.add("hidden");

  const btn   = document.getElementById("btn-login");
  const input = document.getElementById("input-pass-login");

  input?.focus();

  const doLogin = async () => {
    if (btn?.disabled) return;
    const pass = input?.value?.trim();
    if (!pass) { showToast("Masukkan password!", "error"); return; }

    if (btn) { btn.disabled = true; btn.textContent = "⏳ Memverifikasi..."; }
    try {
      const result = await login(pass);
      if (result.sukses) {
        setLoggedIn();
        location.replace("/index.html");
      } else {
        showToast(result.pesan || "Password salah.", "error");
        if (btn) { btn.disabled = false; btn.textContent = "Masuk"; }
        if (input) { input.value = ""; input.focus(); }
      }
    } catch (e) {
      showToast("Error: " + e, "error");
      if (btn) { btn.disabled = false; btn.textContent = "Masuk"; }
    }
  };

  btn?.addEventListener("click", doLogin);
  input?.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
}

/* ── Form Daftar ─────────────────────────────────────────────── */
function showFormDaftar() {
  document.getElementById("form-daftar")?.classList.remove("hidden");
  document.getElementById("form-login")?.classList.add("hidden");

  const btn       = document.getElementById("btn-daftar");
  const inpNama   = document.getElementById("input-display-name");
  const inpPass   = document.getElementById("input-pass-daftar");

  inpNama?.focus();

  btn?.addEventListener("click", async () => {
    if (btn.disabled) return;
    const nama = inpNama?.value?.trim() ?? "";
    const pass = inpPass?.value?.trim() ?? "";

    if (!nama)        { showToast("Nama tampilan wajib diisi!", "error"); return; }
    if (!pass)        { showToast("Password wajib diisi!", "error"); return; }
    if (pass.length < 6) { showToast("Password minimal 6 karakter.", "error"); return; }

    btn.disabled = true; btn.textContent = "⏳ Membuat akun...";
    try {
      // username "owner", display_name = nama yang diisi user
      const result = await daftarAkun("owner", pass, nama);
      if (result.sukses) {
        setLoggedIn();
        location.replace("/index.html");
      } else {
        showToast(result.pesan || "Gagal membuat akun.", "error");
        btn.disabled = false; btn.textContent = "Buat Akun";
      }
    } catch (e) {
      showToast("Error: " + e, "error");
      btn.disabled = false; btn.textContent = "Buat Akun";
    }
  });
}
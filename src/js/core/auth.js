/**
 * core/auth.js
 *
 * Pakai localStorage agar token persisten antar navigasi halaman di Tauri.
 * sessionStorage TIDAK bisa dipakai karena reset saat location.replace().
 */

const AUTH_KEY = "sikost_v2_loggedin";

export function setLoggedIn()  { localStorage.setItem(AUTH_KEY, "1"); }
export function setLoggedOut() { localStorage.removeItem(AUTH_KEY); }
export function isLoggedIn()   { return localStorage.getItem(AUTH_KEY) === "1"; }

export function requireAuth() {
  if (!isLoggedIn()) {
    window.location.replace("/page/login.html");
    return false;
  }
  return true;
}
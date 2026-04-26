/**
 * core/theme.js
 * Manajemen tema terang/gelap/sistem.
 *
 * FIX FLICKER & PRESET:
 * - Setiap apply/set SELALU sync ke localStorage ("sikost_theme")
 * - main.js baca localStorage → instant, tanpa flash
 * - DB tetap sebagai source of truth saat pertama load
 */

import { getPengaturan, setPengaturan } from "./api.js";

const LS_KEY = "sikost_theme";

export const Theme = {
  async init() {
    try {
      const saved = await getPengaturan("theme");
      // Sync localStorage agar main.js punya nilai terbaru
      localStorage.setItem(LS_KEY, saved ?? "system");
      this.apply(saved ?? "system");
    } catch {
      // Belum ada di DB — ikut sistem
      localStorage.setItem(LS_KEY, "system");
      this.apply("system");
    }
  },

  apply(mode) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark      = mode === "dark" || (mode === "system" && prefersDark);
    document.documentElement.setAttribute("data-theme",      isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme-pref", mode);
    // Selalu sync localStorage agar halaman berikutnya tidak flicker
    localStorage.setItem(LS_KEY, mode);
  },

  async set(mode) {
    // Terapkan dulu (instant) baru simpan ke DB
    this.apply(mode);
    try {
      await setPengaturan("theme", mode);
    } catch (e) {
      console.error("Gagal simpan theme:", e);
    }
  },

  get current() {
    // Baca dari localStorage dulu (sync), fallback ke data-theme-pref
    return localStorage.getItem(LS_KEY)
      ?? document.documentElement.getAttribute("data-theme-pref")
      ?? "system";
  },
};
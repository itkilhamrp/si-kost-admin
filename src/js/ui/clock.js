/**
 * ui/clock.js — jam realtime dari perangkat
 */
export function startLiveClock(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };
  tick();
  setInterval(tick, 1000);
}
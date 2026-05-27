import confetti from "canvas-confetti";

/** Single subtle gold burst — used for streak milestones and reward claims. */
export function celebrateGold(intensity: "soft" | "rich" = "soft") {
  const count = intensity === "rich" ? 90 : 50;
  confetti({
    particleCount: count,
    spread: 70,
    startVelocity: 38,
    origin: { y: 0.7 },
    colors: ["#d4a017", "#e8c45a", "#f5e08c", "#ffffff"],
    ticks: 180,
    scalar: 0.95,
    disableForReducedMotion: true,
  });
}

const KEY = "overra.lastCelebrate";

/** Trigger at most once per local day. */
export function celebrateOncePerDay(tag: string, intensity: "soft" | "rich" = "soft") {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const map = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, string>;
    if (map[tag] === today) return false;
    map[tag] = today;
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch { /* noop */ }
  celebrateGold(intensity);
  return true;
}
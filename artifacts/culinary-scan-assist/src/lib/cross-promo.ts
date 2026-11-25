import { Capacitor } from "@capacitor/core";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// Opens a link outside the app (App Store, website). On iOS an App Store link
// shows "Open" instead of "Get" when the app is already installed.
export function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) {
    window.open(url, "_system");
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export const ONJJEM_SHOP_URL = "https://onjjem.com/shop?ref=byte2eat";
export const ONJJEM_MUG_URL = "https://onjjem.com/product/photo-mugs?ref=byte2eat";

// ── Foods that can be harmful to dogs ─────────────────────────────────────
// Well-known hazards only. Matching is by word fragment on the detected
// ingredient name (e.g. "red onion", "seedless grapes").
const DOG_HAZARDS: { match: string; label: string }[] = [
  { match: "grape", label: "grapes" },
  { match: "raisin", label: "raisins" },
  { match: "sultana", label: "sultanas" },
  { match: "currant", label: "currants" },
  { match: "onion", label: "onion" },
  { match: "garlic", label: "garlic" },
  { match: "chive", label: "chives" },
  { match: "leek", label: "leek" },
  { match: "chocolate", label: "chocolate" },
  { match: "cocoa", label: "cocoa" },
  { match: "avocado", label: "avocado" },
  { match: "macadamia", label: "macadamia nuts" },
  { match: "xylitol", label: "xylitol (sweetener)" },
];

export function dogHazards(ingredients: string[]): string[] {
  const found = new Set<string>();
  for (const name of ingredients) {
    const n = name.toLowerCase();
    for (const h of DOG_HAZARDS) {
      if (n.includes(h.match)) found.add(h.label);
    }
  }
  return [...found];
}

// ── Promo card, controlled from the server (so it can change without an app update) ──
export type Promo = { id: string; title: string; body: string; url: string; cta?: string };

export async function fetchPromo(): Promise<Promo | null> {
  try {
    const res = await fetch(`${API_BASE}/api/promo`);
    if (!res.ok) return null;
    const data = (await res.json()) as { promo: Promo | null };
    return data.promo ?? null;
  } catch {
    return null;
  }
}

// Builds the plain-text body used on a recipe mug.
export function recipeToMugText(opts: { ingredients?: string[]; steps?: string[]; description?: string }): string {
  const parts: string[] = [];
  if (opts.description) parts.push(opts.description);
  if (opts.ingredients && opts.ingredients.length > 0) {
    parts.push("Ingredients:");
    opts.ingredients.forEach((i) => parts.push(`• ${i}`));
  }
  if (opts.steps && opts.steps.length > 0) {
    parts.push("Method:");
    opts.steps.forEach((s, i) => parts.push(`${i + 1}. ${s}`));
  }
  return parts.join("\n");
}

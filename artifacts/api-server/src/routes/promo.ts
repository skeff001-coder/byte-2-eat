import { Router, type IRouter } from "express";

const router: IRouter = Router();

type Promo = {
  id: string;
  title: string;
  body: string;
  url: string;
  cta?: string;
  endsAt?: string; // ISO date; the promo stops showing after this time
};

// Default promos, shown in order — the first one that hasn't ended is used.
// To change the promo WITHOUT redeploying, set the PROMO_JSON environment
// variable on Railway to a JSON array of the same shape.
const DEFAULT_PROMOS: Promo[] = [
  {
    id: "black-friday-2026",
    title: "Black Friday at ONJJEM",
    body: "15% off personalised gifts + a FREE £5 gift card with every order. Ends 30 Nov.",
    url: "https://onjjem.com/shop?ref=byte2eat",
    cta: "Shop gifts",
    endsAt: "2026-11-30T23:59:59Z",
  },
  {
    id: "christmas-2026",
    title: "Personalised Christmas gifts",
    body: "Mugs, canvas prints & more made with your photos — free UK delivery.",
    url: "https://onjjem.com/shop?ref=byte2eat",
    cta: "Shop gifts",
    endsAt: "2026-12-31T23:59:59Z",
  },
];

function loadPromos(): Promo[] {
  const raw = process.env.PROMO_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Promo[];
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall back to defaults if the variable isn't valid JSON
    }
  }
  return DEFAULT_PROMOS;
}

router.get("/promo", (_req, res) => {
  const now = Date.now();
  const active = loadPromos().find((p) => !p.endsAt || Date.parse(p.endsAt) > now) ?? null;
  res.set("Cache-Control", "public, max-age=300");
  res.json({
    promo: active
      ? { id: active.id, title: active.title, body: active.body, url: active.url, cta: active.cta }
      : null,
  });
});

export default router;

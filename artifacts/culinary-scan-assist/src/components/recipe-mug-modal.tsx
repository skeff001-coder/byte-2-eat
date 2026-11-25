import { useEffect, useRef, useState } from "react";
import { X, Download, Gift } from "lucide-react";
import { openExternal, ONJJEM_MUG_URL } from "@/lib/cross-promo";
import { ONJJEM_APP_STORE_URL } from "@/lib/app-info";

type MugType = "normal" | "magic";

interface Props {
  initialTitle?: string;
  initialBody?: string;
  onClose: () => void;
}

const W = 2400;
const H = 1000;
const MAX_CHARS = 1800;

const THEMES: Record<MugType, { bg: string; text: string; accent: string }> = {
  normal: { bg: "#fffaf0", text: "#2b2118", accent: "#3f7d4e" },
  magic:  { bg: "#111111", text: "#f5e9c8", accent: "#d4af37" },
};

type Line = { text: string; heading: boolean };

function wrapLine(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width <= maxW || !cur) {
      cur = test;
    } else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// Draws the recipe as a wrap-around mug design. Returns true if everything fitted.
function drawMug(canvas: HTMLCanvasElement, title: string, body: string, type: MugType): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const t = THEMES[type];
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  const pad = 90;
  const serif = "Georgia, 'Times New Roman', serif";

  // Title
  ctx.fillStyle = t.accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let titleSize = 96;
  const cleanTitle = (title.trim() || "My Recipe").slice(0, 80);
  ctx.font = `bold ${titleSize}px ${serif}`;
  while (ctx.measureText(cleanTitle).width > W - pad * 2 && titleSize > 48) {
    titleSize -= 4;
    ctx.font = `bold ${titleSize}px ${serif}`;
  }
  ctx.fillText(cleanTitle, W / 2, pad + titleSize * 0.8);

  // Divider
  const dividerY = pad + titleSize + 30;
  ctx.fillStyle = t.accent;
  ctx.fillRect(W / 2 - 220, dividerY, 440, 5);

  // Footer credit
  ctx.font = `italic 34px ${serif}`;
  ctx.fillStyle = t.accent;
  ctx.globalAlpha = 0.8;
  ctx.fillText("Made with Byte 2 Eat", W / 2, H - 40);
  ctx.globalAlpha = 1;

  // Body columns
  const cols = 3;
  const gap = 70;
  const colW = (W - pad * 2 - gap * (cols - 1)) / cols;
  const top = dividerY + 70;
  const bottom = H - 100;
  const colH = bottom - top;

  const paragraphs = body.split("\n").map((p) => p.trim()).filter((p) => p.length > 0);

  let fits = false;
  let size = 46;
  let lines: Line[] = [];
  let lineH = 0;
  let perCol = 0;

  for (; size >= 20; size -= 2) {
    ctx.font = `${size}px ${serif}`;
    lines = [];
    for (const p of paragraphs) {
      const heading = p.endsWith(":") && p.length < 30;
      ctx.font = heading ? `bold ${size}px ${serif}` : `${size}px ${serif}`;
      wrapLine(ctx, p, colW).forEach((l) => lines.push({ text: l, heading }));
    }
    lineH = size * 1.32;
    perCol = Math.floor(colH / lineH);
    if (lines.length <= perCol * cols) {
      fits = true;
      break;
    }
  }
  if (!fits) {
    size = 20;
    lineH = size * 1.32;
    perCol = Math.floor(colH / lineH);
    lines = lines.slice(0, perCol * cols);
    if (lines.length > 0) lines[lines.length - 1] = { text: "…", heading: false };
  }

  ctx.textAlign = "left";
  ctx.fillStyle = t.text;
  lines.forEach((ln, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x = pad + col * (colW + gap);
    const y = top + row * lineH + size;
    ctx.font = ln.heading ? `bold ${size}px ${serif}` : `${size}px ${serif}`;
    ctx.fillStyle = ln.heading ? t.accent : t.text;
    ctx.fillText(ln.text, x, y);
  });

  return fits;
}

export function RecipeMugModal({ initialTitle = "", initialBody = "", onClose }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody.slice(0, MAX_CHARS));
  const [mug, setMug] = useState<MugType>("normal");
  const [fits, setFits] = useState(true);
  const [fallbackImg, setFallbackImg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    setFits(drawMug(canvasRef.current, title, body, mug));
  }, [title, body, mug]);

  const saveDesign = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], "recipe-mug.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: "My recipe mug design" });
        return;
      }
    } catch {
      // user cancelled the share sheet, or sharing failed — fall through to the image fallback
      return;
    }
    setFallbackImg(canvas.toDataURL("image/png"));
  };

  const order = () => {
    openExternal(mug === "magic" ? ONJJEM_APP_STORE_URL : ONJJEM_MUG_URL);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-t-3xl bg-background pb-8 shadow-2xl overflow-y-auto max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-lg font-bold text-foreground">Put your recipe on a mug</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recipe name</label>
          <input
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nan's famous lasagne"
            className="mt-1 w-full rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recipe — type or paste your own
          </label>
          <textarea
            value={body}
            maxLength={MAX_CHARS}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder={"Ingredients:\n• 500g mince\n• 1 onion\nMethod:\n1. Brown the mince…"}
            className="mt-1 w-full rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className={`mt-1 text-[11px] ${fits ? "text-muted-foreground" : "text-red-600"}`}>
            {fits ? `${body.length}/${MAX_CHARS} characters` : "Too long to fit on the mug — shorten it a little."}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setMug("normal")}
              className={`rounded-2xl px-3 py-3 text-left ${mug === "normal" ? "bg-accent ring-2 ring-primary/50" : "bg-card ring-1 ring-border"}`}
            >
              <p className="text-sm font-bold text-foreground">Classic mug</p>
              <p className="text-[11px] text-muted-foreground">Your recipe printed in full colour</p>
            </button>
            <button
              onClick={() => setMug("magic")}
              className={`rounded-2xl px-3 py-3 text-left ${mug === "magic" ? "bg-accent ring-2 ring-primary/50" : "bg-card ring-1 ring-border"}`}
            >
              <p className="text-sm font-bold text-foreground">Magic mug ✨</p>
              <p className="text-[11px] text-muted-foreground">Recipe appears when you add a hot drink</p>
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-border">
            <canvas ref={canvasRef} className="block w-full h-auto" />
          </div>

          <button
            onClick={saveDesign}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-3.5 text-sm font-semibold text-secondary-foreground"
          >
            <Download className="h-4 w-4" /> Save my design
          </button>

          <button
            onClick={order}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Gift className="h-4 w-4" /> Order on ONJJEM
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground leading-snug">
            Save your design first, then upload it as your photo when you order. ONJJEM prints and posts your mug.
          </p>

          {fallbackImg && (
            <div className="mt-4 rounded-2xl bg-card p-3 ring-1 ring-border">
              <p className="text-xs font-semibold text-foreground">Press and hold the image, then tap “Save to Photos”.</p>
              <img src={fallbackImg} alt="Your recipe mug design" className="mt-2 w-full rounded-xl" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

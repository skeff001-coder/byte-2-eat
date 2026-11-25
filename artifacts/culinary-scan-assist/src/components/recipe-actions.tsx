import { useState } from "react";
import { Coffee, Camera } from "lucide-react";
import { RecipeMugModal } from "@/components/recipe-mug-modal";
import { openExternal } from "@/lib/cross-promo";
import { ONJJEM_APP_STORE_URL } from "@/lib/app-info";

interface Props {
  title: string;
  body: string;
}

// Two soft cross-promo buttons shown under a recipe's method:
//  - put the recipe on a mug (ONJJEM store)
//  - cartoon-ify a photo of the finished plate (ONJJEM app)
export function RecipeActions({ title, body }: Props) {
  const [mugOpen, setMugOpen] = useState(false);
  return (
    <>
      <div className="mt-5 grid gap-2">
        <button
          onClick={() => setMugOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-left ring-1 ring-primary/20 active:scale-[0.98] transition-transform"
        >
          <Coffee className="h-5 w-5 flex-shrink-0 text-primary" />
          <span className="text-sm font-semibold text-foreground">Put this recipe on a mug</span>
        </button>
        <button
          onClick={() => openExternal(ONJJEM_APP_STORE_URL)}
          className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-border active:scale-[0.98] transition-transform"
        >
          <Camera className="h-5 w-5 flex-shrink-0 text-primary" />
          <span className="text-sm font-semibold text-foreground">Snap &amp; cartoon-ify your finished plate</span>
        </button>
      </div>
      {mugOpen && <RecipeMugModal initialTitle={title} initialBody={body} onClose={() => setMugOpen(false)} />}
    </>
  );
}

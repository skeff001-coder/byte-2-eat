import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cancelExpiryNotification } from "./scan-expiry-notification";

const STORAGE_KEY        = "bite_scan_credits";
const LEGACY_EXPIRY_KEY  = "bite_scan_expiry"; // scans no longer expire; only read to migrate old installs
const PAID_KEY           = "bite_scan_paid";
const PREMIUM_OWNED_KEY  = "bite_premium_owned";
const CREDITS_CHANGED    = "bite_credits_changed";
export const FREE_SCANS  = 3;

// Older versions stored an expiry date on purchased scans. Scans never expire
// now, so drop the date, remember that the user has paid, and cancel any
// "your scans are about to expire" notifications that were already scheduled.
function migrateLegacyExpiry() {
  if (localStorage.getItem(LEGACY_EXPIRY_KEY) !== null) {
    localStorage.removeItem(LEGACY_EXPIRY_KEY);
    localStorage.setItem(PAID_KEY, "1");
    void cancelExpiryNotification();
  }
}

function readHasPaid(): boolean {
  migrateLegacyExpiry();
  return localStorage.getItem(PAID_KEY) === "1" || localStorage.getItem(PREMIUM_OWNED_KEY) === "1";
}

function readCredits(): number {
  migrateLegacyExpiry();
  const val = localStorage.getItem(STORAGE_KEY);
  if (val === null) {
    // No free scans until the user registers — see syncCreditsForUser,
    // which grants the free scans once they sign up with an email.
    localStorage.setItem(STORAGE_KEY, "0");
    return 0;
  }
  return Number(val);
}

function writeCredits(n: number) {
  localStorage.setItem(STORAGE_KEY, String(n));
}

export type ScanPlan = "scan1" | "scan10";

export async function syncCreditsForUser(userId: string): Promise<void> {
  try {
    const { count } = await supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const scanCount = count ?? 0;
    const current = Number(localStorage.getItem(STORAGE_KEY) ?? "-1");

    let changed = false;
    const hasPurchased = readHasPaid();
    if (scanCount === 0 && current <= 0) {
      // Brand-new account with no scans — ensure they get their free scans
      localStorage.setItem(STORAGE_KEY, String(FREE_SCANS));
      changed = true;
    } else if (scanCount > 0 && !hasPurchased) {
      // Returning user on a new device/session — free scans already used
      // elsewhere count against the allowance, to prevent double-dipping
      const allowed = Math.max(0, FREE_SCANS - scanCount);
      if (current > allowed) {
        localStorage.setItem(STORAGE_KEY, String(allowed));
        changed = true;
      }
    }
    if (changed) window.dispatchEvent(new Event(CREDITS_CHANGED));
  } catch {
    // non-critical — silently ignore
  }
}

// Used by rewards (e.g. savings milestones) to add free scans.
export function grantFreeScans(n: number) {
  if (n <= 0) return;
  writeCredits(readCredits() + n);
  window.dispatchEvent(new Event(CREDITS_CHANGED));
}

export const PLAN_CREDITS: Record<ScanPlan, number> = {
  scan1:  1,
  scan10: 10,
};

export function useScanCredits() {
  const [credits, setCredits] = useState<number>(() => readCredits());
  const [hasPaid, setHasPaid] = useState<boolean>(() => readHasPaid());

  useEffect(() => {
    const refresh = () => {
      setCredits(readCredits());
      setHasPaid(readHasPaid());
    };
    window.addEventListener(CREDITS_CHANGED, refresh);
    return () => window.removeEventListener(CREDITS_CHANGED, refresh);
  }, []);

  const canScan = credits > 0;

  const consumeCredit = useCallback(() => {
    const c = readCredits();
    if (c <= 0) return;
    const next = Math.max(0, c - 1);
    writeCredits(next);
    setCredits(next);
  }, []);

  const purchasePlan = useCallback((plan: ScanPlan) => {
    localStorage.removeItem("bite_low_scan_dismissed");
    const next = readCredits() + PLAN_CREDITS[plan];
    writeCredits(next);
    localStorage.setItem(PAID_KEY, "1");
    setCredits(next);
    setHasPaid(true);
  }, []);

  // The 10-pack is a consumable, so every purchase must add 10 scans. (Previously
  // a second purchase was ignored, charging the user without giving them scans.)
  const unlockPremiumCredits = useCallback(() => {
    localStorage.setItem(PREMIUM_OWNED_KEY, "1");
    purchasePlan("scan10");
  }, [purchasePlan]);

  return { credits, canScan, hasPaid, consumeCredit, purchasePlan, unlockPremiumCredits };
}

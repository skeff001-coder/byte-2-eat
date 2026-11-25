import { useState, useCallback } from "react";
import { grantFreeScans } from "./use-scan-credits";

const TOTAL_KEY = "bite_savings_total";
const MONTH_KEY = "bite_savings_month";

// Every time the user's all-time savings pass another multiple of this amount
// they earn one free scan.
export const SAVINGS_PER_FREE_SCAN = 100;

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function readMonthly(): number {
  const stored = localStorage.getItem(MONTH_KEY);
  if (!stored) return 0;
  try {
    const { month, total } = JSON.parse(stored) as { month: string; total: number };
    return month === currentMonth() ? total : 0;
  } catch {
    return 0;
  }
}

function readAllTime(): number {
  return Number(localStorage.getItem(TOTAL_KEY) ?? "0");
}

export function useSavingsTracker() {
  const [monthly, setMonthly] = useState<number>(readMonthly);
  const [allTime, setAllTime] = useState<number>(readAllTime);

  // Returns how many free scans this saving earned (usually 0).
  const addSavings = useCallback((amount: number): number => {
    if (!amount || amount <= 0) return 0;

    const newMonthly = readMonthly() + amount;
    localStorage.setItem(MONTH_KEY, JSON.stringify({ month: currentMonth(), total: newMonthly }));
    setMonthly(newMonthly);

    const before = readAllTime();
    const newAllTime = before + amount;
    localStorage.setItem(TOTAL_KEY, String(newAllTime));
    setAllTime(newAllTime);

    const earned = Math.floor(newAllTime / SAVINGS_PER_FREE_SCAN) - Math.floor(before / SAVINGS_PER_FREE_SCAN);
    if (earned > 0) grantFreeScans(earned);
    return earned;
  }, []);

  return { monthly, allTime, addSavings };
}

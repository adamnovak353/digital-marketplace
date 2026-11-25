import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function discountPercent(priceMinor: number, compareAtMinor?: number) {
  if (!compareAtMinor || compareAtMinor <= priceMinor) return 0;
  return Math.round((1 - priceMinor / compareAtMinor) * 100);
}

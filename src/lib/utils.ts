import { clsx, type ClassValue } from "clsx";
import { format, subDays } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toDateKey(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function previousDateKey(days = 1) {
  return format(subDays(new Date(), days), "yyyy-MM-dd");
}

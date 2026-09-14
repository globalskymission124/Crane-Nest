"use client";

// =========================================================
// 最近見た宿（Airbnbの Recently viewed）。端末内(localStorage)に保持。
// =========================================================
export interface RecentItem {
  id: string;
  title: string;
  photo?: string;
  city?: string;
  price: number;
}

const KEY = "crane_recent_viewed";
const MAX = 12;

export function getRecent(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as RecentItem[];
  } catch {
    return [];
  }
}

export function addRecent(item: RecentItem): void {
  try {
    const cur = getRecent().filter((x) => x.id !== item.id);
    localStorage.setItem(KEY, JSON.stringify([item, ...cur].slice(0, MAX)));
  } catch {
    /* ignore */
  }
}

// 本机保存层：localStorage 持久化，重开页面后记录仍在
// 存储格式变化只改本文件，页面和判定不感知存储细节

import type { BorescopeRecord } from "../domain/judgment";

const STORAGE_KEY = "borescope-review-v1";

export function loadRecords(fallback: BorescopeRecord[]): BorescopeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    return parsed as BorescopeRecord[];
  } catch {
    return fallback;
  }
}

export function saveRecords(records: BorescopeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 本机存储不可用时静默降级，仅保留当前会话数据
  }
}

export function resetStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
}

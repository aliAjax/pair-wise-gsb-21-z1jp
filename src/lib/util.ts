// 小工具

export function uid(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}${rand}`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** YYYY-MM-DD 比较：a < b 返回负数 */
export function compareDate(a: string, b: string): number {
  return a.localeCompare(b);
}

/** 日期是否有效（未过期：到期日 >= 今天） */
export function isValidOn(expiry: string, on: string = today()): boolean {
  return Boolean(expiry) && compareDate(expiry, on) >= 0;
}

export function fmtMm(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(2)} mm`;
}

export function fmtDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

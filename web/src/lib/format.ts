/** 金額換算成台幣（主幣別）：原幣金額 × 匯率 */
export function toTWD(amount: number, exchangeRate: number): number {
  return amount * exchangeRate;
}

/** 顯示台幣金額：四捨五入到整數加千分位 */
export function fmtTWD(amount: number): string {
  return `NT$ ${Math.round(amount).toLocaleString("zh-TW")}`;
}

/** 顯示原幣金額 */
export function fmtMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("zh-TW")}`;
}

export const CURRENCIES = ["TWD", "JPY", "USD"] as const;

export const CONDITIONS = ["全新", "近新", "微瑕", "有損"] as const;

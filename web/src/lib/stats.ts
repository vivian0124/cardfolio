export type SaleNumbers = {
  quantity: number;
  price: number | string;
  fees: number | string;
  exchange_rate: number | string;
};

export type LotNumbers = {
  quantity: number;
  price: number | string;
  fees: number | string;
  exchange_rate: number | string;
  sales: SaleNumbers[] | null;
};

/** PostgREST 的 numeric 會回字串，統一轉數字 */
const n = (v: number | string) => Number(v);

/** 一個批次的台幣總成本（含運費手續費） */
export function lotCostTWD(lot: LotNumbers): number {
  return (n(lot.price) + n(lot.fees)) * n(lot.exchange_rate);
}

/** 一筆賣出的台幣淨收入（扣費用） */
export function saleNetTWD(sale: SaleNumbers): number {
  return (n(sale.price) - n(sale.fees)) * n(sale.exchange_rate);
}

export function lotSoldQty(lot: LotNumbers): number {
  return (lot.sales ?? []).reduce((sum, s) => sum + s.quantity, 0);
}

export function lotRemaining(lot: LotNumbers): number {
  return lot.quantity - lotSoldQty(lot);
}

export type PortfolioStats = {
  invested: number; // 總投入（台幣）
  recovered: number; // 總回收（台幣）
  realizedPnl: number; // 已實現損益（台幣）
  inventoryCost: number; // 在庫成本（台幣）
  soldCost: number; // 已賣出部分的成本（台幣），算已實現 ROI 用
};

export function computeStats(lots: LotNumbers[]): PortfolioStats {
  let invested = 0;
  let recovered = 0;
  let realizedPnl = 0;
  let soldCost = 0;

  for (const lot of lots) {
    const cost = lotCostTWD(lot);
    invested += cost;
    const unitCost = lot.quantity > 0 ? cost / lot.quantity : 0;
    for (const sale of lot.sales ?? []) {
      const net = saleNetTWD(sale);
      recovered += net;
      realizedPnl += net - unitCost * sale.quantity;
      soldCost += unitCost * sale.quantity;
    }
  }

  return {
    invested,
    recovered,
    realizedPnl,
    inventoryCost: invested - soldCost,
    soldCost,
  };
}

/** 已實現 ROI（賣出淨額相對於賣出部分成本的報酬率），沒有已實現交易時回傳 null */
export function realizedRoi(stats: PortfolioStats): number | null {
  return stats.soldCost > 0 ? stats.realizedPnl / stats.soldCost : null;
}

export type StockMarket = "domestic" | "global";

export type StockTrend = "up" | "down";

export type StockData = {
  id: number;
  rank: number;
  name: string;
  price: string;
  changeRate: string;
  tradingAmount: string;
  market: StockMarket;
  trend: StockTrend;
  logoLabel: string;
  logoUrl?: string;
};

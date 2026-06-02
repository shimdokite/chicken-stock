export type StockDetailTab = "chart-orderbook" | "portfolio-info";
export type StockCurrencyCode = "KRW" | "USD";

export type StockOnlyProps = {
  stock: StockDetailData;
};

export type StockCandleData = {
  timestamp: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
};

export type StockOrderBookLevelData = {
  side: "ASK" | "BID";
  levelRank: number;
  price: number;
  quantity: number;
};

export type StockOrderBookSnapshotData = {
  totalAskSize: number;
  totalBidSize: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  executionStrength: number;
  levels: StockOrderBookLevelData[];
};

export type StockFinancialMetricData = {
  debtRatio: number | null;
  currentRatio: number | null;
  interestCoverageRatio: number | null;
  per: number | null;
  pbr: number | null;
};

export type StockThemeFinancialMetricData = {
  per: number | null;
  pbr: number | null;
  peerCount: number;
};

export type StockFinancialStatementType =
  | "INCOME_STATEMENT"
  | "BALANCE_SHEET"
  | "CASH_FLOW";

export type StockFinancialPeriodType = "ANNUAL" | "QUARTER";

export type StockFinancialStatementData = {
  id: string;
  statementType: StockFinancialStatementType;
  periodType: StockFinancialPeriodType;
  fiscalYear: number;
  fiscalQuarter: number | null;
  data: Record<string, string | number | boolean | null>;
};

export type StockEarningData = {
  id: string;
  announcementDate: string | null;
  periodType: StockFinancialPeriodType;
  fiscalYear: number;
  fiscalQuarter: number | null;
  estimatedRevenue: number | null;
  estimatedOperatingProfit: number | null;
};

export type StockDetailData = {
  id: number;
  ticker: string;
  name: string;
  imageUrl: string | null;
  sector: string;
  riskLevel: string;
  theme: string;
  countryCode: string;
  currencyCode: StockCurrencyCode;
  currentPrice: number;
  previousClose: number;
  changeAmount: number;
  changeRate: number;
  dayHigh: number;
  dayLow: number;
  high52w: number;
  low52w: number;
  volume: number;
  tradingValue: number;
  marketCap: number;
  per: number;
  eps: number;
  marketStatus: string;
  debtRatio: number;
  currentRatio: number;
  interestCoverageRatio: number;
  announcementDate: string;
  estimatedOperatingProfit: string;
  estimatedRevenue: number;
  dividendCount: number;
  dividendPerShare: number;
  dividendYield: number;
  candles: StockCandleData[];
  orderBookSnapshot: StockOrderBookSnapshotData | null;
  financialMetric: StockFinancialMetricData | null;
  themeFinancialMetric: StockThemeFinancialMetricData;
  financialStatements: StockFinancialStatementData[];
  earnings: StockEarningData[];
};

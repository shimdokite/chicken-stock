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
  volume: number;
};

export type StockOrderBookLevelData = {
  side: "ASK" | "BID";
  levelRank: number;
  orderCount: number;
  price: number;
  quantity: number;
};

export type StockOrderBookRecentOrderData = {
  id: string;
  orderedAt: string;
  price: number;
  quantity: number;
  side: "BUY" | "SELL";
  status: "PENDING" | "COMPLETED" | "CANCELED";
};

export type StockOrderBookSnapshotData = {
  timestamp: number;
  currentPrice?: number;
  previousClose?: number;
  changeRate?: number;
  dayHigh?: number;
  dayLow?: number;
  volumeAmount?: number;
  totalAskSize: number;
  totalBidSize: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  executionStrength: number;
  lastTradeVolume: number;
  levels: StockOrderBookLevelData[];
  recentOrders: StockOrderBookRecentOrderData[];
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
  forwardPer: number | null;
  pbr: number | null;
  peerCount: number;
};

export type StockValuationMetricData = {
  baseDate: string;
  per: number | null;
  industryPer: number | null;
  forwardPer: number | null;
  industryForwardPer: number | null;
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
  valuationMetric: StockValuationMetricData;
  financialStatements: StockFinancialStatementData[];
  earnings: StockEarningData[];
};

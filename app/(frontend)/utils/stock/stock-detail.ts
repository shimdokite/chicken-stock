import type {
  StockCurrencyCode,
  StockDetailData,
} from "../../types/stock/stock-detail";
import { convertCurrencyValue, USD_KRW_EXCHANGE_RATE } from "../currency";

const financialStatementMoneyKeys = new Set([
  "revenue",
  "operatingProfit",
  "netIncome",
  "eps",
  "assets",
  "liabilities",
  "equity",
  "currentAssets",
  "currentLiabilities",
  "operatingCashFlow",
  "capitalExpenditure",
  "freeCashFlow",
]);

export function getLogoLabel(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export function getLogoColorClassName(stockId: number) {
  const classNames = [
    "border-red-200 bg-red-100 text-red-700",
    "border-orange-200 bg-orange-100 text-orange-700",
    "border-amber-200 bg-amber-100 text-amber-700",
    "border-emerald-200 bg-emerald-100 text-emerald-700",
    "border-cyan-200 bg-cyan-100 text-cyan-700",
    "border-blue-200 bg-blue-100 text-blue-700",
    "border-indigo-200 bg-indigo-100 text-indigo-700",
    "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700",
  ];

  return classNames[stockId % classNames.length];
}

export function isUsableImageUrl(value: string | undefined) {
  if (!value) {
    return false;
  }

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits,
  }).format(value);
}

export function formatPrice(value: number, currencyCode: StockCurrencyCode) {
  if (currencyCode === "KRW") {
    return `${formatNumber(value)}원`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPlainPrice(
  value: number,
  currencyCode: StockCurrencyCode,
) {
  return currencyCode === "KRW" ? formatNumber(value) : value.toFixed(2);
}

export function formatWon(value: number) {
  return `${formatNumber(value)}원`;
}

export function formatChange(value: number, currencyCode: StockCurrencyCode) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const absValue = Math.abs(value);

  if (currencyCode === "USD") {
    return `${sign}${formatPrice(absValue, currencyCode)}`;
  }

  return `${sign}${formatNumber(absValue, 2)}원`;
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

export function formatTradingValue(
  value: number,
  currencyCode: StockCurrencyCode,
) {
  if (currencyCode === "KRW" && Math.abs(value) >= 100_000_000) {
    return `${formatNumber(value / 100_000_000, 1)}억`;
  }

  return formatPrice(value, currencyCode);
}

function convertNullableCurrencyValue(
  value: number | null,
  fromCurrencyCode: StockCurrencyCode,
  toCurrencyCode: StockCurrencyCode,
) {
  return value === null
    ? null
    : convertCurrencyValue(value, fromCurrencyCode, toCurrencyCode);
}

function convertFinancialStatementData(
  data: StockDetailData["financialStatements"][number]["data"],
  fromCurrencyCode: StockCurrencyCode,
  toCurrencyCode: StockCurrencyCode,
) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      financialStatementMoneyKeys.has(key) && typeof value === "number"
        ? convertCurrencyValue(value, fromCurrencyCode, toCurrencyCode)
        : value,
    ]),
  );
}

export function convertStockCurrency(
  stock: StockDetailData,
  toCurrencyCode: StockCurrencyCode,
): StockDetailData {
  const fromCurrencyCode = stock.currencyCode;

  if (fromCurrencyCode === toCurrencyCode) {
    return stock;
  }

  return {
    ...stock,
    currencyCode: toCurrencyCode,
    currentPrice: convertCurrencyValue(
      stock.currentPrice,
      fromCurrencyCode,
      toCurrencyCode,
    ),
    previousClose: convertCurrencyValue(
      stock.previousClose,
      fromCurrencyCode,
      toCurrencyCode,
    ),
    changeAmount: convertCurrencyValue(
      stock.changeAmount,
      fromCurrencyCode,
      toCurrencyCode,
    ),
    dayHigh: convertCurrencyValue(
      stock.dayHigh,
      fromCurrencyCode,
      toCurrencyCode,
    ),
    dayLow: convertCurrencyValue(
      stock.dayLow,
      fromCurrencyCode,
      toCurrencyCode,
    ),
    high52w: convertCurrencyValue(
      stock.high52w,
      fromCurrencyCode,
      toCurrencyCode,
    ),
    low52w: convertCurrencyValue(
      stock.low52w,
      fromCurrencyCode,
      toCurrencyCode,
    ),
    tradingValue: convertCurrencyValue(
      stock.tradingValue,
      fromCurrencyCode,
      toCurrencyCode,
    ),
    marketCap: convertCurrencyValue(
      stock.marketCap,
      fromCurrencyCode,
      toCurrencyCode,
    ),
    eps: convertCurrencyValue(stock.eps, fromCurrencyCode, toCurrencyCode),
    estimatedRevenue: convertCurrencyValue(
      stock.estimatedRevenue,
      fromCurrencyCode,
      toCurrencyCode,
    ),
    dividendPerShare: convertCurrencyValue(
      stock.dividendPerShare,
      fromCurrencyCode,
      toCurrencyCode,
    ),
    candles: stock.candles.map((candle) => ({
      ...candle,
      openPrice: convertCurrencyValue(
        candle.openPrice,
        fromCurrencyCode,
        toCurrencyCode,
      ),
      highPrice: convertCurrencyValue(
        candle.highPrice,
        fromCurrencyCode,
        toCurrencyCode,
      ),
      lowPrice: convertCurrencyValue(
        candle.lowPrice,
        fromCurrencyCode,
        toCurrencyCode,
      ),
      closePrice: convertCurrencyValue(
        candle.closePrice,
        fromCurrencyCode,
        toCurrencyCode,
      ),
    })),
    orderBookSnapshot: stock.orderBookSnapshot
      ? {
          ...stock.orderBookSnapshot,
          levels: stock.orderBookSnapshot.levels.map((level) => ({
            ...level,
            price: convertCurrencyValue(
              level.price,
              fromCurrencyCode,
              toCurrencyCode,
            ),
          })),
          recentOrders: (stock.orderBookSnapshot.recentOrders ?? []).map(
            (order) => ({
              ...order,
              price: convertCurrencyValue(
                order.price,
                fromCurrencyCode,
                toCurrencyCode,
              ),
            }),
          ),
        }
      : null,
    financialStatements: stock.financialStatements.map((statement) => ({
      ...statement,
      data: convertFinancialStatementData(
        statement.data,
        fromCurrencyCode,
        toCurrencyCode,
      ),
    })),
    earnings: stock.earnings.map((earning) => ({
      ...earning,
      estimatedRevenue: convertNullableCurrencyValue(
        earning.estimatedRevenue,
        fromCurrencyCode,
        toCurrencyCode,
      ),
      estimatedOperatingProfit: convertNullableCurrencyValue(
        earning.estimatedOperatingProfit,
        fromCurrencyCode,
        toCurrencyCode,
      ),
    })),
  };
}

export function formatDateLabel(timestamp: number) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getMonth() + 1}월`;
}

export { convertCurrencyValue, USD_KRW_EXCHANGE_RATE };

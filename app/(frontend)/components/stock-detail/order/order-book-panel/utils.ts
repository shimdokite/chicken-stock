import type {
  StockCurrencyCode,
  StockDetailData,
  StockOrderBookLevelData,
  StockOrderBookSnapshotData,
} from "../../../../types/stock/stock-detail";
import {
  convertCurrencyValue,
  formatNumber,
} from "../../../../utils/stock/stock-detail";
import { DISPLAY_LEVEL_COUNT } from "./constants";

export function getLevelKey(level: StockOrderBookLevelData) {
  return `${level.side}-${level.levelRank}`;
}

export function getTrendTextClassName(changeRate: number) {
  if (changeRate > 0) {
    return "text-red-500";
  }

  if (changeRate < 0) {
    return "text-sky-600";
  }

  return "text-zinc-600";
}

export function getOrderSideTextClassName(side: "BUY" | "SELL") {
  return side === "BUY" ? "text-red-500" : "text-sky-600";
}

export function groupLevels(
  levels: StockOrderBookLevelData[],
  currentPrice?: number,
) {
  const currentPriceLevel =
    typeof currentPrice === "number" &&
    Number.isFinite(currentPrice) &&
    !levels.some((level) => level.price === currentPrice)
      ? {
          side: "BID" as const,
          levelRank: 0,
          orderCount: 0,
          price: currentPrice,
          quantity: 0,
        }
      : null;
  const mergedLevels = currentPriceLevel
    ? [...levels, currentPriceLevel]
    : levels;
  const asks = mergedLevels
    .filter((level) => level.side === "ASK")
    .sort((a, b) => a.levelRank - b.levelRank)
    .slice(0, DISPLAY_LEVEL_COUNT)
    .reverse();
  const sortedBids = mergedLevels
    .filter((level) => level.side === "BID")
    .sort((a, b) => b.price - a.price);
  const currentBidLevel =
    typeof currentPrice === "number"
      ? sortedBids.find((level) => level.price === currentPrice)
      : undefined;
  const bids = currentBidLevel
    ? [
        currentBidLevel,
        ...sortedBids
          .filter((level) => level !== currentBidLevel)
          .slice(0, DISPLAY_LEVEL_COUNT - 1),
      ]
    : sortedBids.slice(0, DISPLAY_LEVEL_COUNT);

  return {
    asks,
    bids,
  };
}

export function fillRows<T>(items: T[], count: number) {
  return Array.from({ length: count }, (_, index) => items[index] ?? null);
}

export function convertOrderBookSnapshotCurrency(
  snapshot: StockOrderBookSnapshotData | null | undefined,
  fromCurrencyCode: StockCurrencyCode,
  toCurrencyCode: StockCurrencyCode,
) {
  if (!snapshot) {
    return null;
  }

  if (fromCurrencyCode === toCurrencyCode) {
    return snapshot;
  }

  return {
    ...snapshot,
    currentPrice:
      typeof snapshot.currentPrice === "number"
        ? convertCurrencyValue(
            snapshot.currentPrice,
            fromCurrencyCode,
            toCurrencyCode,
          )
        : snapshot.currentPrice,
    previousClose:
      typeof snapshot.previousClose === "number"
        ? convertCurrencyValue(
            snapshot.previousClose,
            fromCurrencyCode,
            toCurrencyCode,
          )
        : snapshot.previousClose,
    dayHigh:
      typeof snapshot.dayHigh === "number"
        ? convertCurrencyValue(
            snapshot.dayHigh,
            fromCurrencyCode,
            toCurrencyCode,
          )
        : snapshot.dayHigh,
    dayLow:
      typeof snapshot.dayLow === "number"
        ? convertCurrencyValue(
            snapshot.dayLow,
            fromCurrencyCode,
            toCurrencyCode,
          )
        : snapshot.dayLow,
    levels: snapshot.levels.map((level) => ({
      ...level,
      price: convertCurrencyValue(
        level.price,
        fromCurrencyCode,
        toCurrencyCode,
      ),
    })),
    recentOrders: (snapshot.recentOrders ?? []).map((order) => ({
      ...order,
      price: convertCurrencyValue(
        order.price,
        fromCurrencyCode,
        toCurrencyCode,
      ),
    })),
  };
}

export function formatCompactQuantity(value: number) {
  const roundedValue = Math.round(value);
  const sign = roundedValue < 0 ? "-" : "";
  const absoluteValue = Math.abs(roundedValue);

  if (absoluteValue < 10_000) {
    return `${sign}${formatNumber(absoluteValue)}`;
  }

  const tenThousands = Math.floor(absoluteValue / 10_000);
  const remainder = absoluteValue % 10_000;

  if (remainder === 0) {
    return `${sign}${formatNumber(tenThousands)}만`;
  }

  return `${sign}${formatNumber(tenThousands)}만 ${formatNumber(remainder)}`;
}

export function getVolumeChangeRate(stock: StockDetailData) {
  const previousCandle = stock.candles.at(-2);

  if (!previousCandle || previousCandle.volume <= 0) {
    return null;
  }

  return ((stock.volume - previousCandle.volume) / previousCandle.volume) * 100;
}

export function getMiddlePrice(
  bestAsk: StockOrderBookLevelData | undefined,
  bestBid: StockOrderBookLevelData | undefined,
) {
  if (!bestAsk || !bestBid) {
    return null;
  }

  return (bestAsk.price + bestBid.price) / 2;
}

export function getClosestLevelKey(
  levels: StockOrderBookLevelData[],
  currentPrice: number,
) {
  const [closestLevel] = [...levels].sort(
    (a, b) =>
      Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice),
  );

  return closestLevel ? getLevelKey(closestLevel) : null;
}

export function formatOrderTime(value: string) {
  return new Date(value).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

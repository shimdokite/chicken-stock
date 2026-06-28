import { unstable_cache } from "next/cache";
import {
  convertCurrencyValue,
  type CurrencyCode,
} from "../../(frontend)/utils/currency";
import { prisma } from "./prisma";
import type {
  StockData,
  StockMarket,
} from "../../(frontend)/components/main/stock_list/types";
import type { StocksPage } from "../../(frontend)/apis/stocks/api";

export const DEFAULT_STOCKS_PAGE = 1;
export const STOCKS_PAGE_SIZE = 10;

const MAX_STOCKS_COUNT = 50;
const STOCKS_PAGE_REVALIDATE_SECONDS = 10;

export type StockMarketFilter = StockMarket | "all";
export type StockRankingKey = "tradingAmount" | "tradingVolume";

type DecimalLike = {
  toNumber: () => number;
};

export function parseStockMarketFilter(value: string | null) {
  if (value === "domestic" || value === "global") {
    return value;
  }

  return "all";
}

export function parseStockRanking(value: string | null): StockRankingKey {
  if (value === "tradingVolume") {
    return value;
  }

  return "tradingAmount";
}

export function parsePositiveInteger(value: string | null, fallback: number) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    return fallback;
  }

  return numberValue;
}

function toNumber(value: DecimalLike) {
  return value.toNumber();
}

function formatPrice(value: number, currencyCode: CurrencyCode) {
  const krwValue = convertCurrencyValue(value, currencyCode, "KRW");

  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(krwValue)}원`;
}

function formatChangeRate(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatTradingValue(value: number, currencyCode: CurrencyCode) {
  const krwValue = convertCurrencyValue(value, currencyCode, "KRW");

  if (Math.abs(krwValue) >= 100_000_000) {
    return `${new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: 1,
    }).format(krwValue / 100_000_000)}억원`;
  }

  return `${new Intl.NumberFormat("ko-KR").format(krwValue)}원`;
}

function formatVolume(value: number) {
  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(value)}주`;
}

function getLogoLabel(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function getRankingValue(
  stock: {
    tradingValue: DecimalLike;
    volume: DecimalLike;
    currencyCode: CurrencyCode;
  },
  ranking: StockRankingKey,
) {
  if (ranking === "tradingVolume") {
    return toNumber(stock.volume);
  }

  return convertCurrencyValue(
    toNumber(stock.tradingValue),
    stock.currencyCode,
    "KRW",
  );
}

type GetStocksPageParams = {
  market: StockMarketFilter;
  ranking: StockRankingKey;
  page?: number;
  limit?: number;
};

export async function getStocksPage({
  market,
  ranking,
  page = DEFAULT_STOCKS_PAGE,
  limit = STOCKS_PAGE_SIZE,
}: GetStocksPageParams): Promise<StocksPage> {
  const pageLimit = Math.min(limit, STOCKS_PAGE_SIZE);
  const skip = (page - 1) * pageLimit;
  const remainingStocksCount = Math.max(MAX_STOCKS_COUNT - skip, 0);
  const pageSize = Math.min(pageLimit, remainingStocksCount);

  if (pageSize === 0) {
    return {
      stocks: [],
      nextPage: null,
    };
  }

  const stocks = await prisma.stock.findMany({
    where: {
      marketStatus: "LISTED",
      ...(market === "all"
        ? {}
        : {
            countryCode: market === "domestic" ? "KR" : { not: "KR" },
          }),
    },
    select: {
      id: true,
      name: true,
      countryCode: true,
      currencyCode: true,
      currentPrice: true,
      changeRate: true,
      tradingValue: true,
      volume: true,
    },
  });

  const sortedStocks = stocks
    .toSorted(
      (a, b) => getRankingValue(b, ranking) - getRankingValue(a, ranking),
    )
    .slice(0, MAX_STOCKS_COUNT + 1);

  const pageStocks = sortedStocks.slice(skip, skip + pageSize + 1);
  const hasNextPage =
    pageStocks.length > pageSize && skip + pageSize < MAX_STOCKS_COUNT;
  const visibleStocks = pageStocks.slice(0, pageSize);

  const data: StockData[] = visibleStocks.map((stock, index) => {
    const changeRate = toNumber(stock.changeRate);

    return {
      id: stock.id,
      rank: skip + index + 1,
      name: stock.name,
      price: formatPrice(toNumber(stock.currentPrice), stock.currencyCode),
      changeRate: formatChangeRate(changeRate),
      tradingAmount: formatTradingValue(
        toNumber(stock.tradingValue),
        stock.currencyCode,
      ),
      tradingVolume: formatVolume(toNumber(stock.volume)),
      rankingValue:
        ranking === "tradingVolume"
          ? formatVolume(toNumber(stock.volume))
          : formatTradingValue(
              toNumber(stock.tradingValue),
              stock.currencyCode,
            ),
      market: stock.countryCode === "KR" ? "domestic" : "global",
      trend: changeRate >= 0 ? "up" : "down",
      logoLabel: getLogoLabel(stock.name),
    };
  });

  return {
    stocks: data,
    nextPage: hasNextPage ? page + 1 : null,
  };
}

export const getCachedStocksPage = unstable_cache(
  getStocksPage,
  ["stocks-page-v1"],
  {
    revalidate: STOCKS_PAGE_REVALIDATE_SECONDS,
  },
);

import { unstable_cache } from "next/cache";
import { Prisma } from "../generated/prisma/client";
import {
  USD_KRW_EXCHANGE_RATE,
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

type RankedStockRow = {
  id: number;
  name: string;
  countryCode: string;
  currencyCode: CurrencyCode;
  currentPrice: DecimalLike;
  changeRate: DecimalLike;
  tradingValue: DecimalLike;
  volume: DecimalLike;
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

function getMarketCondition(market: StockMarketFilter) {
  if (market === "domestic") {
    return Prisma.sql`AND "country_code" = ${"KR"}`;
  }

  if (market === "global") {
    return Prisma.sql`AND "country_code" <> ${"KR"}`;
  }

  return Prisma.empty;
}

function getRankingExpression(ranking: StockRankingKey) {
  if (ranking === "tradingVolume") {
    return Prisma.sql`"volume"::double precision`;
  }

  return Prisma.sql`
    CASE
      WHEN "currency_code" = ${"USD"}::"Currency_code"
        THEN FLOOR(
          "trading_value"::double precision *
          ${USD_KRW_EXCHANGE_RATE}::double precision + 0.5
        )
      ELSE "trading_value"::double precision
    END
  `;
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

  const stocks = await prisma.$queryRaw<RankedStockRow[]>(Prisma.sql`
    SELECT "id",
           "name",
           "country_code" AS "countryCode",
           "currency_code" AS "currencyCode",
           "current_price" AS "currentPrice",
           "change_rate" AS "changeRate",
           "trading_value" AS "tradingValue",
           "volume"
    FROM "public"."Stock"
    WHERE "market_status" = ${"LISTED"}::"Stock_market_status"
    ${getMarketCondition(market)}
    ORDER BY ${getRankingExpression(ranking)} DESC, "id" ASC
    OFFSET ${skip}
    LIMIT ${pageSize + 1}
  `);

  const hasNextPage =
    stocks.length > pageSize && skip + pageSize < MAX_STOCKS_COUNT;
  const visibleStocks = stocks.slice(0, pageSize);

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

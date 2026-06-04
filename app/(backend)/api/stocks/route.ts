import { NextRequest, NextResponse } from "next/server";
import {
  convertCurrencyValue,
  type CurrencyCode,
} from "../../../(shared)/utils/currency";
import { prisma } from "../../lib/prisma";

const DEFAULT_STOCKS_PAGE = 1;
const STOCKS_PAGE_SIZE = 10;
const MAX_STOCKS_COUNT = 50;

type RankingKey = "tradingAmount" | "tradingVolume";

function parseMarket(value: string | null) {
  if (value === "domestic" || value === "global") {
    return value;
  }

  return "all";
}

function parseRanking(value: string | null): RankingKey {
  if (value === "tradingVolume") {
    return value;
  }

  return "tradingAmount";
}

function parsePositiveInteger(value: string | null, fallback: number) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    return fallback;
  }

  return numberValue;
}

function toNumber(value: { toNumber: () => number }) {
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
    tradingValue: { toNumber: () => number };
    volume: { toNumber: () => number };
    currencyCode: CurrencyCode;
  },
  ranking: RankingKey,
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const market = parseMarket(searchParams.get("market"));
    const ranking = parseRanking(searchParams.get("ranking"));
    const page = parsePositiveInteger(
      searchParams.get("page"),
      DEFAULT_STOCKS_PAGE,
    );
    const limit = Math.min(
      parsePositiveInteger(searchParams.get("limit"), STOCKS_PAGE_SIZE),
      STOCKS_PAGE_SIZE,
    );
    const skip = (page - 1) * limit;
    const remainingStocksCount = Math.max(MAX_STOCKS_COUNT - skip, 0);
    const pageSize = Math.min(limit, remainingStocksCount);

    if (pageSize === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          stocks: [],
          nextPage: null,
        },
      });
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

    const data = visibleStocks.map((stock, index) => {
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

    return NextResponse.json({
      ok: true,
      data: {
        stocks: data,
        nextPage: hasNextPage ? page + 1 : null,
      },
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "STOCKS_FETCH_FAILED"
        : error instanceof Error
          ? error.message
          : "STOCKS_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

const rankingOrderBy = {
  tradingAmount: { tradingValue: "desc" },
  tradingVolume: { volume: "desc" },
} as const;

const DEFAULT_STOCKS_PAGE = 1;
const STOCKS_PAGE_SIZE = 10;
const MAX_STOCKS_COUNT = 50;

type RankingKey = keyof typeof rankingOrderBy;

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

function formatPrice(value: number, currencyCode: string) {
  if (currencyCode === "KRW") {
    return `${new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: 0,
    }).format(value)}원`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatChangeRate(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatTradingValue(value: number, currencyCode: string) {
  if (currencyCode === "KRW") {
    if (Math.abs(value) >= 100_000_000) {
      return `${new Intl.NumberFormat("ko-KR", {
        maximumFractionDigits: 1,
      }).format(value / 100_000_000)}억원`;
    }

    return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getLogoLabel(name: string) {
  return name.trim().charAt(0).toUpperCase();
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
      where:
        market === "all"
          ? undefined
          : {
              countryCode:
                market === "domestic" ? "KR" : { not: "KR" },
            },
      orderBy: rankingOrderBy[ranking],
      skip,
      take: pageSize + 1,
      select: {
        id: true,
        name: true,
        countryCode: true,
        currencyCode: true,
        currentPrice: true,
        changeRate: true,
        tradingValue: true,
      },
    });
    const hasNextPage =
      stocks.length > pageSize && skip + pageSize < MAX_STOCKS_COUNT;
    const pageStocks = stocks.slice(0, pageSize);

    const data = pageStocks.map((stock, index) => {
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

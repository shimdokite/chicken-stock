import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

const rankingOrderBy = {
  tradingAmount: { tradingValue: "desc" },
  tradingVolume: { volume: "desc" },
} as const;

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

    const stocks = await prisma.stock.findMany({
      where:
        market === "all"
          ? undefined
          : {
              countryCode:
                market === "domestic" ? "KR" : { not: "KR" },
            },
      orderBy: rankingOrderBy[ranking],
      take: 8,
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

    const data = stocks.map((stock, index) => {
      const changeRate = toNumber(stock.changeRate);

      return {
        id: stock.id,
        rank: index + 1,
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
      data,
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

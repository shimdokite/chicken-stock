import { prisma } from "../../../../(backend)/lib/prisma";
import type {
  StockDetailData,
  StockFinancialStatementData,
} from "../../../types/stock/stock-detail";

type DecimalLike = {
  toNumber: () => number;
};

function toNumber(value: DecimalLike) {
  return value.toNumber();
}

function toNullableNumber(value: DecimalLike | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "number" ? value : value.toNumber();
}

function bigintToNullableNumber(value: bigint | null) {
  return value === null ? null : Number(value);
}

function toStatementData(
  value: unknown,
): StockFinancialStatementData["data"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as StockFinancialStatementData["data"];
}

export async function getStockDetailData(
  stockId: number,
): Promise<StockDetailData | null> {
  const stock = await prisma.stock.findUnique({
    where: {
      id: stockId,
    },
    include: {
      candles: {
        orderBy: {
          timestamp: "desc",
        },
        take: 18,
      },
      orderBookSnapshots: {
        orderBy: {
          timestamp: "desc",
        },
        take: 1,
        include: {
          levels: {
            orderBy: [
              {
                side: "asc",
              },
              {
                levelRank: "asc",
              },
            ],
          },
        },
      },
      financialMetric: true,
      financialStatements: {
        orderBy: [
          {
            fiscalYear: "desc",
          },
          {
            fiscalQuarter: "desc",
          },
          {
            statementType: "asc",
          },
        ],
      },
      earnings: {
        orderBy: [
          {
            fiscalYear: "desc",
          },
          {
            fiscalQuarter: "desc",
          },
        ],
      },
    },
  });

  if (!stock) {
    return null;
  }

  const [orderBookSnapshot] = stock.orderBookSnapshots;
  const [
    themePeerCount,
    themeStockAverage,
    themeFinancialMetricAverage,
  ] = await Promise.all([
      prisma.stock.count({
        where: {
          theme: stock.theme,
          id: {
            not: stock.id,
          },
        },
      }),
      prisma.stock.aggregate({
        where: {
          theme: stock.theme,
          id: {
            not: stock.id,
          },
        },
        _avg: {
          per: true,
        },
      }),
      prisma.stockFinancialMetric.aggregate({
        where: {
          stock: {
            theme: stock.theme,
            id: {
              not: stock.id,
            },
          },
        },
        _avg: {
          per: true,
          pbr: true,
        },
      }),
    ]);

  return {
    id: stock.id,
    ticker: stock.ticker,
    name: stock.name,
    imageUrl: stock.imageUrl || null,
    sector: stock.sector,
    riskLevel: stock.riskLevel,
    theme: stock.theme,
    countryCode: stock.countryCode,
    currencyCode: stock.currencyCode,
    currentPrice: toNumber(stock.currentPrice),
    previousClose: toNumber(stock.previousClose),
    changeAmount: toNumber(stock.changeAmount),
    changeRate: toNumber(stock.changeRate),
    dayHigh: toNumber(stock.dayHigh),
    dayLow: toNumber(stock.dayLow),
    high52w: toNumber(stock.high52w),
    low52w: toNumber(stock.low52w),
    volume: toNumber(stock.volume),
    tradingValue: toNumber(stock.tradingValue),
    marketCap: toNumber(stock.marketCap),
    per: toNumber(stock.per),
    eps: toNumber(stock.eps),
    marketStatus: stock.marketStatus,
    debtRatio: toNumber(stock.debtRatio),
    currentRatio: toNumber(stock.currentRatio),
    interestCoverageRatio: toNumber(stock.interestCoverageRatio),
    announcementDate: stock.announcementDate.toISOString(),
    estimatedOperatingProfit: stock.estimatedOperatingProfit,
    estimatedRevenue: toNumber(stock.estimatedRevenue),
    dividendCount: stock.dividendCount,
    dividendPerShare: toNumber(stock.dividendPerShare),
    dividendYield: toNumber(stock.dividendYield),
    candles: stock.candles
      .map((candle) => ({
        timestamp: Number(candle.timestamp),
        openPrice: toNumber(candle.openPrice),
        highPrice: toNumber(candle.highPrice),
        lowPrice: toNumber(candle.lowPrice),
        closePrice: toNumber(candle.closePrice),
      }))
      .reverse(),
    orderBookSnapshot: orderBookSnapshot
      ? {
          totalAskSize: toNumber(orderBookSnapshot.totalAskSize),
          totalBidSize: toNumber(orderBookSnapshot.totalBidSize),
          volume: toNumber(orderBookSnapshot.volume),
          buyVolume: toNumber(orderBookSnapshot.buyVolume),
          sellVolume: toNumber(orderBookSnapshot.sellVolume),
          executionStrength: toNumber(orderBookSnapshot.executionStrength),
          levels: orderBookSnapshot.levels.map((level) => ({
            side: level.side,
            levelRank: level.levelRank,
            price: toNumber(level.price),
            quantity: toNumber(level.quantity),
          })),
        }
      : null,
    financialMetric: stock.financialMetric
      ? {
          debtRatio: stock.financialMetric.debtRatio,
          currentRatio: stock.financialMetric.currentRatio,
          interestCoverageRatio: stock.financialMetric.interestCoverageRatio,
          per: stock.financialMetric.per,
          pbr: stock.financialMetric.pbr,
        }
      : null,
    themeFinancialMetric: {
      per:
        themeFinancialMetricAverage._avg.per ??
        toNullableNumber(themeStockAverage._avg.per),
      pbr: themeFinancialMetricAverage._avg.pbr,
      peerCount: themePeerCount,
    },
    financialStatements: stock.financialStatements.map((statement) => ({
      id: statement.id,
      statementType: statement.statementType,
      periodType: statement.periodType,
      fiscalYear: statement.fiscalYear,
      fiscalQuarter: statement.fiscalQuarter,
      data: toStatementData(statement.data),
    })),
    earnings: stock.earnings.map((earning) => ({
      id: earning.id,
      announcementDate: earning.announcementDate?.toISOString() ?? null,
      periodType: earning.periodType,
      fiscalYear: earning.fiscalYear,
      fiscalQuarter: earning.fiscalQuarter,
      estimatedRevenue: bigintToNullableNumber(earning.estimatedRevenue),
      estimatedOperatingProfit: bigintToNullableNumber(
        earning.estimatedOperatingProfit,
      ),
    })),
  };
}

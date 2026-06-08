import { prisma } from "../../../../(backend)/lib/prisma";
import {
  getOrderBookActivity,
  hasOrderBookActivity,
  serializeOrderBookActivitySnapshot,
  serializeOrderBookSnapshot,
} from "../../../../(backend)/lib/stock-order-book";
import type {
  StockDetailData,
  StockFinancialStatementData,
} from "../../../types/stock/stock-detail";

type ValuationSourceStock = {
  currentPrice: DecimalLike;
  marketCap: DecimalLike;
  financialStatements: {
    statementType: string;
    periodType: string;
    fiscalYear: number;
    fiscalQuarter: number | null;
    data: unknown;
  }[];
  earnings: {
    periodType: string;
    fiscalYear: number;
    fiscalQuarter: number | null;
    estimatedOperatingProfit: bigint | null;
  }[];
};

type DecimalLike = {
  toNumber: () => number;
};

function toNumber(value: DecimalLike) {
  return value.toNumber();
}

function bigintToNullableNumber(value: bigint | null) {
  return value === null ? null : Number(value);
}

function toStatementData(value: unknown): StockFinancialStatementData["data"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as StockFinancialStatementData["data"];
}

function average(values: Array<number | null>) {
  const validValues = values.filter(
    (value): value is number => value !== null && value > 0,
  );

  if (validValues.length === 0) {
    return null;
  }

  return (
    validValues.reduce((sum, value) => sum + value, 0) / validValues.length
  );
}

function roundMultiple(value: number | null) {
  return value === null || !Number.isFinite(value)
    ? null
    : Number(value.toFixed(2));
}

function getSharesOutstanding(stock: ValuationSourceStock) {
  const currentPrice = toNumber(stock.currentPrice);
  const marketCap = toNumber(stock.marketCap);

  if (currentPrice <= 0 || marketCap <= 0) {
    return null;
  }

  return marketCap / currentPrice;
}

function getLatestQuarterNetIncome(
  statements: ValuationSourceStock["financialStatements"],
) {
  return statements
    .filter(
      (statement) =>
        statement.statementType === "INCOME_STATEMENT" &&
        statement.periodType === "QUARTER",
    )
    .sort((a, b) => {
      if (a.fiscalYear !== b.fiscalYear) {
        return b.fiscalYear - a.fiscalYear;
      }

      return (b.fiscalQuarter ?? 0) - (a.fiscalQuarter ?? 0);
    })
    .slice(0, 4)
    .map((statement) => toStatementData(statement.data).netIncome)
    .filter((value): value is number => typeof value === "number");
}

function calculateCurrentPer(stock: ValuationSourceStock) {
  const sharesOutstanding = getSharesOutstanding(stock);

  if (!sharesOutstanding || sharesOutstanding <= 0) {
    return null;
  }

  const ttmNetIncome = getLatestQuarterNetIncome(
    stock.financialStatements,
  ).reduce((sum, value) => sum + value, 0);
  const eps = ttmNetIncome / sharesOutstanding;

  if (eps <= 0) {
    return null;
  }

  const per = toNumber(stock.currentPrice) / eps;

  return per > 0 ? per : null;
}

function getLatestEstimatedProfit(earnings: ValuationSourceStock["earnings"]) {
  return [...earnings]
    .sort((a, b) => {
      if (a.fiscalYear !== b.fiscalYear) {
        return b.fiscalYear - a.fiscalYear;
      }

      if (a.periodType !== b.periodType) {
        return a.periodType === "ANNUAL" ? -1 : 1;
      }

      return (b.fiscalQuarter ?? 0) - (a.fiscalQuarter ?? 0);
    })
    .map((earning) => bigintToNullableNumber(earning.estimatedOperatingProfit))
    .find((value): value is number => value !== null && value > 0);
}

function calculateForwardPer(stock: ValuationSourceStock) {
  const sharesOutstanding = getSharesOutstanding(stock);
  const estimatedProfit = getLatestEstimatedProfit(stock.earnings);

  if (!sharesOutstanding || sharesOutstanding <= 0 || !estimatedProfit) {
    return null;
  }

  const estimatedEps = estimatedProfit / sharesOutstanding;

  if (estimatedEps <= 0) {
    return null;
  }

  const forwardPer = toNumber(stock.currentPrice) / estimatedEps;

  return forwardPer > 0 ? forwardPer : null;
}

function getLatestCandleBaseDate(candles: { timestamp: bigint }[]) {
  const latestTimestamp = candles[0]?.timestamp;
  const date = latestTimestamp ? new Date(Number(latestTimestamp)) : new Date();

  return date.toISOString();
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
        take: 45,
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
  const [themePeerCount, themeFinancialMetricAverage, orderBookActivity] =
    await Promise.all([
      prisma.stock.count({
        where: {
          theme: stock.theme,
          id: {
            not: stock.id,
          },
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
      getOrderBookActivity(stock.id),
    ]);
  const valuationPeerStocks = await prisma.stock.findMany({
    where: {
      theme: stock.theme,
    },
    include: {
      financialStatements: true,
      earnings: true,
    },
  });
  const currentPer = roundMultiple(calculateCurrentPer(stock));
  const forwardPer = roundMultiple(calculateForwardPer(stock));
  const industryPer = roundMultiple(
    average(valuationPeerStocks.map(calculateCurrentPer)),
  );
  const industryForwardPer = roundMultiple(
    average(valuationPeerStocks.map(calculateForwardPer)),
  );
  const valuationBaseDate = getLatestCandleBaseDate(stock.candles);

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
        volume: toNumber(candle.volume),
      }))
      .reverse(),
    orderBookSnapshot: orderBookSnapshot
      ? serializeOrderBookSnapshot(orderBookSnapshot, orderBookActivity, stock)
      : hasOrderBookActivity(orderBookActivity)
        ? serializeOrderBookActivitySnapshot(orderBookActivity, stock)
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
      per: industryPer,
      forwardPer: industryForwardPer,
      pbr: themeFinancialMetricAverage._avg.pbr,
      peerCount: themePeerCount,
    },
    valuationMetric: {
      baseDate: valuationBaseDate,
      per: currentPer,
      industryPer,
      forwardPer,
      industryForwardPer,
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

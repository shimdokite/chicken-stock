import "server-only";

import { getTotalAvailableOrderAmountKrw } from "@/app/(backend)/lib/portfolio-balance";
import { getLatestOrderBookSnapshot } from "@/app/(backend)/lib/stock-order-book";
import {
  getCandlesByInterval,
  toDailyCandles,
  type CandleInterval,
} from "@/app/(backend)/lib/stock-candles";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import {
  CurrencyCode,
  TradeOrderStatus,
  TradeOrderType,
} from "@/app/(backend)/generated/prisma/enums";
import { prisma } from "./prisma";

export type StockSyncReason = "ORDER_CHANGED" | "TRADE_EXECUTED";

export class StockOrderContextError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StockOrderContextError";
  }
}

function serializeDate(value: Date) {
  return value.toISOString();
}

function serializeDecimalNumber(value: { toString: () => string }) {
  return Number(value.toString());
}

function getCashBalance(
  portfolio: {
    krwBalance: Prisma.Decimal;
    usdBalance: Prisma.Decimal;
  },
  currencyCode: CurrencyCode,
) {
  return currencyCode === CurrencyCode.KRW
    ? portfolio.krwBalance
    : portfolio.usdBalance;
}

function getOrderAmount(order: {
  pricePerShare: Prisma.Decimal;
  remainingQuantity: number;
}) {
  return order.pricePerShare.mul(order.remainingQuantity).toDecimalPlaces(2);
}

function sumPendingBuyAmount(
  orders: Array<{
    pricePerShare: Prisma.Decimal;
    remainingQuantity: number;
  }>,
) {
  return orders.reduce(
    (sum, order) => sum.add(getOrderAmount(order)),
    new Prisma.Decimal(0),
  );
}

function getNonNegativeDecimal(value: Prisma.Decimal) {
  return value.lt(0) ? new Prisma.Decimal(0) : value.toDecimalPlaces(2);
}

function getProfitRate(profit: Prisma.Decimal, invested: Prisma.Decimal) {
  if (invested.lte(0)) {
    return new Prisma.Decimal(0);
  }

  return profit.div(invested).mul(100).toDecimalPlaces(4);
}

function serializeTradeOrder(order: {
  orderId: bigint;
  type: TradeOrderType;
  quantity: number;
  pricePerShare: Prisma.Decimal;
  status: TradeOrderStatus;
  orderedAt: Date;
  filledQuantity: number;
  remainingQuantity: number;
  executedPrice: Prisma.Decimal | null;
  executedAt: Date | null;
  canceledAt: Date | null;
  currencyCode: CurrencyCode;
  ticker: string;
}) {
  return {
    canceledAt: order.canceledAt ? serializeDate(order.canceledAt) : null,
    currencyCode: order.currencyCode,
    executedAt: order.executedAt ? serializeDate(order.executedAt) : null,
    executedPrice: order.executedPrice
      ? serializeDecimalNumber(order.executedPrice)
      : null,
    filledQuantity: order.filledQuantity,
    orderId: order.orderId.toString(),
    orderedAt: serializeDate(order.orderedAt),
    pricePerShare: serializeDecimalNumber(order.pricePerShare),
    quantity: order.quantity,
    remainingQuantity: order.remainingQuantity,
    status: order.status,
    ticker: order.ticker,
    type: order.type,
  };
}

export async function getStockOrderContext(userId: bigint, stockId: number) {
  const stock = await prisma.stock.findUnique({
    select: {
      currencyCode: true,
      currentPrice: true,
      id: true,
      name: true,
      ticker: true,
    },
    where: {
      id: stockId,
    },
  });

  if (!stock) {
    throw new StockOrderContextError("종목을 찾을 수 없습니다.", 404);
  }

  const portfolio = await prisma.portfolio.findUnique({
    include: {
      items: {
        take: 1,
        where: {
          stockId,
        },
      },
    },
    where: {
      userId,
    },
  });

  if (!portfolio) {
    throw new StockOrderContextError("계좌가 없습니다.", 404);
  }

  const [pendingOrders, pendingBuyOrders] = await Promise.all([
    prisma.tradeOrder.findMany({
      orderBy: {
        orderedAt: "desc",
      },
      where: {
        portfolioId: portfolio.id,
        status: TradeOrderStatus.PENDING,
        stockId,
      },
    }),
    prisma.tradeOrder.findMany({
      where: {
        currencyCode: stock.currencyCode,
        portfolioId: portfolio.id,
        status: TradeOrderStatus.PENDING,
        type: TradeOrderType.BUY,
      },
    }),
  ]);
  const holding = portfolio.items[0] ?? null;
  const pendingSellQuantity = pendingOrders
    .filter((order) => order.type === TradeOrderType.SELL)
    .reduce((sum, order) => sum + order.remainingQuantity, 0);
  const buyingPower = getNonNegativeDecimal(
    getCashBalance(portfolio, stock.currencyCode).sub(
      sumPendingBuyAmount(pendingBuyOrders),
    ),
  );
  const holdingQuantity = holding?.quantity ?? 0;
  const sellableQuantity = Math.max(holdingQuantity - pendingSellQuantity, 0);
  const currentAmount = stock.currentPrice
    .mul(holdingQuantity)
    .toDecimalPlaces(2);
  const averagePrice = holding?.averagePrice ?? new Prisma.Decimal(0);
  const totalInvested =
    holding?.totalInvested ??
    averagePrice.mul(holdingQuantity).toDecimalPlaces(2);
  const currentProfit = currentAmount.sub(totalInvested).toDecimalPlaces(2);
  const fee = holding?.fee ?? new Prisma.Decimal(0);
  const saleTax = holding?.saleTax ?? new Prisma.Decimal(0);

  return {
    buyingPower: serializeDecimalNumber(buyingPower),
    holding: {
      averagePrice: serializeDecimalNumber(averagePrice),
      currentAmount: serializeDecimalNumber(currentAmount),
      currentProfit: serializeDecimalNumber(currentProfit),
      currentProfitRate: serializeDecimalNumber(
        getProfitRate(currentProfit, totalInvested),
      ),
      fee: serializeDecimalNumber(fee),
      quantity: holdingQuantity,
      saleTax: serializeDecimalNumber(saleTax),
      sellableQuantity,
      totalInvested: serializeDecimalNumber(totalInvested),
    },
    pendingOrderCount: pendingOrders.length,
    pendingOrders: pendingOrders.map((order) => ({
      ...serializeTradeOrder(order),
      stockId,
      stockName: stock.name,
    })),
    stock: {
      currencyCode: stock.currencyCode,
      currentPrice: serializeDecimalNumber(stock.currentPrice),
      id: stock.id,
      name: stock.name,
      ticker: stock.ticker,
    },
    totalAvailableOrderAmount: serializeDecimalNumber(
      getTotalAvailableOrderAmountKrw(
        portfolio.krwBalance,
        portfolio.usdBalance,
      ),
    ),
  };
}

export async function getStockCandlesSnapshot(stockId: number) {
  const stock = await prisma.stock.findUnique({
    select: {
      ticker: true,
    },
    where: {
      id: stockId,
    },
  });

  if (!stock) {
    return null;
  }

  const candles = await prisma.stockCandle.findMany({
    orderBy: {
      timestamp: "desc",
    },
    take: 1300,
    where: {
      intervalCode: "1D",
      ticker: stock.ticker,
    },
  });
  const dailyCandles = toDailyCandles(candles.reverse());
  const intervals: CandleInterval[] = ["DAY", "WEEK", "MONTH"];

  return Object.fromEntries(
    intervals.map((interval) => [
      interval,
      getCandlesByInterval(dailyCandles, interval),
    ]),
  ) as Record<CandleInterval, ReturnType<typeof getCandlesByInterval>>;
}

export async function getStockMarketSync(
  stockId: number,
  reason: StockSyncReason,
) {
  const [{ orderBookSnapshot }, candles] = await Promise.all([
    getLatestOrderBookSnapshot(stockId),
    reason === "TRADE_EXECUTED"
      ? getStockCandlesSnapshot(stockId)
      : Promise.resolve(null),
  ]);

  return {
    candles,
    orderBookSnapshot,
    reason,
  };
}

export async function getStockMutationSync({
  reason,
  stockId,
  userId,
}: {
  reason: StockSyncReason;
  stockId: number;
  userId: bigint;
}) {
  const [orderContext, marketSync] = await Promise.all([
    getStockOrderContext(userId, stockId),
    getStockMarketSync(stockId, reason),
  ]);

  return {
    ...marketSync,
    orderContext,
  };
}

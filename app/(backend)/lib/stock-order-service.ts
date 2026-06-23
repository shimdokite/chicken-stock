import { randomInt } from "node:crypto";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import {
  CurrencyCode,
  StockMarketStatus,
  TradeOrderStatus,
  TradeOrderType,
} from "@/app/(backend)/generated/prisma/enums";
import { prisma } from "@/app/(backend)/lib/prisma";
import {
  publishOrderFilledEventsForOrder,
  scheduleStockUpdated,
} from "@/app/(backend)/lib/realtime-events";
import {
  getEstimatedMarketOrderAmount,
  lockPortfolioRows,
  lockStockForOrderProcessing,
  matchStockOrder,
  StockOrderConcurrencyError,
  StockOrderMatchingError,
} from "@/app/(backend)/lib/stock-order-matching";
import {
  getStockMutationSync,
  type StockSyncReason,
} from "@/app/(backend)/lib/stock-order-sync";

export type StockOrderPriceType = "LIMIT" | "MARKET";

type TransactionClient = Prisma.TransactionClient;

export type CreateStockOrderInput = {
  orderPriceType: StockOrderPriceType;
  pricePerShare?: Prisma.Decimal | null;
  quantity: number;
  shouldMatch?: boolean;
  stockId: number;
  type: TradeOrderType;
  userId: bigint;
};

export class StockOrderServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "StockOrderServiceError";
  }
}

const ORDER_TRANSACTION_MAX_ATTEMPTS = 3;
const ORDER_TRANSACTION_RETRY_DELAY_MS = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorCode(error: unknown) {
  if (!isRecord(error)) {
    return null;
  }

  if (typeof error.code === "string") {
    return error.code;
  }

  if (isRecord(error.meta) && typeof error.meta.code === "string") {
    return error.meta.code;
  }

  return null;
}

function isRetryableOrderTransactionError(error: unknown) {
  if (error instanceof StockOrderConcurrencyError) {
    return true;
  }

  const code = getErrorCode(error);

  return code === "P2034" || code === "40001" || code === "40P01";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSerializableOrderTransaction<T>(
  operation: (tx: TransactionClient) => Promise<T>,
) {
  for (let attempt = 1; attempt <= ORDER_TRANSACTION_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (error) {
      if (
        !isRetryableOrderTransactionError(error) ||
        attempt >= ORDER_TRANSACTION_MAX_ATTEMPTS
      ) {
        if (isRetryableOrderTransactionError(error)) {
          throw new StockOrderServiceError(
            "동시 주문이 몰려 처리하지 못했습니다. 다시 시도해주세요.",
            409,
            "ORDER_CONCURRENCY_CONFLICT",
          );
        }

        throw error;
      }

      await wait(ORDER_TRANSACTION_RETRY_DELAY_MS * attempt);
    }
  }

  throw new StockOrderServiceError(
    "동시 주문이 몰려 처리하지 못했습니다. 다시 시도해주세요.",
    409,
    "ORDER_CONCURRENCY_CONFLICT",
  );
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

function createOrderId() {
  return BigInt(Date.now()) * BigInt(100000) + BigInt(randomInt(100000));
}

async function getLockedPortfolioForUser(
  tx: TransactionClient,
  userId: bigint,
  stockId: number,
) {
  const portfolioRef = await tx.portfolio.findUnique({
    select: {
      id: true,
    },
    where: {
      userId,
    },
  });

  if (!portfolioRef) {
    return null;
  }

  await lockPortfolioRows(tx, [portfolioRef.id]);

  return tx.portfolio.findUnique({
    include: {
      items: {
        take: 1,
        where: {
          stockId,
        },
      },
    },
    where: {
      id: portfolioRef.id,
    },
  });
}

function serializeDate(value: Date) {
  return value.toISOString();
}

function serializeDecimalNumber(value: { toString: () => string }) {
  return Number(value.toString());
}

export function serializeTradeOrder(order: {
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

async function getSafeStockMutationSync({
  reason,
  stockId,
  userId,
}: {
  reason: StockSyncReason;
  stockId: number;
  userId: bigint;
}) {
  try {
    return await getStockMutationSync({ reason, stockId, userId });
  } catch (error) {
    console.error("Stock order sync snapshot failed", {
      error,
      reason,
      stockId,
      userId: userId.toString(),
    });

    return null;
  }
}

function toStockOrderServiceError(error: unknown) {
  if (error instanceof StockOrderServiceError) {
    return error;
  }

  if (error instanceof StockOrderMatchingError) {
    return new StockOrderServiceError(
      error.message,
      error.status,
      error.status === 409 ? "ORDER_CONCURRENCY_CONFLICT" : "ORDER_MATCH_FAILED",
    );
  }

  throw error;
}

export async function createStockOrderForUser({
  orderPriceType,
  pricePerShare: inputPricePerShare = null,
  quantity,
  shouldMatch = true,
  stockId,
  type,
  userId,
}: CreateStockOrderInput) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new StockOrderServiceError(
      "유효한 주문 수량이 필요합니다.",
      400,
      "INVALID_QUANTITY",
    );
  }

  try {
    const orderId = createOrderId();
    const orderedAt = new Date();
    const order = await runSerializableOrderTransaction(async (tx) => {
      await lockStockForOrderProcessing(tx, stockId);

      const stock = await tx.stock.findUnique({
        select: {
          countryCode: true,
          currencyCode: true,
          currentPrice: true,
          id: true,
          imageUrl: true,
          marketStatus: true,
          name: true,
          ticker: true,
        },
        where: {
          id: stockId,
        },
      });

      if (!stock) {
        throw new StockOrderServiceError(
          "종목을 찾을 수 없습니다.",
          404,
          "INVALID_STOCK",
        );
      }

      if (stock.marketStatus !== StockMarketStatus.LISTED) {
        throw new StockOrderServiceError(
          "거래 가능한 종목이 아닙니다.",
          400,
          "INVALID_STOCK",
        );
      }

      const portfolio = await getLockedPortfolioForUser(tx, userId, stockId);

      if (!portfolio) {
        throw new StockOrderServiceError(
          "계좌가 없습니다.",
          404,
          "PORTFOLIO_NOT_FOUND",
        );
      }

      const pricePerShare =
        (orderPriceType === "LIMIT"
          ? inputPricePerShare
          : stock.currentPrice.toDecimalPlaces(2)) ??
        stock.currentPrice.toDecimalPlaces(2);
      const orderAmount =
        type === TradeOrderType.BUY && orderPriceType === "MARKET"
          ? await getEstimatedMarketOrderAmount(tx, {
              currentPrice: stock.currentPrice,
              portfolioId: portfolio.id,
              quantity,
              stockId,
              type,
            })
          : pricePerShare.mul(quantity).toDecimalPlaces(2);

      if (type === TradeOrderType.BUY) {
        const pendingBuyOrders = await tx.tradeOrder.findMany({
          where: {
            currencyCode: stock.currencyCode,
            portfolioId: portfolio.id,
            status: TradeOrderStatus.PENDING,
            type: TradeOrderType.BUY,
          },
        });
        const availableBuyAmount = getNonNegativeDecimal(
          getCashBalance(portfolio, stock.currencyCode).sub(
            sumPendingBuyAmount(pendingBuyOrders),
          ),
        );

        if (orderAmount.gt(availableBuyAmount)) {
          throw new StockOrderServiceError(
            "구매 가능 금액이 부족합니다.",
            400,
            "INSUFFICIENT_CASH",
          );
        }
      } else {
        const holding = portfolio.items[0];

        if (!holding || holding.quantity <= 0) {
          throw new StockOrderServiceError(
            "판매할 주식이 없습니다.",
            400,
            "INSUFFICIENT_POSITION",
          );
        }

        const pendingSellOrders = await tx.tradeOrder.findMany({
          where: {
            portfolioId: portfolio.id,
            status: TradeOrderStatus.PENDING,
            stockId,
            type: TradeOrderType.SELL,
          },
        });
        const pendingSellQuantity = pendingSellOrders.reduce(
          (sum, order) => sum + order.remainingQuantity,
          0,
        );
        const availableSellQuantity = holding.quantity - pendingSellQuantity;

        if (quantity > availableSellQuantity) {
          throw new StockOrderServiceError(
            "판매 가능 수량이 부족합니다.",
            400,
            "INSUFFICIENT_POSITION",
          );
        }
      }

      const createdOrder = await tx.tradeOrder.create({
        data: {
          currencyCode: stock.currencyCode,
          executedAt: null,
          executedPrice: null,
          filledQuantity: 0,
          orderId,
          orderedAt,
          portfolioId: portfolio.id,
          pricePerShare,
          quantity,
          remainingQuantity: quantity,
          status: TradeOrderStatus.PENDING,
          stockId,
          ticker: stock.ticker,
          type,
        },
      });

      if (!shouldMatch) {
        return createdOrder;
      }

      return (
        (await matchStockOrder(tx, {
          executedAt: orderedAt,
          orderId: createdOrder.orderId,
          orderPriceType,
          stock,
        })) ?? createdOrder
      );
    });

    const reason: StockSyncReason =
      order.filledQuantity > 0 ? "TRADE_EXECUTED" : "ORDER_CHANGED";

    await Promise.all([
      getSafeStockMutationSync({
        reason,
        stockId,
        userId,
      }),
      publishOrderFilledEventsForOrder(orderId, { since: orderedAt }),
    ]);

    scheduleStockUpdated(stockId, {
      reason,
      ticker: order.ticker,
    });

    return order;
  } catch (error) {
    throw toStockOrderServiceError(error);
  }
}

export async function matchPendingStockOrders({
  limit = 10,
  stockId,
}: {
  limit?: number;
  stockId?: number;
} = {}) {
  const startedAt = Date.now();
  let lastMark = startedAt;
  const markDuration = (step: string, extra?: Record<string, unknown>) => {
    const now = Date.now();

    console.info("Pending order matching step completed", {
      ...extra,
      elapsedMs: now - startedAt,
      step,
      stepMs: now - lastMark,
    });
    lastMark = now;
  };
  const pendingOrders = await prisma.tradeOrder.findMany({
    include: {
      portfolio: {
        select: {
          userId: true,
        },
      },
    },
    orderBy: {
      orderedAt: "asc",
    },
    take: limit,
    where: {
      remainingQuantity: {
        gt: 0,
      },
      status: TradeOrderStatus.PENDING,
      ...(stockId ? { stockId } : {}),
    },
  });
  let matchedCount = 0;
  let failedCount = 0;

  markDuration("load-pending-orders", {
    limit,
    pendingOrderCount: pendingOrders.length,
    stockId: stockId ?? null,
  });

  for (const pendingOrder of pendingOrders) {
    const orderStartedAt = Date.now();

    try {
      const matchedOrder = await runSerializableOrderTransaction(async (tx) => {
        await lockStockForOrderProcessing(tx, pendingOrder.stockId);

        const stock = await tx.stock.findUnique({
          select: {
            countryCode: true,
            currencyCode: true,
            currentPrice: true,
            id: true,
            imageUrl: true,
            name: true,
            ticker: true,
          },
          where: {
            id: pendingOrder.stockId,
          },
        });

        if (!stock) {
          throw new StockOrderServiceError(
            "종목을 찾을 수 없습니다.",
            404,
            "INVALID_STOCK",
          );
        }

        const beforeOrder = await tx.tradeOrder.findUnique({
          where: {
            orderId: pendingOrder.orderId,
          },
        });

        if (
          !beforeOrder ||
          beforeOrder.status !== TradeOrderStatus.PENDING ||
          beforeOrder.remainingQuantity <= 0
        ) {
          return null;
        }

        return matchStockOrder(tx, {
          orderId: pendingOrder.orderId,
          orderPriceType: "LIMIT",
          stock,
        });
      });

      if (matchedOrder && matchedOrder.filledQuantity > pendingOrder.filledQuantity) {
        matchedCount += 1;
        await Promise.all([
          getSafeStockMutationSync({
            reason: "TRADE_EXECUTED",
            stockId: pendingOrder.stockId,
            userId: pendingOrder.portfolio.userId,
          }),
          publishOrderFilledEventsForOrder(pendingOrder.orderId, {
            since: pendingOrder.orderedAt,
          }),
        ]);
        scheduleStockUpdated(pendingOrder.stockId, {
          reason: "TRADE_EXECUTED",
          ticker: pendingOrder.ticker,
        });
      }

      console.info("Pending order matching processed order", {
        durationMs: Date.now() - orderStartedAt,
        matched: Boolean(
          matchedOrder &&
            matchedOrder.filledQuantity > pendingOrder.filledQuantity,
        ),
        orderId: pendingOrder.orderId.toString(),
        stockId: pendingOrder.stockId,
      });
    } catch (error) {
      failedCount += 1;
      console.error("Pending order matching failed", {
        durationMs: Date.now() - orderStartedAt,
        error,
        orderId: pendingOrder.orderId.toString(),
        stockId: pendingOrder.stockId,
      });
    }
  }

  markDuration("process-pending-orders", {
    failedCount,
    matchedCount,
    scannedCount: pendingOrders.length,
  });

  return {
    failedCount,
    matchedCount,
    scannedCount: pendingOrders.length,
  };
}

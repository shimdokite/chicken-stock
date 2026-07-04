import { randomInt } from "node:crypto";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import {
  CurrencyCode,
  StockMarketStatus,
  TradeOrderStatus,
  TradeOrderType,
} from "@/app/(backend)/generated/prisma/enums";
import { prisma } from "@/app/(backend)/lib/prisma";
import { getMarketSessionStatus } from "@/app/(backend)/lib/market-hours";
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
import type { StockSyncReason } from "@/app/(backend)/lib/stock-order-sync";

export type StockOrderPriceType = "LIMIT" | "MARKET";
export type StockOrderRealtimeSyncMode = "full" | "lightweight";
export type StockOrderRealtimeDelivery = "inline" | "manual";

type TransactionClient = Prisma.TransactionClient;

export type CreateStockOrderInput = {
  allowExternalLiquidity?: boolean;
  orderPriceType: StockOrderPriceType;
  pricePerShare?: Prisma.Decimal | null;
  quantity: number;
  shouldMatch?: boolean;
  stockId: number;
  realtimeDelivery?: StockOrderRealtimeDelivery;
  realtimeSyncMode?: StockOrderRealtimeSyncMode;
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

const ORDER_TRANSACTION_MAX_ATTEMPTS = getPositiveIntegerEnv(
  "ORDER_TRANSACTION_MAX_ATTEMPTS",
  5,
);
const ORDER_TRANSACTION_RETRY_DELAY_MS = getPositiveIntegerEnv(
  "ORDER_TRANSACTION_RETRY_DELAY_MS",
  100,
);
const ORDER_TRANSACTION_MAX_WAIT_MS = getPositiveIntegerEnv(
  "ORDER_TRANSACTION_MAX_WAIT_MS",
  10_000,
);
const ORDER_TRANSACTION_TIMEOUT_MS = getPositiveIntegerEnv(
  "ORDER_TRANSACTION_TIMEOUT_MS",
  20_000,
);

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

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function runSerializableOrderTransaction<T>(
  operation: (tx: TransactionClient) => Promise<T>,
) {
  for (
    let attempt = 1;
    attempt <= ORDER_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: ORDER_TRANSACTION_MAX_WAIT_MS,
        timeout: ORDER_TRANSACTION_TIMEOUT_MS,
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

async function getStockMarketSessionStatus(stockId: number, date: Date) {
  const stock = await prisma.stock.findUnique({
    select: {
      countryCode: true,
    },
    where: {
      id: stockId,
    },
  });

  return stock ? getMarketSessionStatus(stock.countryCode, date) : null;
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
  orderPriceType: StockOrderPriceType;
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
    orderPriceType: order.orderPriceType,
    orderedAt: serializeDate(order.orderedAt),
    pricePerShare: serializeDecimalNumber(order.pricePerShare),
    quantity: order.quantity,
    remainingQuantity: order.remainingQuantity,
    status: order.status,
    ticker: order.ticker,
    type: order.type,
  };
}

function toStockOrderServiceError(error: unknown) {
  if (error instanceof StockOrderServiceError) {
    return error;
  }

  if (error instanceof StockOrderMatchingError) {
    return new StockOrderServiceError(
      error.message,
      error.status,
      error.status === 409
        ? "ORDER_CONCURRENCY_CONFLICT"
        : "ORDER_MATCH_FAILED",
    );
  }

  throw error;
}

async function getPendingStockOrders({
  limit,
  stockId,
}: {
  limit: number;
  stockId?: number;
}) {
  return prisma.$queryRaw<
    Array<{
      agentDecisionLogId: bigint | null;
      filledQuantity: number;
      orderId: bigint;
      orderPriceType: StockOrderPriceType;
      orderedAt: Date;
      portfolioUserId: bigint;
      remainingQuantity: number;
      stockId: number;
      ticker: string;
    }>
  >`
    WITH pending_orders AS (
      SELECT
        "Trade_order"."filled_quantity" AS "filledQuantity",
        "Trade_order"."order_id" AS "orderId",
        "Trade_order"."order_price_type" AS "orderPriceType",
        "Trade_order"."ordered_at" AS "orderedAt",
        "Trade_order"."portfolio_id" AS "portfolioId",
        "Trade_order"."price_per_share" AS "pricePerShare",
        "Trade_order"."remaining_quantity" AS "remainingQuantity",
        "Trade_order"."stock_id" AS "stockId",
        "Trade_order"."ticker",
        "Trade_order"."type",
        "Portfolio"."user_id" AS "portfolioUserId",
        "Agent_decision_log"."id" AS "agentDecisionLogId",
        CASE
          WHEN "Agent_decision_log"."id" IS NOT NULL
            AND (
              ("Trade_order"."type" = 'BUY'::"Trade_order_type"
                AND "Trade_order"."order_price_type" = 'MARKET'::"Trade_order_price_type")
              OR
              ("Trade_order"."type" = 'SELL'::"Trade_order_type"
                AND "Trade_order"."order_price_type" = 'MARKET'::"Trade_order_price_type")
              OR
              ("Trade_order"."type" = 'BUY'::"Trade_order_type"
                AND "Trade_order"."price_per_share" >= "Stock"."current_price")
              OR
              ("Trade_order"."type" = 'SELL'::"Trade_order_type"
                AND "Trade_order"."price_per_share" <= "Stock"."current_price")
            )
          THEN 0
          WHEN EXISTS (
            SELECT 1
            FROM "Trade_order" "Opposite_order"
            WHERE "Opposite_order"."portfolio_id" <> "Trade_order"."portfolio_id"
              AND "Opposite_order"."remaining_quantity" > 0
              AND "Opposite_order"."status" = ${TradeOrderStatus.PENDING}::"Trade_order_status"
              AND "Opposite_order"."stock_id" = "Trade_order"."stock_id"
              AND (
                ("Trade_order"."type" = 'BUY'::"Trade_order_type"
                  AND "Opposite_order"."type" = 'SELL'::"Trade_order_type"
                  AND (
                    "Trade_order"."order_price_type" = 'MARKET'::"Trade_order_price_type"
                    OR "Opposite_order"."price_per_share" <= "Trade_order"."price_per_share"
                  ))
                OR
                ("Trade_order"."type" = 'SELL'::"Trade_order_type"
                  AND "Opposite_order"."type" = 'BUY'::"Trade_order_type"
                  AND (
                    "Trade_order"."order_price_type" = 'MARKET'::"Trade_order_price_type"
                    OR "Opposite_order"."price_per_share" >= "Trade_order"."price_per_share"
                  ))
              )
          )
          THEN 1
          WHEN "Agent_decision_log"."id" IS NOT NULL THEN 2
          ELSE 3
        END AS "matchPriority"
      FROM "Trade_order"
      INNER JOIN "Portfolio"
        ON "Portfolio"."id" = "Trade_order"."portfolio_id"
      INNER JOIN "Stock"
        ON "Stock"."id" = "Trade_order"."stock_id"
      LEFT JOIN LATERAL (
        SELECT "id"
        FROM "Agent_decision_log"
        WHERE "Agent_decision_log"."executed_order_id" = "Trade_order"."order_id"
        ORDER BY "id" ASC
        LIMIT 1
      ) "Agent_decision_log" ON TRUE
      WHERE "Trade_order"."remaining_quantity" > 0
        AND "Trade_order"."status" = ${TradeOrderStatus.PENDING}::"Trade_order_status"
        ${stockId ? Prisma.sql`AND "Trade_order"."stock_id" = ${stockId}` : Prisma.empty}
    )
    SELECT
      "agentDecisionLogId",
      "filledQuantity",
      "orderId",
      "orderPriceType",
      "orderedAt",
      "portfolioUserId",
      "remainingQuantity",
      "stockId",
      "ticker"
    FROM pending_orders
    ORDER BY "matchPriority" ASC, "orderedAt" ASC, "orderId" ASC
    LIMIT ${limit}
  `;
}

async function filterOpenMarketPendingOrders<T extends { stockId: number }>(
  pendingOrders: T[],
) {
  const stockIds = Array.from(
    new Set(pendingOrders.map((order) => order.stockId)),
  );
  const stocks = await prisma.stock.findMany({
    select: {
      countryCode: true,
      id: true,
    },
    where: {
      id: {
        in: stockIds,
      },
    },
  });
  const openStockIds = new Set<number>();

  for (const stock of stocks) {
    const marketSession = await getMarketSessionStatus(stock.countryCode);

    if (marketSession?.isOpen === true) {
      openStockIds.add(stock.id);
    }
  }

  return pendingOrders.filter((order) => openStockIds.has(order.stockId));
}

export async function publishStockOrderRealtimeUpdate({
  order,
  realtimeSyncMode = "full",
  since,
}: {
  order: {
    filledQuantity: number;
    orderId: bigint;
    stockId: number;
    ticker: string;
  };
  realtimeSyncMode?: StockOrderRealtimeSyncMode;
  since?: Date;
}) {
  const reason: StockSyncReason =
    order.filledQuantity > 0 ? "TRADE_EXECUTED" : "ORDER_CHANGED";
  const includeSync = realtimeSyncMode === "full";

  await publishOrderFilledEventsForOrder(order.orderId, {
    includeSync,
    since,
  });

  scheduleStockUpdated(order.stockId, {
    includeSync,
    reason,
    ticker: order.ticker,
  });

  return reason;
}

export async function createStockOrderForUser({
  allowExternalLiquidity = false,
  orderPriceType,
  pricePerShare: inputPricePerShare = null,
  quantity,
  realtimeDelivery = "inline",
  realtimeSyncMode = "full",
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
    const marketSession = await getStockMarketSessionStatus(stockId, orderedAt);
    const shouldMatchImmediately =
      shouldMatch && marketSession?.isOpen === true;
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
        type === TradeOrderType.BUY &&
        orderPriceType === "MARKET" &&
        shouldMatchImmediately
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
          orderPriceType,
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

      if (!shouldMatchImmediately) {
        return createdOrder;
      }

      return (
        (await matchStockOrder(tx, {
          allowExternalLiquidity,
          executedAt: orderedAt,
          orderId: createdOrder.orderId,
          orderPriceType,
          stock,
        })) ?? createdOrder
      );
    });

    if (realtimeDelivery === "inline") {
      await publishStockOrderRealtimeUpdate({
        order,
        realtimeSyncMode,
        since: orderedAt,
      });
    }

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
  const pendingOrderCandidates = await getPendingStockOrders({
    limit,
    stockId,
  });
  const pendingOrders = await filterOpenMarketPendingOrders(
    pendingOrderCandidates,
  );
  let matchedCount = 0;
  let failedCount = 0;

  markDuration("load-pending-orders", {
    marketOpenPendingOrderCount: pendingOrders.length,
    limit,
    pendingOrderCount: pendingOrderCandidates.length,
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
          allowExternalLiquidity: pendingOrder.agentDecisionLogId !== null,
          orderId: pendingOrder.orderId,
          orderPriceType: pendingOrder.orderPriceType,
          stock,
        });
      });

      if (
        matchedOrder &&
        matchedOrder.filledQuantity > pendingOrder.filledQuantity
      ) {
        matchedCount += 1;
        await publishOrderFilledEventsForOrder(pendingOrder.orderId, {
          includeSync: false,
          since: pendingOrder.orderedAt,
        });
        scheduleStockUpdated(pendingOrder.stockId, {
          includeSync: false,
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
        priority: pendingOrder.agentDecisionLogId ? "AGENT" : "REGULAR",
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

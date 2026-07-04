import { after, NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  verifyAuthToken,
} from "@/app/(backend)/lib/auth";
import {
  scheduleStockUpdated,
} from "@/app/(backend)/lib/realtime-events";
import {
  getStockMutationSync,
  getStockOrderContext,
  StockOrderContextError,
  type StockSyncReason,
} from "@/app/(backend)/lib/stock-order-sync";
import {
  lockPortfolioRows,
  lockStockForOrderProcessing,
  StockOrderMatchingError,
  StockOrderConcurrencyError,
} from "@/app/(backend)/lib/stock-order-matching";
import {
  createStockOrderForUser,
  publishStockOrderRealtimeUpdate,
  serializeTradeOrder as serializeServiceTradeOrder,
  StockOrderServiceError,
} from "@/app/(backend)/lib/stock-order-service";
import { prisma } from "@/app/(backend)/lib/prisma";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import {
  TradeOrderStatus,
  TradeOrderType,
} from "@/app/(backend)/generated/prisma/enums";

export const runtime = "nodejs";

const orderTypes = new Set<string>(Object.values(TradeOrderType));
const orderPriceTypes = new Set(["LIMIT", "MARKET"]);
const ORDER_TRANSACTION_MAX_ATTEMPTS = 3;
const ORDER_TRANSACTION_RETRY_DELAY_MS = 30;

type OrderPriceType = "LIMIT" | "MARKET";
type TransactionClient = Prisma.TransactionClient;
type StockOrderParams = {
  params: Promise<{
    stockId: string;
  }>;
};

class StockOrderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function createStockOrderErrorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      error: message,
      message,
      ok: false,
    },
    { status },
  );
}

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
      });
    } catch (error) {
      if (
        !isRetryableOrderTransactionError(error) ||
        attempt >= ORDER_TRANSACTION_MAX_ATTEMPTS
      ) {
        if (isRetryableOrderTransactionError(error)) {
          throw new StockOrderConcurrencyError(
            "동시 주문이 몰려 처리하지 못했습니다. 다시 시도해주세요.",
          );
        }

        throw error;
      }

      await wait(ORDER_TRANSACTION_RETRY_DELAY_MS * attempt);
    }
  }

  throw new StockOrderConcurrencyError(
    "동시 주문이 몰려 처리하지 못했습니다. 다시 시도해주세요.",
  );
}

function getAuthenticatedUserId(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const payload = verifyAuthToken(accessToken, "access");

    return BigInt(payload.sub);
  } catch {
    return null;
  }
}

function parseStockId(value: string) {
  const stockId = Number(value);

  return Number.isInteger(stockId) && stockId > 0 ? stockId : null;
}

function isOrderType(value: unknown): value is TradeOrderType {
  return typeof value === "string" && orderTypes.has(value);
}

function isOrderPriceType(value: unknown): value is OrderPriceType {
  return typeof value === "string" && orderPriceTypes.has(value);
}

function parsePositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function parsePositiveDecimal(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  const decimalValue = new Prisma.Decimal(value).toDecimalPlaces(2);

  return decimalValue.lte(0) ? null : decimalValue;
}

async function getCreateOrderPayload(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (
    !isRecord(body) ||
    !isOrderType(body.type) ||
    !isOrderPriceType(body.orderPriceType)
  ) {
    return null;
  }

  const quantity = parsePositiveInteger(body.quantity);
  const limitPrice =
    body.orderPriceType === "LIMIT"
      ? parsePositiveDecimal(body.pricePerShare)
      : null;

  if (!quantity || (body.orderPriceType === "LIMIT" && !limitPrice)) {
    return null;
  }

  return {
    type: body.type,
    orderPriceType: body.orderPriceType,
    quantity,
    pricePerShare: limitPrice,
  };
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

export async function GET(request: NextRequest, { params }: StockOrderParams) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return createStockOrderErrorResponse("인증이 필요합니다.", 401);
  }

  const { stockId } = await params;
  const parsedStockId = parseStockId(stockId);

  if (!parsedStockId) {
    return createStockOrderErrorResponse("유효한 종목 ID가 필요합니다.", 400);
  }

  try {
    const orderContext = await getStockOrderContext(userId, parsedStockId);

    return NextResponse.json({
      ok: true,
      data: orderContext,
    });
  } catch (error) {
    if (error instanceof StockOrderContextError) {
      return createStockOrderErrorResponse(error.message, error.status);
    }

    console.error("Stock order context fetch failed", error);

    return createStockOrderErrorResponse(
      "주문 정보를 불러오지 못했습니다.",
      500,
    );
  }
}

export async function POST(request: NextRequest, { params }: StockOrderParams) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return createStockOrderErrorResponse("인증이 필요합니다.", 401);
  }

  const { stockId } = await params;
  const parsedStockId = parseStockId(stockId);

  if (!parsedStockId) {
    return createStockOrderErrorResponse("유효한 종목 ID가 필요합니다.", 400);
  }

  const payload = await getCreateOrderPayload(request);

  if (!payload) {
    return createStockOrderErrorResponse("유효한 주문 정보가 필요합니다.", 400);
  }

  try {
    const order = await createStockOrderForUser({
      orderPriceType: payload.orderPriceType,
      pricePerShare: payload.pricePerShare,
      quantity: payload.quantity,
      realtimeDelivery: "manual",
      stockId: parsedStockId,
      type: payload.type,
      userId,
    });
    const sync = await getSafeStockMutationSync({
      reason: order.filledQuantity > 0 ? "TRADE_EXECUTED" : "ORDER_CHANGED",
      stockId: parsedStockId,
      userId,
    });

    after(async () => {
      try {
        await publishStockOrderRealtimeUpdate({
          order,
          since: order.orderedAt,
        });
      } catch (error) {
        console.error("Stock order realtime publish failed", {
          error,
          orderId: order.orderId.toString(),
          stockId: parsedStockId,
        });
      }
    });

    return NextResponse.json({
      ok: true,
      data: {
        order: serializeServiceTradeOrder(order),
        sync,
      },
    });
  } catch (error) {
    if (
      error instanceof StockOrderError ||
      error instanceof StockOrderServiceError ||
      error instanceof StockOrderMatchingError
    ) {
      return createStockOrderErrorResponse(error.message, error.status);
    }

    console.error("Stock order creation failed", error);

    return createStockOrderErrorResponse("주문 처리에 실패했습니다.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: StockOrderParams,
) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return createStockOrderErrorResponse("인증이 필요합니다.", 401);
  }

  const { stockId } = await params;
  const parsedStockId = parseStockId(stockId);

  if (!parsedStockId) {
    return createStockOrderErrorResponse("유효한 종목 ID가 필요합니다.", 400);
  }

  const canceledAt = new Date();

  try {
    const result = await runSerializableOrderTransaction(async (tx) => {
      await lockStockForOrderProcessing(tx, parsedStockId);

      const portfolio = await getLockedPortfolioForUser(
        tx,
        userId,
        parsedStockId,
      );

      if (!portfolio) {
        throw new StockOrderError("계좌가 없습니다.", 404);
      }

      return tx.tradeOrder.updateMany({
        data: {
          canceledAt,
          remainingQuantity: 0,
          status: TradeOrderStatus.CANCELED,
        },
        where: {
          portfolioId: portfolio.id,
          status: TradeOrderStatus.PENDING,
          stockId: parsedStockId,
        },
      });
    });

    if (result.count > 0) {
      scheduleStockUpdated(parsedStockId, {
        changedAt: canceledAt.toISOString(),
        reason: "ORDER_CHANGED",
      });
    }
    const sync = await getSafeStockMutationSync({
      reason: "ORDER_CHANGED",
      stockId: parsedStockId,
      userId,
    });

    return NextResponse.json({
      ok: true,
      data: {
        canceledCount: result.count,
        sync,
      },
    });
  } catch (error) {
    if (
      error instanceof StockOrderError ||
      error instanceof StockOrderMatchingError
    ) {
      return createStockOrderErrorResponse(error.message, error.status);
    }

    console.error("Stock order cancellation failed", error);

    return createStockOrderErrorResponse("주문 취소에 실패했습니다.", 500);
  }
}

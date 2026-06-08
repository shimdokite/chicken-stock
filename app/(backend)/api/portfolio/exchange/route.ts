import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  verifyAuthToken,
} from "@/app/(backend)/lib/auth";
import {
  EXCHANGE_RATE,
  getTotalAvailableOrderAmountKrw,
} from "@/app/(backend)/lib/portfolio-balance";
import { prisma } from "@/app/(backend)/lib/prisma";
import { lockPortfolioRows } from "@/app/(backend)/lib/stock-order-matching";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import {
  CurrencyCode,
  TradeOrderStatus,
  TradeOrderType,
  TransactionType,
} from "@/app/(backend)/generated/prisma/enums";

export const runtime = "nodejs";

const exchangeTypes = new Set(["krwToUsd", "usdToKrw"]);
const EXCHANGE_TRANSACTION_MAX_ATTEMPTS = 3;
const EXCHANGE_TRANSACTION_RETRY_DELAY_MS = 30;

type ExchangeType = "krwToUsd" | "usdToKrw";
type TransactionClient = Prisma.TransactionClient;
type PendingBuyOrderAmount = {
  pricePerShare: Prisma.Decimal;
  remainingQuantity: number;
};

class PortfolioExchangeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
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

function isRetryablePortfolioTransactionError(error: unknown) {
  const code = getErrorCode(error);

  return code === "P2034" || code === "40001" || code === "40P01";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSerializablePortfolioTransaction<T>(
  operation: (tx: TransactionClient) => Promise<T>,
) {
  for (
    let attempt = 1;
    attempt <= EXCHANGE_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !isRetryablePortfolioTransactionError(error) ||
        attempt >= EXCHANGE_TRANSACTION_MAX_ATTEMPTS
      ) {
        if (isRetryablePortfolioTransactionError(error)) {
          throw new PortfolioExchangeError(
            "동시 요청이 몰려 환전을 처리하지 못했습니다. 다시 시도해주세요.",
            409,
          );
        }

        throw error;
      }

      await wait(EXCHANGE_TRANSACTION_RETRY_DELAY_MS * attempt);
    }
  }

  throw new PortfolioExchangeError(
    "동시 요청이 몰려 환전을 처리하지 못했습니다. 다시 시도해주세요.",
    409,
  );
}

function isExchangeType(value: unknown): value is ExchangeType {
  return typeof value === "string" && exchangeTypes.has(value);
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

function parseExchangeValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  const exchangeValue = new Prisma.Decimal(value).toDecimalPlaces(2);

  return exchangeValue.lte(0) ? null : exchangeValue;
}

async function getExchangePayload(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(body) || !isExchangeType(body.type)) {
    return null;
  }

  const value = parseExchangeValue(body.value);

  if (!value) {
    return null;
  }

  return {
    type: body.type,
    value,
  };
}

function serializeDecimalNumber(value: { toString: () => string }) {
  return Number(value.toString());
}

function createPortfolioTransactionId() {
  return randomUUID();
}

function getExchangedValue(type: ExchangeType, value: Prisma.Decimal) {
  const exchangeRate = new Prisma.Decimal(EXCHANGE_RATE);

  return type === "krwToUsd"
    ? value.div(exchangeRate).toDecimalPlaces(2)
    : value.mul(exchangeRate).toDecimalPlaces(2);
}

function getExchangeCompanyName(type: ExchangeType) {
  return type === "krwToUsd" ? "달러 환전" : "원화 환전";
}

function getPendingBuyOrderAmount(orders: PendingBuyOrderAmount[]) {
  return orders.reduce(
    (sum, order) =>
      sum.add(order.pricePerShare.mul(order.remainingQuantity)),
    new Prisma.Decimal(0),
  );
}

function getExchangeSourceCurrencyCode(type: ExchangeType) {
  return type === "krwToUsd" ? CurrencyCode.KRW : CurrencyCode.USD;
}

function getExchangeSourceBalance(
  portfolio: {
    krwBalance: Prisma.Decimal;
    usdBalance: Prisma.Decimal;
  },
  type: ExchangeType,
) {
  return type === "krwToUsd" ? portfolio.krwBalance : portfolio.usdBalance;
}

export async function POST(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json(
      { message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const payload = await getExchangePayload(request);

  if (!payload) {
    return NextResponse.json(
      { message: "유효한 환전 금액이 필요합니다." },
      { status: 400 },
    );
  }

  const exchangedValue = getExchangedValue(payload.type, payload.value);

  try {
    const portfolio = await runSerializablePortfolioTransaction(async (tx) => {
      const currentPortfolio = await tx.portfolio.findUnique({
        select: {
          id: true,
        },
        where: {
          userId,
        },
      });

      if (!currentPortfolio) {
        throw new PortfolioExchangeError("계좌가 없습니다.", 404);
      }

      await lockPortfolioRows(tx, [currentPortfolio.id]);

      const lockedPortfolio = await tx.portfolio.findUnique({
        select: {
          krwBalance: true,
          usdBalance: true,
        },
        where: {
          id: currentPortfolio.id,
        },
      });

      if (!lockedPortfolio) {
        throw new PortfolioExchangeError("계좌가 없습니다.", 404);
      }

      const sourceCurrencyCode = getExchangeSourceCurrencyCode(payload.type);
      const pendingBuyOrders = await tx.tradeOrder.findMany({
        select: {
          pricePerShare: true,
          remainingQuantity: true,
        },
        where: {
          currencyCode: sourceCurrencyCode,
          portfolioId: currentPortfolio.id,
          remainingQuantity: {
            gt: 0,
          },
          status: TradeOrderStatus.PENDING,
          type: TradeOrderType.BUY,
        },
      });
      const availableExchangeAmount = getExchangeSourceBalance(
        lockedPortfolio,
        payload.type,
      )
        .sub(getPendingBuyOrderAmount(pendingBuyOrders))
        .toDecimalPlaces(2);

      if (payload.value.gt(availableExchangeAmount)) {
        throw new PortfolioExchangeError("환전 가능 금액이 부족합니다.", 400);
      }

      const updateResult = await tx.portfolio.updateMany({
        data:
          payload.type === "krwToUsd"
            ? {
                krwBalance: {
                  decrement: payload.value,
                },
                usdBalance: {
                  increment: exchangedValue,
                },
              }
            : {
                krwBalance: {
                  increment: exchangedValue,
                },
                usdBalance: {
                  decrement: payload.value,
                },
              },
        where:
          payload.type === "krwToUsd"
            ? {
                id: currentPortfolio.id,
                krwBalance: {
                  gte: payload.value,
                },
              }
            : {
                id: currentPortfolio.id,
                usdBalance: {
                  gte: payload.value,
                },
              },
      });

      if (updateResult.count === 0) {
        throw new PortfolioExchangeError("환전 가능 금액이 부족합니다.", 400);
      }

      const executedAt = new Date();

      await tx.portfolioTransaction.create({
        data: {
          companyName: getExchangeCompanyName(payload.type),
          exchangeRate: new Prisma.Decimal(EXCHANGE_RATE),
          exchangeType: payload.type,
          executedAt,
          fee: new Prisma.Decimal(0),
          id: createPortfolioTransactionId(),
          paidAmount: payload.value,
          portfolioId: currentPortfolio.id,
          receivedAmount: exchangedValue,
          totalAmount: payload.value,
          totalQuantity: 0,
          transactionType: TransactionType.EXCHANGE,
          withdrawalAt: executedAt,
        },
      });

      const updatedPortfolio = await tx.portfolio.findUnique({
        select: {
          id: true,
          krwBalance: true,
          totalBalance: true,
          usdBalance: true,
        },
        where: {
          id: currentPortfolio.id,
        },
      });

      if (!updatedPortfolio) {
        throw new PortfolioExchangeError("계좌가 없습니다.", 404);
      }

      return updatedPortfolio;
    });

    return NextResponse.json({
      ok: true,
      exchangeRate: EXCHANGE_RATE,
      paidAmount: serializeDecimalNumber(payload.value),
      portfolio: {
        id: portfolio.id.toString(),
        krwBalance: serializeDecimalNumber(portfolio.krwBalance),
        totalAvailableOrderAmount: serializeDecimalNumber(
          getTotalAvailableOrderAmountKrw(
            portfolio.krwBalance,
            portfolio.usdBalance,
          ),
        ),
        totalBalance: serializeDecimalNumber(portfolio.totalBalance),
        usdBalance: serializeDecimalNumber(portfolio.usdBalance),
      },
      receivedAmount: serializeDecimalNumber(exchangedValue),
      type: payload.type,
    });
  } catch (error) {
    if (error instanceof PortfolioExchangeError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "환전에 실패했습니다." },
      { status: 500 },
    );
  }
}

import { randomUUID } from "node:crypto";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import {
  CurrencyCode,
  TradeOrderStatus,
  TradeOrderType,
  TransactionType,
} from "@/app/(backend)/generated/prisma/enums";

export type StockOrderPriceType = "LIMIT" | "MARKET";

type TransactionClient = Prisma.TransactionClient;

type MatchingStock = {
  countryCode: string;
  currencyCode: CurrencyCode;
  currentPrice: Prisma.Decimal;
  id: number;
  imageUrl: string;
  name: string;
  ticker: string;
};

type MatchingOrder = {
  orderId: bigint;
  portfolioId: bigint;
  stockId: number;
  ticker: string;
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
};

type MatchStockOrderParams = {
  executedAt?: Date;
  orderId: bigint;
  orderPriceType: StockOrderPriceType;
  stock: MatchingStock;
};

type EstimateMarketOrderAmountParams = {
  currentPrice: Prisma.Decimal;
  portfolioId?: bigint;
  quantity: number;
  stockId: number;
  type: TradeOrderType;
};

type RecordTradeExecutionParams = {
  aggressorSide: TradeOrderType;
  buyOrderId: bigint | null;
  executedAt: Date;
  executionPrice: Prisma.Decimal;
  quantity: number;
  sellOrderId: bigint | null;
  stock: MatchingStock;
};

const AssetType = {
  DOMESTIC_STOCK: "DOMESTIC_STOCK",
  FOREIGN_STOCK: "FOREIGN_STOCK",
} as const;

const DAILY_CANDLE_INTERVAL_CODE = "1D";
const KST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Seoul",
  year: "numeric",
});

export class StockOrderMatchingError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class StockOrderConcurrencyError extends StockOrderMatchingError {
  constructor(message = "동시 주문 처리 중 충돌이 발생했습니다.") {
    super(message, 409);
    this.name = "StockOrderConcurrencyError";
  }
}

export async function lockStockForOrderProcessing(
  tx: TransactionClient,
  stockId: number,
) {
  await tx.$queryRaw`
    SELECT "id"
    FROM "Stock"
    WHERE "id" = ${stockId}
    FOR UPDATE
  `;
}

export async function lockPortfolioRows(
  tx: TransactionClient,
  portfolioIds: Array<bigint | number>,
) {
  const ids = Array.from(new Set(portfolioIds.map((id) => id.toString())))
    .map((id) => BigInt(id))
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));

  if (ids.length === 0) {
    return;
  }

  await tx.$queryRaw`
    SELECT "id"
    FROM "Portfolio"
    WHERE "id" IN (${Prisma.join(ids)})
    ORDER BY "id" ASC
    FOR UPDATE
  `;
}

function createPortfolioTransactionId() {
  return randomUUID();
}

function getAssetType(countryCode: string) {
  return countryCode === "KR"
    ? AssetType.DOMESTIC_STOCK
    : AssetType.FOREIGN_STOCK;
}

function getCashBalanceField(currencyCode: CurrencyCode) {
  return currencyCode === CurrencyCode.KRW ? "krwBalance" : "usdBalance";
}

function getStockAmountField(countryCode: string) {
  return countryCode === "KR" ? "domesticStockAmount" : "foreignStockAmount";
}

function getProfitRate(profit: Prisma.Decimal, invested: Prisma.Decimal) {
  if (invested.lte(0)) {
    return new Prisma.Decimal(0);
  }

  return profit.div(invested).mul(100).toDecimalPlaces(4);
}

function getFillAmount(pricePerShare: Prisma.Decimal, quantity: number) {
  return pricePerShare.mul(quantity).toDecimalPlaces(2);
}

function getTradeExecutionId() {
  return randomUUID();
}

function getDailyCandleTimestamp(executedAt: Date) {
  const parts = KST_DATE_FORMATTER.formatToParts(executedAt);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return BigInt(Date.UTC(year, month - 1, day));
}

function minDecimal(left: Prisma.Decimal, right: Prisma.Decimal) {
  return left.lte(right) ? left : right;
}

function maxDecimal(left: Prisma.Decimal, right: Prisma.Decimal) {
  return left.gte(right) ? left : right;
}

export async function getEstimatedMarketOrderAmount(
  tx: TransactionClient,
  {
    currentPrice,
    portfolioId,
    quantity,
    stockId,
    type,
  }: EstimateMarketOrderAmountParams,
) {
  let remainingQuantity = quantity;
  let executionPrice = currentPrice.toDecimalPlaces(2);
  let orderAmount = new Prisma.Decimal(0);
  const candidates = await tx.tradeOrder.findMany({
    orderBy:
      type === TradeOrderType.BUY
        ? [
            {
              pricePerShare: "asc",
            },
            {
              orderedAt: "asc",
            },
          ]
        : [
            {
              pricePerShare: "desc",
            },
            {
              orderedAt: "asc",
            },
          ],
    where: {
      ...(portfolioId
        ? {
            portfolioId: {
              not: portfolioId,
            },
          }
        : {}),
      remainingQuantity: {
        gt: 0,
      },
      status: TradeOrderStatus.PENDING,
      stockId,
      type: getOppositeOrderType(type),
    },
  });

  for (const candidateOrder of candidates) {
    if (remainingQuantity <= 0) {
      break;
    }

    const fillQuantity = Math.min(
      remainingQuantity,
      candidateOrder.remainingQuantity,
    );

    executionPrice = candidateOrder.pricePerShare.toDecimalPlaces(2);
    orderAmount = orderAmount.add(getFillAmount(executionPrice, fillQuantity));
    remainingQuantity -= fillQuantity;
  }

  if (remainingQuantity > 0) {
    throw new StockOrderMatchingError(
      "시장가로 체결할 수 있는 상대 호가가 부족합니다.",
      400,
    );
  }

  return orderAmount.toDecimalPlaces(2);
}

function getStockChangeRate(
  changeAmount: Prisma.Decimal,
  previousClose: Prisma.Decimal,
) {
  if (previousClose.lte(0)) {
    return new Prisma.Decimal(0);
  }

  return changeAmount.div(previousClose).mul(100).toDecimalPlaces(4);
}

async function updateDailyCandleAfterExecution(
  tx: TransactionClient,
  {
    executedAt,
    executionPrice,
    quantity,
    ticker,
  }: {
    executedAt: Date;
    executionPrice: Prisma.Decimal;
    quantity: number;
    ticker: string;
  },
): Promise<boolean> {
  const timestamp = getDailyCandleTimestamp(executedAt);
  const candleId = {
    ticker_intervalCode_timestamp: {
      intervalCode: DAILY_CANDLE_INTERVAL_CODE,
      ticker,
      timestamp,
    },
  };
  const currentCandle = await tx.stockCandle.findUnique({
    where: candleId,
  });

  if (!currentCandle) {
    await tx.stockCandle.create({
      data: {
        closePrice: executionPrice,
        highPrice: executionPrice,
        intervalCode: DAILY_CANDLE_INTERVAL_CODE,
        lowPrice: executionPrice,
        openPrice: executionPrice,
        ticker,
        timestamp,
        volume: quantity,
      },
    });
    return true;
  }

  await tx.stockCandle.update({
    data: {
      closePrice: executionPrice,
      highPrice: maxDecimal(currentCandle.highPrice, executionPrice),
      lowPrice: minDecimal(currentCandle.lowPrice, executionPrice),
      volume: {
        increment: quantity,
      },
    },
    where: candleId,
  });

  return false;
}

async function updatePortfolioItemsMarketPrice(
  tx: TransactionClient,
  stockId: number,
  executionPrice: Prisma.Decimal,
) {
  await tx.$executeRaw`
    UPDATE "Portfolio_item"
    SET
      "current_price" = ${executionPrice},
      "current_amount" = ROUND((${executionPrice} * "quantity")::numeric, 2),
      "evaluation_amount" = ROUND((${executionPrice} * "quantity")::numeric, 2),
      "profit" = ROUND(((${executionPrice} * "quantity") - "total_invested")::numeric, 2),
      "profit_rate" = CASE
        WHEN "total_invested" > 0 THEN ROUND(((((${executionPrice} * "quantity") - "total_invested") / "total_invested") * 100)::numeric, 4)
        ELSE 0
      END,
      "updated_at" = NOW()
    WHERE "stock_id" = ${stockId}
  `;
}

async function recordTradeExecution(
  tx: TransactionClient,
  {
    aggressorSide,
    buyOrderId,
    executedAt,
    executionPrice,
    quantity,
    sellOrderId,
    stock,
  }: RecordTradeExecutionParams,
) {
  const currentStock = await tx.stock.findUnique({
    select: {
      dayHigh: true,
      dayLow: true,
      high52w: true,
      low52w: true,
      previousClose: true,
    },
    where: {
      id: stock.id,
    },
  });

  if (!currentStock) {
    throw new StockOrderMatchingError("종목을 찾을 수 없습니다.", 404);
  }

  const price = executionPrice.toDecimalPlaces(2);
  const fillAmount = getFillAmount(price, quantity);
  const changeAmount = price.sub(currentStock.previousClose).toDecimalPlaces(2);
  const isNewDailyCandle = await updateDailyCandleAfterExecution(tx, {
    executedAt,
    executionPrice: price,
    quantity,
    ticker: stock.ticker,
  });

  await tx.tradeExecution.create({
    data: {
      aggressorSide,
      buyOrderId,
      executedAt,
      id: getTradeExecutionId(),
      price,
      quantity,
      sellOrderId,
      stockId: stock.id,
      ticker: stock.ticker,
    },
  });

  await tx.stock.update({
    data: {
      changeAmount,
      changeRate: getStockChangeRate(changeAmount, currentStock.previousClose),
      currentPrice: price,
      dayHigh: isNewDailyCandle
        ? price
        : maxDecimal(currentStock.dayHigh, price),
      dayLow: isNewDailyCandle ? price : minDecimal(currentStock.dayLow, price),
      high52w: maxDecimal(currentStock.high52w, price),
      low52w: minDecimal(currentStock.low52w, price),
      tradingValue: isNewDailyCandle ? fillAmount : { increment: fillAmount },
      volume: isNewDailyCandle ? quantity : { increment: quantity },
    },
    where: {
      id: stock.id,
    },
  });
  await updatePortfolioItemsMarketPrice(tx, stock.id, price);
}

function getNextExecutedPrice(
  order: MatchingOrder,
  fillQuantity: number,
  executionPrice: Prisma.Decimal,
) {
  const currentFilledQuantity = order.filledQuantity;

  if (!order.executedPrice || currentFilledQuantity <= 0) {
    return executionPrice.toDecimalPlaces(2);
  }

  return order.executedPrice
    .mul(currentFilledQuantity)
    .add(executionPrice.mul(fillQuantity))
    .div(currentFilledQuantity + fillQuantity)
    .toDecimalPlaces(2);
}

async function updateOrderAfterFill(
  tx: TransactionClient,
  order: MatchingOrder,
  fillQuantity: number,
  executionPrice: Prisma.Decimal,
  executedAt: Date,
) {
  const nextRemainingQuantity = order.remainingQuantity - fillQuantity;
  const nextStatus =
    nextRemainingQuantity <= 0
      ? TradeOrderStatus.COMPLETED
      : TradeOrderStatus.PENDING;
  const updateResult = await tx.tradeOrder.updateMany({
    data: {
      executedAt,
      executedPrice: getNextExecutedPrice(order, fillQuantity, executionPrice),
      filledQuantity: {
        increment: fillQuantity,
      },
      remainingQuantity: {
        decrement: fillQuantity,
      },
      status: nextStatus,
    },
    where: {
      orderId: order.orderId,
      remainingQuantity: {
        gte: fillQuantity,
      },
      status: TradeOrderStatus.PENDING,
    },
  });

  if (updateResult.count === 0) {
    throw new StockOrderConcurrencyError();
  }

  const updatedOrder = await tx.tradeOrder.findUnique({
    where: {
      orderId: order.orderId,
    },
  });

  if (!updatedOrder) {
    throw new StockOrderConcurrencyError();
  }

  return updatedOrder;
}

async function applyBuyFill(
  tx: TransactionClient,
  {
    executedAt,
    executionPrice,
    orderId,
    portfolioId,
    quantity,
    stock,
  }: {
    executedAt: Date;
    executionPrice: Prisma.Decimal;
    orderId: bigint;
    portfolioId: bigint;
    quantity: number;
    stock: MatchingStock;
  },
) {
  const fillAmount = getFillAmount(executionPrice, quantity);
  const holding = await tx.portfolioItem.findUnique({
    where: {
      portfolioId_stockId: {
        portfolioId,
        stockId: stock.id,
      },
    },
  });
  const currentQuantity = holding?.quantity ?? 0;
  const nextQuantity = currentQuantity + quantity;
  const currentInvested = holding?.totalInvested ?? new Prisma.Decimal(0);
  const nextInvested = currentInvested.add(fillAmount).toDecimalPlaces(2);
  const nextAveragePrice = nextInvested.div(nextQuantity).toDecimalPlaces(2);
  const currentAmount = stock.currentPrice.mul(nextQuantity).toDecimalPlaces(2);
  const profit = currentAmount.sub(nextInvested).toDecimalPlaces(2);

  await tx.portfolioItem.upsert({
    create: {
      assetType: getAssetType(stock.countryCode),
      averagePrice: nextAveragePrice,
      companyLogoUrl: stock.imageUrl,
      companyName: stock.name,
      currentAmount,
      currentPrice: stock.currentPrice,
      evaluationAmount: currentAmount,
      portfolioId,
      profit,
      profitRate: getProfitRate(profit, nextInvested),
      quantity: nextQuantity,
      stockId: stock.id,
      totalInvested: nextInvested,
    },
    update: {
      averagePrice: nextAveragePrice,
      currentAmount,
      currentPrice: stock.currentPrice,
      evaluationAmount: currentAmount,
      profit,
      profitRate: getProfitRate(profit, nextInvested),
      quantity: nextQuantity,
      totalInvested: nextInvested,
    },
    where: {
      portfolioId_stockId: {
        portfolioId,
        stockId: stock.id,
      },
    },
  });

  const cashBalanceField = getCashBalanceField(stock.currencyCode);
  const stockAmountField = getStockAmountField(stock.countryCode);
  const portfolioUpdateResult = await tx.portfolio.updateMany({
    data: {
      [cashBalanceField]: {
        decrement: fillAmount,
      },
      [stockAmountField]: {
        increment: fillAmount,
      },
      totalInvestmentAmount: {
        increment: fillAmount,
      },
    },
    where: {
      [cashBalanceField]: {
        gte: fillAmount,
      },
      id: portfolioId,
    },
  });

  if (portfolioUpdateResult.count === 0) {
    throw new StockOrderMatchingError("구매 가능 금액이 부족합니다.", 400);
  }

  await tx.portfolioTransaction.create({
    data: {
      companyName: stock.name,
      executedAt,
      fee: new Prisma.Decimal(0),
      id: createPortfolioTransactionId(),
      portfolioId,
      purchaseAmount: fillAmount,
      stockId: stock.id,
      totalAmount: fillAmount,
      totalQuantity: quantity,
      tradeOrderId: orderId,
      transactionType: TransactionType.BUY,
      withdrawalAt: executedAt,
    },
  });
}

async function applySellFill(
  tx: TransactionClient,
  {
    executedAt,
    executionPrice,
    orderId,
    portfolioId,
    quantity,
    stock,
  }: {
    executedAt: Date;
    executionPrice: Prisma.Decimal;
    orderId: bigint;
    portfolioId: bigint;
    quantity: number;
    stock: MatchingStock;
  },
) {
  const holding = await tx.portfolioItem.findUnique({
    where: {
      portfolioId_stockId: {
        portfolioId,
        stockId: stock.id,
      },
    },
  });

  if (!holding || holding.quantity < quantity) {
    throw new StockOrderMatchingError("판매 가능 수량이 부족합니다.", 400);
  }

  const fillAmount = getFillAmount(executionPrice, quantity);
  const nextQuantity = holding.quantity - quantity;
  const costBasis = holding.averagePrice.mul(quantity).toDecimalPlaces(2);
  const realizedProfit = fillAmount.sub(costBasis).toDecimalPlaces(2);

  if (nextQuantity <= 0) {
    await tx.portfolioItem.delete({
      where: {
        portfolioId_stockId: {
          portfolioId,
          stockId: stock.id,
        },
      },
    });
  } else {
    const nextInvested = holding.averagePrice
      .mul(nextQuantity)
      .toDecimalPlaces(2);
    const currentAmount = stock.currentPrice
      .mul(nextQuantity)
      .toDecimalPlaces(2);
    const profit = currentAmount.sub(nextInvested).toDecimalPlaces(2);

    await tx.portfolioItem.update({
      data: {
        currentAmount,
        currentPrice: stock.currentPrice,
        evaluationAmount: currentAmount,
        profit,
        profitRate: getProfitRate(profit, nextInvested),
        quantity: nextQuantity,
        totalInvested: nextInvested,
      },
      where: {
        portfolioId_stockId: {
          portfolioId,
          stockId: stock.id,
        },
      },
    });
  }

  const cashBalanceField = getCashBalanceField(stock.currencyCode);
  const stockAmountField = getStockAmountField(stock.countryCode);

  await tx.portfolio.update({
    data: {
      [cashBalanceField]: {
        increment: fillAmount,
      },
      [stockAmountField]: {
        decrement: costBasis,
      },
      totalInvestmentAmount: {
        decrement: costBasis,
      },
    },
    where: {
      id: portfolioId,
    },
  });

  await tx.portfolioTransaction.create({
    data: {
      companyName: stock.name,
      executedAt,
      fee: new Prisma.Decimal(0),
      id: createPortfolioTransactionId(),
      portfolioId,
      purchaseAmount: costBasis,
      realizedProfit,
      stockId: stock.id,
      totalAmount: fillAmount,
      totalQuantity: quantity,
      tradeOrderId: orderId,
      transactionType: TransactionType.SELL,
      withdrawalAt: executedAt,
    },
  });
}

function getOppositeOrderType(type: TradeOrderType) {
  return type === TradeOrderType.BUY ? TradeOrderType.SELL : TradeOrderType.BUY;
}

function getTradeOrderTypeDbValue(type: TradeOrderType) {
  return type === TradeOrderType.BUY ? "매수" : "매도";
}

async function getMatchCandidates(
  tx: TransactionClient,
  incomingOrder: MatchingOrder,
  orderPriceType: StockOrderPriceType,
) {
  const priceFilter =
    orderPriceType === "MARKET"
      ? Prisma.empty
      : incomingOrder.type === TradeOrderType.BUY
        ? Prisma.sql`AND "price_per_share" <= ${incomingOrder.pricePerShare}`
        : Prisma.sql`AND "price_per_share" >= ${incomingOrder.pricePerShare}`;
  const oppositeOrderType = getOppositeOrderType(incomingOrder.type);
  const oppositeOrderTypeDbValue = getTradeOrderTypeDbValue(oppositeOrderType);
  const orderBy =
    incomingOrder.type === TradeOrderType.BUY
      ? Prisma.sql`"price_per_share" ASC, "ordered_at" ASC, "order_id" ASC`
      : Prisma.sql`"price_per_share" DESC, "ordered_at" ASC, "order_id" ASC`;

  return tx.$queryRaw<MatchingOrder[]>`
    SELECT
      "order_id" AS "orderId",
      "portfolio_id" AS "portfolioId",
      "stock_id" AS "stockId",
      "ticker",
      "type",
      "quantity",
      "price_per_share" AS "pricePerShare",
      "status",
      "ordered_at" AS "orderedAt",
      "filled_quantity" AS "filledQuantity",
      "remaining_quantity" AS "remainingQuantity",
      "executed_price" AS "executedPrice",
      "executed_at" AS "executedAt",
      "canceled_at" AS "canceledAt",
      "currency_code" AS "currencyCode"
    FROM "Trade_order"
    WHERE "portfolio_id" <> ${incomingOrder.portfolioId}
      AND "remaining_quantity" > 0
      AND "status" = ${TradeOrderStatus.PENDING}::"Trade_order_status"
      AND "stock_id" = ${incomingOrder.stockId}
      AND "type" = ${oppositeOrderTypeDbValue}::"Trade_order_type"
      ${priceFilter}
    ORDER BY ${orderBy}
    FOR UPDATE SKIP LOCKED
  `;
}

async function executeInternalFill(
  tx: TransactionClient,
  {
    candidateOrder,
    executedAt,
    incomingOrder,
    quantity,
    stock,
  }: {
    candidateOrder: MatchingOrder;
    executedAt: Date;
    incomingOrder: MatchingOrder;
    quantity: number;
    stock: MatchingStock;
  },
) {
  const buyOrder =
    incomingOrder.type === TradeOrderType.BUY ? incomingOrder : candidateOrder;
  const sellOrder =
    incomingOrder.type === TradeOrderType.SELL ? incomingOrder : candidateOrder;
  const executionPrice = candidateOrder.pricePerShare.toDecimalPlaces(2);

  await lockPortfolioRows(tx, [buyOrder.portfolioId, sellOrder.portfolioId]);

  await applyBuyFill(tx, {
    executedAt,
    executionPrice,
    orderId: buyOrder.orderId,
    portfolioId: buyOrder.portfolioId,
    quantity,
    stock,
  });
  await applySellFill(tx, {
    executedAt,
    executionPrice,
    orderId: sellOrder.orderId,
    portfolioId: sellOrder.portfolioId,
    quantity,
    stock,
  });

  const updatedBuyOrder = await updateOrderAfterFill(
    tx,
    buyOrder,
    quantity,
    executionPrice,
    executedAt,
  );
  const updatedSellOrder = await updateOrderAfterFill(
    tx,
    sellOrder,
    quantity,
    executionPrice,
    executedAt,
  );

  await recordTradeExecution(tx, {
    aggressorSide: incomingOrder.type,
    buyOrderId: buyOrder.orderId,
    executedAt,
    executionPrice,
    quantity,
    sellOrderId: sellOrder.orderId,
    stock,
  });

  return incomingOrder.type === TradeOrderType.BUY
    ? updatedBuyOrder
    : updatedSellOrder;
}

export async function matchStockOrder(
  tx: TransactionClient,
  {
    executedAt = new Date(),
    orderId,
    orderPriceType,
    stock,
  }: MatchStockOrderParams,
) {
  let incomingOrder: MatchingOrder | null = await tx.tradeOrder.findUnique({
    where: {
      orderId,
    },
  });

  if (
    !incomingOrder ||
    incomingOrder.status !== TradeOrderStatus.PENDING ||
    incomingOrder.remainingQuantity <= 0
  ) {
    return incomingOrder;
  }

  const candidates = await getMatchCandidates(
    tx,
    incomingOrder,
    orderPriceType,
  );

  for (const candidateOrder of candidates) {
    if (incomingOrder.remainingQuantity <= 0) {
      break;
    }

    const fillQuantity = Math.min(
      incomingOrder.remainingQuantity,
      candidateOrder.remainingQuantity,
    );

    incomingOrder = await executeInternalFill(tx, {
      candidateOrder,
      executedAt,
      incomingOrder,
      quantity: fillQuantity,
      stock,
    });
  }

  if (
    orderPriceType === "MARKET" &&
    incomingOrder &&
    incomingOrder.remainingQuantity > 0
  ) {
    throw new StockOrderMatchingError(
      "시장가로 체결할 수 있는 상대 호가가 부족합니다.",
      400,
    );
  }

  return incomingOrder;
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { portfolioQueryKeys } from "../portfolio/queries";
import {
  cancelAllStockOrders,
  cancelStockOrder,
  createStockOrder,
  type CreateStockOrderRequest,
  type StockCandleInterval,
  type StockMutationSync,
  type StockMutationSyncReason,
  type StockOrderContext,
  type StockPendingOrder,
  type UpdateStockOrderRequest,
  updateStockOrder,
} from "./api";
import { stockQueryKeys } from "./queries";
import type {
  StockOrderBookLevelData,
  StockOrderBookSnapshotData,
} from "../../types/stock/stock-detail";

type CreateStockOrderVariables = {
  idempotencyKey: string;
  payload: CreateStockOrderRequest;
  stockId: number;
};

type UpdateStockOrderVariables = {
  orderId: string;
  payload: UpdateStockOrderRequest;
  stockId: number;
};

type CancelStockOrderVariables = {
  orderId: string;
  stockId: number;
};

type OptimisticCreateStockOrderContext = {
  optimisticOrder: StockPendingOrder | null;
};

function getOptimisticOrderId() {
  return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getOrderPrice(
  payload: CreateStockOrderRequest,
  orderContext: StockOrderContext,
) {
  const price =
    payload.orderPriceType === "LIMIT"
      ? payload.pricePerShare
      : orderContext.stock.currentPrice;

  return typeof price === "number" && Number.isFinite(price) && price > 0
    ? price
    : 0;
}

function getOrderBookSide(type: CreateStockOrderRequest["type"]) {
  return type === "SELL" ? "ASK" : "BID";
}

function shouldCreateOptimisticPendingOrder(
  payload: CreateStockOrderRequest,
  orderContext: StockOrderContext,
) {
  return !(
    payload.orderPriceType === "MARKET" &&
    orderContext.marketSession?.isOpen === true
  );
}

function getOptimisticPendingOrder(
  payload: CreateStockOrderRequest,
  orderContext: StockOrderContext,
): StockPendingOrder | null {
  if (!shouldCreateOptimisticPendingOrder(payload, orderContext)) {
    return null;
  }

  const pricePerShare = getOrderPrice(payload, orderContext);

  if (pricePerShare <= 0 || payload.quantity <= 0) {
    return null;
  }

  return {
    canceledAt: null,
    currencyCode: orderContext.stock.currencyCode,
    executedAt: null,
    executedPrice: null,
    filledQuantity: 0,
    orderId: getOptimisticOrderId(),
    orderPriceType: payload.orderPriceType,
    orderedAt: new Date().toISOString(),
    pricePerShare,
    quantity: payload.quantity,
    remainingQuantity: payload.quantity,
    status: "PENDING",
    stockId: orderContext.stock.id,
    stockName: orderContext.stock.name,
    ticker: orderContext.stock.ticker,
    type: payload.type,
  };
}

function applyOptimisticOrderContext(
  orderContext: StockOrderContext,
  optimisticOrder: StockPendingOrder,
) {
  const orderAmount =
    optimisticOrder.pricePerShare * optimisticOrder.remainingQuantity;

  return {
    ...orderContext,
    buyingPower:
      optimisticOrder.type === "BUY"
        ? Math.max(orderContext.buyingPower - orderAmount, 0)
        : orderContext.buyingPower,
    holding:
      optimisticOrder.type === "SELL"
        ? {
            ...orderContext.holding,
            sellableQuantity: Math.max(
              orderContext.holding.sellableQuantity -
                optimisticOrder.remainingQuantity,
              0,
            ),
          }
        : orderContext.holding,
    pendingOrderCount: orderContext.pendingOrderCount + 1,
    pendingOrders: [optimisticOrder, ...orderContext.pendingOrders],
  };
}

function removeOptimisticOrderContext(
  orderContext: StockOrderContext,
  optimisticOrder: StockPendingOrder,
) {
  const hasOptimisticOrder = orderContext.pendingOrders.some(
    (order) => order.orderId === optimisticOrder.orderId,
  );

  if (!hasOptimisticOrder) {
    return orderContext;
  }

  const orderAmount =
    optimisticOrder.pricePerShare * optimisticOrder.remainingQuantity;
  const nextSellableQuantity =
    optimisticOrder.type === "SELL"
      ? Math.min(
          orderContext.holding.sellableQuantity +
            optimisticOrder.remainingQuantity,
          orderContext.holding.quantity,
        )
      : orderContext.holding.sellableQuantity;

  return {
    ...orderContext,
    buyingPower:
      optimisticOrder.type === "BUY"
        ? orderContext.buyingPower + orderAmount
        : orderContext.buyingPower,
    holding:
      optimisticOrder.type === "SELL"
        ? {
            ...orderContext.holding,
            sellableQuantity: nextSellableQuantity,
          }
        : orderContext.holding,
    pendingOrderCount: Math.max(orderContext.pendingOrderCount - 1, 0),
    pendingOrders: orderContext.pendingOrders.filter(
      (order) => order.orderId !== optimisticOrder.orderId,
    ),
  };
}

function getEmptyOrderBookSnapshot(
  orderContext: StockOrderContext,
): StockOrderBookSnapshotData {
  return {
    buyVolume: 0,
    currentPrice: orderContext.stock.currentPrice,
    dayHigh: orderContext.stock.currentPrice,
    dayLow: orderContext.stock.currentPrice,
    executionStrength: 0,
    lastTradeVolume: 0,
    levels: [],
    previousClose: orderContext.stock.currentPrice,
    recentOrders: [],
    sellVolume: 0,
    timestamp: Date.now(),
    totalAskSize: 0,
    totalBidSize: 0,
    volume: 0,
    volumeAmount: 0,
  };
}

function rankOrderBookLevels(levels: StockOrderBookLevelData[]) {
  const asks = levels
    .filter((level) => level.side === "ASK")
    .sort((left, right) => left.price - right.price)
    .map((level, index) => ({
      ...level,
      levelRank: index + 1,
    }));
  const bids = levels
    .filter((level) => level.side === "BID")
    .sort((left, right) => right.price - left.price)
    .map((level, index) => ({
      ...level,
      levelRank: index + 1,
    }));

  return [...asks, ...bids];
}

function getOrderBookLevelTotals(levels: StockOrderBookLevelData[]) {
  return levels.reduce(
    (totals, level) => {
      if (level.side === "ASK") {
        totals.totalAskSize += level.quantity;
      } else {
        totals.totalBidSize += level.quantity;
      }

      return totals;
    },
    {
      totalAskSize: 0,
      totalBidSize: 0,
    },
  );
}

function applyOptimisticOrderBookSnapshot(
  previousSnapshot: StockOrderBookSnapshotData | null | undefined,
  orderContext: StockOrderContext,
  optimisticOrder: StockPendingOrder,
) {
  const price = optimisticOrder.pricePerShare;

  if (price <= 0 || optimisticOrder.remainingQuantity <= 0) {
    return previousSnapshot;
  }

  const side = getOrderBookSide(optimisticOrder.type);
  const baseSnapshot =
    previousSnapshot ?? getEmptyOrderBookSnapshot(orderContext);
  const levels = baseSnapshot.levels.map((level) => ({ ...level }));
  const existingLevel = levels.find(
    (level) => level.side === side && level.price === price,
  );

  if (existingLevel) {
    existingLevel.orderCount += 1;
    existingLevel.quantity += optimisticOrder.remainingQuantity;
  } else {
    levels.push({
      levelRank: Number.MAX_SAFE_INTEGER,
      orderCount: 1,
      price,
      quantity: optimisticOrder.remainingQuantity,
      side,
    });
  }

  const rankedLevels = rankOrderBookLevels(levels);
  const { totalAskSize, totalBidSize } = getOrderBookLevelTotals(rankedLevels);

  return {
    ...baseSnapshot,
    levels: rankedLevels,
    timestamp: Date.now(),
    totalAskSize,
    totalBidSize,
  };
}

function removeOptimisticOrderBookSnapshot(
  snapshot: StockOrderBookSnapshotData | null | undefined,
  optimisticOrder: StockPendingOrder,
) {
  if (!snapshot) {
    return snapshot;
  }

  let removed = false;
  const side = getOrderBookSide(optimisticOrder.type);
  const nextLevels = snapshot.levels.flatMap((level) => {
    if (
      removed ||
      level.side !== side ||
      level.price !== optimisticOrder.pricePerShare
    ) {
      return [level];
    }

    removed = true;

    const nextQuantity = level.quantity - optimisticOrder.remainingQuantity;
    const nextOrderCount = level.orderCount - 1;

    if (nextQuantity <= 0 || nextOrderCount <= 0) {
      return [];
    }

    return [
      {
        ...level,
        orderCount: nextOrderCount,
        quantity: nextQuantity,
      },
    ];
  });

  if (!removed) {
    return snapshot;
  }

  const rankedLevels = rankOrderBookLevels(nextLevels);
  const { totalAskSize, totalBidSize } = getOrderBookLevelTotals(rankedLevels);

  return {
    ...snapshot,
    levels: rankedLevels,
    timestamp: Date.now(),
    totalAskSize,
    totalBidSize,
  };
}

function useInvalidateStockOrderQueries() {
  const queryClient = useQueryClient();

  return (
    stockId: number,
    reason: StockMutationSyncReason = "TRADE_EXECUTED",
  ) => {
    void queryClient.invalidateQueries({
      queryKey: stockQueryKeys.orders(stockId),
    });
    void queryClient.invalidateQueries({
      queryKey: stockQueryKeys.orderBook(stockId),
    });

    if (reason === "ORDER_CHANGED") {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: stockQueryKeys.lists(),
    });
    void queryClient.invalidateQueries({
      queryKey: ["stock-candles", stockId],
    });
    void queryClient.invalidateQueries({
      queryKey: portfolioQueryKeys.myPortfolio,
    });
  };
}

function applyStockMutationSync(
  queryClient: QueryClient,
  stockId: number,
  sync: StockMutationSync,
) {
  queryClient.setQueryData(stockQueryKeys.orders(stockId), sync.orderContext);
  queryClient.setQueryData(
    stockQueryKeys.orderBook(stockId),
    sync.orderBookSnapshot,
  );

  Object.entries(sync.candles ?? {}).forEach(([interval, candles]) => {
    queryClient.setQueryData(
      stockQueryKeys.candles(stockId, interval as StockCandleInterval),
      candles,
    );
  });

  if (sync.reason !== "TRADE_EXECUTED") {
    return;
  }

  void queryClient.invalidateQueries({
    queryKey: stockQueryKeys.lists(),
  });
  void queryClient.invalidateQueries({
    queryKey: portfolioQueryKeys.myPortfolio,
  });
}

function getOrderMutationReason(data: {
  order?: {
    filledQuantity: number;
  };
}) {
  return data.order && data.order.filledQuantity > 0
    ? "TRADE_EXECUTED"
    : "ORDER_CHANGED";
}

function useApplyStockOrderMutationResult() {
  const queryClient = useQueryClient();
  const invalidateStockOrderQueries = useInvalidateStockOrderQueries();

  return (
    stockId: number,
    sync: StockMutationSync | null,
    fallbackReason: StockMutationSyncReason,
  ) => {
    if (sync) {
      applyStockMutationSync(queryClient, stockId, sync);
      return;
    }

    invalidateStockOrderQueries(stockId, fallbackReason);
  };
}

export function useCreateStockOrder() {
  const queryClient = useQueryClient();
  const applyStockOrderMutationResult = useApplyStockOrderMutationResult();

  return useMutation({
    mutationFn: ({
      idempotencyKey,
      payload,
      stockId,
    }: CreateStockOrderVariables) =>
      createStockOrder(stockId, payload, idempotencyKey),
    onMutate: async ({
      payload,
      stockId,
    }): Promise<OptimisticCreateStockOrderContext> => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: stockQueryKeys.orders(stockId),
        }),
        queryClient.cancelQueries({
          queryKey: stockQueryKeys.orderBook(stockId),
        }),
      ]);

      const previousOrderContext = queryClient.getQueryData<StockOrderContext>(
        stockQueryKeys.orders(stockId),
      );
      const previousOrderBookSnapshot =
        queryClient.getQueryData<StockOrderBookSnapshotData | null>(
          stockQueryKeys.orderBook(stockId),
        );
      const optimisticOrder = previousOrderContext
        ? getOptimisticPendingOrder(payload, previousOrderContext)
        : null;

      if (previousOrderContext && optimisticOrder) {
        queryClient.setQueryData(
          stockQueryKeys.orders(stockId),
          applyOptimisticOrderContext(previousOrderContext, optimisticOrder),
        );
        queryClient.setQueryData(
          stockQueryKeys.orderBook(stockId),
          applyOptimisticOrderBookSnapshot(
            previousOrderBookSnapshot,
            previousOrderContext,
            optimisticOrder,
          ),
        );
      }

      return {
        optimisticOrder,
      };
    },
    onError: (_error, variables, context) => {
      const optimisticOrder = context?.optimisticOrder;
      let removedOptimisticOrder = false;

      if (!optimisticOrder) {
        return;
      }

      queryClient.setQueryData<StockOrderContext | undefined>(
        stockQueryKeys.orders(variables.stockId),
        (currentOrderContext) => {
          if (
            !currentOrderContext?.pendingOrders.some(
              (order) => order.orderId === optimisticOrder.orderId,
            )
          ) {
            return currentOrderContext;
          }

          removedOptimisticOrder = true;

          return removeOptimisticOrderContext(
            currentOrderContext,
            optimisticOrder,
          );
        },
      );

      if (!removedOptimisticOrder) {
        return;
      }

      queryClient.setQueryData<StockOrderBookSnapshotData | null | undefined>(
        stockQueryKeys.orderBook(variables.stockId),
        (currentOrderBookSnapshot) =>
          removeOptimisticOrderBookSnapshot(
            currentOrderBookSnapshot,
            optimisticOrder,
          ),
      );
    },
    onSuccess: (data, variables) => {
      applyStockOrderMutationResult(
        variables.stockId,
        data.sync,
        getOrderMutationReason(data),
      );
    },
  });
}

export function useUpdateStockOrder() {
  const applyStockOrderMutationResult = useApplyStockOrderMutationResult();

  return useMutation({
    mutationFn: ({ orderId, payload, stockId }: UpdateStockOrderVariables) =>
      updateStockOrder(stockId, orderId, payload),
    onSuccess: (data, variables) => {
      applyStockOrderMutationResult(
        variables.stockId,
        data.sync,
        getOrderMutationReason(data),
      );
    },
  });
}

export function useCancelStockOrder() {
  const applyStockOrderMutationResult = useApplyStockOrderMutationResult();

  return useMutation({
    mutationFn: ({ orderId, stockId }: CancelStockOrderVariables) =>
      cancelStockOrder(stockId, orderId),
    onSuccess: (data, variables) => {
      applyStockOrderMutationResult(
        variables.stockId,
        data.sync,
        "ORDER_CHANGED",
      );
    },
  });
}

export function useCancelAllStockOrders(stockId: number) {
  const applyStockOrderMutationResult = useApplyStockOrderMutationResult();

  return useMutation({
    mutationFn: () => cancelAllStockOrders(stockId),
    onSuccess: (data) => {
      applyStockOrderMutationResult(stockId, data.sync, "ORDER_CHANGED");
    },
  });
}

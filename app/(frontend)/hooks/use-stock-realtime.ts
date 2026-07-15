"use client";

import { useEffect, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { portfolioQueryKeys } from "@/app/(frontend)/apis/portfolio/queries";
import type {
  StockCandleInterval,
  StockMarketSync,
  StockMutationSync,
} from "@/app/(frontend)/apis/stocks/api";
import { stockQueryKeys } from "@/app/(frontend)/apis/stocks/queries";
import type { ChartCandleData } from "@/app/(frontend)/components/stock-detail/order/chart-panel/types";
import type { StockOrderBookSnapshotData } from "@/app/(frontend)/types/stock/stock-detail";
import { showSuccessToast } from "@/app/(frontend)/utils/toast";

type UserOrderFilledPayload = {
  executedAt: string;
  orderId: string;
  price: number;
  quantity: number;
  side: "BUY" | "SELL";
  stockId: number;
  stockName: string;
  sync?: StockMutationSync | null;
  ticker: string;
  totalAmount: number;
};

type StockUpdatedPayload = StockMarketSync & {
  stockId: number;
  sync?: StockMarketSync | null;
  ticker?: string;
};

type IdleCallbackHandle = ReturnType<Window["requestIdleCallback"]>;

function scheduleRealtimeSubscription(subscribe: () => void | Promise<void>) {
  let idleCallbackId: IdleCallbackHandle | null = null;
  let timeoutId: number | null = null;

  const animationFrameId = window.requestAnimationFrame(() => {
    const requestIdleCallback =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback.bind(window)
        : null;

    if (requestIdleCallback) {
      idleCallbackId = requestIdleCallback(
        () => {
          void subscribe();
        },
        {
          timeout: 1_500,
        },
      );
      return;
    }

    timeoutId = window.setTimeout(() => {
      void subscribe();
    }, 0);
  });

  return () => {
    window.cancelAnimationFrame(animationFrameId);

    if (idleCallbackId !== null) {
      window.cancelIdleCallback(idleCallbackId);
    }

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUserOrderFilledPayload(
  value: unknown,
): value is UserOrderFilledPayload {
  return (
    isRecord(value) &&
    typeof value.executedAt === "string" &&
    typeof value.orderId === "string" &&
    typeof value.price === "number" &&
    typeof value.quantity === "number" &&
    (value.side === "BUY" || value.side === "SELL") &&
    typeof value.stockId === "number" &&
    typeof value.stockName === "string" &&
    typeof value.ticker === "string" &&
    typeof value.totalAmount === "number"
  );
}

function hasMarketSyncPayload(value: unknown): value is StockMarketSync {
  return isRecord(value) && "orderBookSnapshot" in value;
}

function hasMutationSyncPayload(value: unknown): value is StockMutationSync {
  return hasMarketSyncPayload(value) && "orderContext" in value;
}

function isSameOrderBookSnapshot(
  previous: StockOrderBookSnapshotData | null | undefined,
  next: StockOrderBookSnapshotData | null,
) {
  if (previous === next) {
    return true;
  }

  if (!previous || !next) {
    return previous === next;
  }

  if (
    previous.timestamp !== next.timestamp ||
    previous.currentPrice !== next.currentPrice ||
    previous.previousClose !== next.previousClose ||
    previous.changeRate !== next.changeRate ||
    previous.dayHigh !== next.dayHigh ||
    previous.dayLow !== next.dayLow ||
    previous.volumeAmount !== next.volumeAmount ||
    previous.totalAskSize !== next.totalAskSize ||
    previous.totalBidSize !== next.totalBidSize ||
    previous.volume !== next.volume ||
    previous.buyVolume !== next.buyVolume ||
    previous.sellVolume !== next.sellVolume ||
    previous.executionStrength !== next.executionStrength ||
    previous.lastTradeVolume !== next.lastTradeVolume ||
    previous.levels.length !== next.levels.length ||
    previous.recentOrders.length !== next.recentOrders.length
  ) {
    return false;
  }

  const hasSameLevels = previous.levels.every((level, index) => {
    const nextLevel = next.levels[index];

    return (
      level.side === nextLevel.side &&
      level.levelRank === nextLevel.levelRank &&
      level.orderCount === nextLevel.orderCount &&
      level.price === nextLevel.price &&
      level.quantity === nextLevel.quantity
    );
  });

  if (!hasSameLevels) {
    return false;
  }

  return previous.recentOrders.every((order, index) => {
    const nextOrder = next.recentOrders[index];

    return (
      order.id === nextOrder.id &&
      order.orderedAt === nextOrder.orderedAt &&
      order.price === nextOrder.price &&
      order.quantity === nextOrder.quantity &&
      order.side === nextOrder.side &&
      order.status === nextOrder.status
    );
  });
}

function mergeLatestCandle(
  previousCandles: ChartCandleData[] | undefined,
  nextCandles: ChartCandleData[],
) {
  const latestCandle = nextCandles.at(-1);

  if (!latestCandle) {
    return previousCandles ?? nextCandles;
  }

  if (!previousCandles || previousCandles.length === 0) {
    return nextCandles;
  }

  const existingIndex = previousCandles.findIndex(
    (candle) => candle.time === latestCandle.time,
  );

  if (existingIndex >= 0) {
    const nextMergedCandles = [...previousCandles];
    nextMergedCandles[existingIndex] = latestCandle;

    return nextMergedCandles;
  }

  const previousLatestCandle = previousCandles.at(-1);

  if (
    !previousLatestCandle ||
    String(latestCandle.time).localeCompare(String(previousLatestCandle.time)) >
      0
  ) {
    return [...previousCandles, latestCandle];
  }

  return previousCandles;
}

function invalidateStockMarketQueries(
  queryClient: QueryClient,
  stockId: number,
  reason: "ORDER_CHANGED" | "TRADE_EXECUTED" = "TRADE_EXECUTED",
) {
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
}

function invalidatePersonalTradeQueries(
  queryClient: QueryClient,
  stockId: number,
) {
  invalidateStockMarketQueries(queryClient, stockId);
  void queryClient.invalidateQueries({
    queryKey: stockQueryKeys.orders(stockId),
  });
  void queryClient.invalidateQueries({
    queryKey: portfolioQueryKeys.myPortfolio,
  });
}

function applyStockMarketSync(
  queryClient: QueryClient,
  stockId: number,
  sync: StockMarketSync,
) {
  queryClient.setQueryData<StockOrderBookSnapshotData | null>(
    stockQueryKeys.orderBook(stockId),
    (previous) =>
      isSameOrderBookSnapshot(previous, sync.orderBookSnapshot)
        ? previous
        : sync.orderBookSnapshot,
  );

  Object.entries(sync.candles ?? {}).forEach(([interval, candles]) => {
    queryClient.setQueryData<ChartCandleData[]>(
      stockQueryKeys.candles(stockId, interval as StockCandleInterval),
      (previousCandles) => mergeLatestCandle(previousCandles, candles),
    );
  });

  if (sync.reason !== "TRADE_EXECUTED") {
    return;
  }

  void queryClient.invalidateQueries({
    queryKey: stockQueryKeys.lists(),
  });
}

function applyPersonalTradeSync(
  queryClient: QueryClient,
  stockId: number,
  sync: StockMutationSync,
) {
  applyStockMarketSync(queryClient, stockId, sync);
  queryClient.setQueryData(stockQueryKeys.orders(stockId), sync.orderContext);
  void queryClient.invalidateQueries({
    queryKey: portfolioQueryKeys.myPortfolio,
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function showOrderFilledToast(payload: UserOrderFilledPayload) {
  const sideLabel = payload.side === "BUY" ? "매수" : "매도";

  void showSuccessToast(`${payload.stockName} ${sideLabel} 체결`, {
    description: `${formatNumber(payload.quantity)}주 · ${formatNumber(
      payload.price,
    )} · 총 ${formatNumber(payload.totalAmount)}`,
  });
}

export function useUserRealtime(userOrderChannel: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userOrderChannel) {
      return;
    }

    let didCancel = false;
    let removeChannel: (() => void) | null = null;

    const cancelSubscriptionStart = scheduleRealtimeSubscription(async () => {
      const { getSupabaseBrowserClient } =
        await import("@/app/(frontend)/lib/supabase-client");

      if (didCancel) {
        return;
      }

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        return;
      }

      const channel = supabase
        .channel(userOrderChannel)
        .on("broadcast", { event: "order_filled" }, ({ payload }) => {
          if (!isUserOrderFilledPayload(payload)) {
            return;
          }

          if (hasMutationSyncPayload(payload.sync)) {
            applyPersonalTradeSync(queryClient, payload.stockId, payload.sync);
          } else {
            invalidatePersonalTradeQueries(queryClient, payload.stockId);
          }

          showOrderFilledToast(payload);
        })
        .subscribe();

      if (didCancel) {
        void supabase.removeChannel(channel);
        return;
      }

      removeChannel = () => {
        void supabase.removeChannel(channel);
      };
    });

    return () => {
      didCancel = true;
      cancelSubscriptionStart();
      removeChannel?.();
    };
  }, [queryClient, userOrderChannel]);
}

export function useStockRealtime(stockId: number | null | undefined) {
  const queryClient = useQueryClient();
  const [subscribedStockId, setSubscribedStockId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!Number.isInteger(stockId) || !stockId || stockId <= 0) {
      return;
    }

    let didCancel = false;
    let removeChannel: (() => void) | null = null;

    const cancelSubscriptionStart = scheduleRealtimeSubscription(async () => {
      const { getSupabaseBrowserClient } =
        await import("@/app/(frontend)/lib/supabase-client");

      if (didCancel) {
        return;
      }

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        return;
      }

      const channel = supabase
        .channel(`stock:${stockId}`)
        .on("broadcast", { event: "stock_updated" }, ({ payload }) => {
          const stockUpdatedPayload = isRecord(payload)
            ? (payload as StockUpdatedPayload)
            : null;
          const sync = stockUpdatedPayload?.sync ?? stockUpdatedPayload;
          const reason =
            stockUpdatedPayload?.reason === "ORDER_CHANGED"
              ? "ORDER_CHANGED"
              : "TRADE_EXECUTED";

          if (hasMarketSyncPayload(sync)) {
            applyStockMarketSync(queryClient, stockId, sync);
          } else {
            invalidateStockMarketQueries(queryClient, stockId, reason);
          }
        })
        .subscribe((status) => {
          if (didCancel) {
            return;
          }

          setSubscribedStockId(status === "SUBSCRIBED" ? stockId : null);
        });

      if (didCancel) {
        void supabase.removeChannel(channel);
        return;
      }

      removeChannel = () => {
        void supabase.removeChannel(channel);
      };
    });

    return () => {
      didCancel = true;
      cancelSubscriptionStart();
      removeChannel?.();
    };
  }, [queryClient, stockId]);

  return subscribedStockId !== null && subscribedStockId === stockId;
}

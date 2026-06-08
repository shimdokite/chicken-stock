"use client";

import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { portfolioQueryKeys } from "@/app/(frontend)/apis/portfolio/queries";
import type {
  StockCandleInterval,
  StockMarketSync,
  StockMutationSync,
} from "@/app/(frontend)/apis/stocks/api";
import { stockQueryKeys } from "@/app/(frontend)/apis/stocks/queries";
import { getSupabaseBrowserClient } from "@/app/(frontend)/lib/supabase-client";

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

  toast.success(`${payload.stockName} ${sideLabel} 체결`, {
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userOrderChannel]);
}

export function useStockRealtime(stockId: number | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!Number.isInteger(stockId) || !stockId || stockId <= 0) {
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, stockId]);
}

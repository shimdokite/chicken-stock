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
  type UpdateStockOrderRequest,
  updateStockOrder,
} from "./api";
import { stockQueryKeys } from "./queries";

type CreateStockOrderVariables = {
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
  const applyStockOrderMutationResult = useApplyStockOrderMutationResult();

  return useMutation({
    mutationFn: ({ payload, stockId }: CreateStockOrderVariables) =>
      createStockOrder(stockId, payload),
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

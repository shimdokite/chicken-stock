"use client";

import { useState } from "react";
import type {
  StockOrderContext,
  StockPendingOrder,
} from "../../../../apis/stocks/api";
import {
  useCancelStockOrder,
  useUpdateStockOrder,
} from "../../../../apis/stocks/mutations";
import type { StockDetailData } from "../../../../types/stock/stock-detail";
import { formatPrice } from "../../../../utils/stock/stock-detail";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../utils/toast";
import {
  formatQuantity,
  getApiErrorMessage,
  parsePriceInput,
  parseQuantityInput,
} from "./utils";

type PendingOrdersProps = {
  orderContext: StockOrderContext;
  stock: StockDetailData;
};

function formatOrderTime(value: string) {
  return new Date(value).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOrderTypeClassName(type: StockPendingOrder["type"]) {
  return type === "BUY" ? "text-red-500" : "text-sky-600";
}

function getOrderTypeLabel(type: StockPendingOrder["type"]) {
  return type === "BUY" ? "구매" : "판매";
}

export default function PendingOrders({
  orderContext,
  stock,
}: PendingOrdersProps) {
  const updateOrder = useUpdateStockOrder();
  const cancelOrder = useCancelStockOrder();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editPriceInput, setEditPriceInput] = useState("");
  const [editQuantityInput, setEditQuantityInput] = useState("");

  const startEdit = (order: StockPendingOrder) => {
    setEditingOrderId(order.orderId);
    setEditPriceInput(String(order.pricePerShare));
    setEditQuantityInput(String(order.remainingQuantity));
  };

  const cancelEdit = () => {
    setEditingOrderId(null);
    setEditPriceInput("");
    setEditQuantityInput("");
  };

  const handleUpdate = (order: StockPendingOrder) => {
    const quantity = parseQuantityInput(editQuantityInput);
    const pricePerShare = parsePriceInput(editPriceInput);

    if (quantity <= 0 || pricePerShare <= 0) {
      void showWarningToast("수량과 주문가를 입력해주세요.");
      return;
    }

    updateOrder.mutate(
      {
        orderId: order.orderId,
        payload: {
          pricePerShare,
          quantity,
        },
        stockId: stock.id,
      },
      {
        onError: (error) => {
          void showErrorToast(
            getApiErrorMessage(error, "주문 수정에 실패했습니다."),
          );
        },
        onSuccess: () => {
          cancelEdit();
          void showSuccessToast("대기 주문을 수정했습니다.");
        },
      },
    );
  };

  const handleCancel = (order: StockPendingOrder) => {
    cancelOrder.mutate(
      {
        orderId: order.orderId,
        stockId: stock.id,
      },
      {
        onError: (error) => {
          void showErrorToast(
            getApiErrorMessage(error, "주문 취소에 실패했습니다."),
          );
        },
        onSuccess: () => {
          if (editingOrderId === order.orderId) {
            cancelEdit();
          }

          void showSuccessToast("대기 주문을 취소했습니다.");
        },
      },
    );
  };

  if (orderContext.pendingOrders.length === 0) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center px-5 pb-5 text-center text-lg font-semibold text-zinc-500">
        대기 중인 주식이 없습니다.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      <ul className="mt-5 space-y-4">
        {orderContext.pendingOrders.map((order) => {
          const isEditing = editingOrderId === order.orderId;
          const orderAmount = order.pricePerShare * order.remainingQuantity;

          return (
            <li
              key={order.orderId}
              className="border-b border-zinc-200 pb-4 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">
                    <span className={getOrderTypeClassName(order.type)}>
                      {getOrderTypeLabel(order.type)}
                    </span>{" "}
                    {formatQuantity(order.remainingQuantity)}
                  </p>
                  <p className="mt-1 text-base text-zinc-500">
                    주당 {formatPrice(order.pricePerShare, stock.currencyCode)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {formatOrderTime(order.orderedAt)} 접수 · 총{" "}
                    {formatPrice(orderAmount, stock.currencyCode)}
                  </p>
                </div>

                {!isEditing && (
                  <div className="flex shrink-0 gap-2 text-base font-semibold">
                    <button
                      className="text-zinc-950 disabled:text-zinc-300"
                      disabled={updateOrder.isPending || cancelOrder.isPending}
                      type="button"
                      onClick={() => startEdit(order)}
                    >
                      수정
                    </button>
                    <button
                      className="text-zinc-950 disabled:text-zinc-300"
                      disabled={updateOrder.isPending || cancelOrder.isPending}
                      type="button"
                      onClick={() => handleCancel(order)}
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    aria-label="수정 수량"
                    className="h-8 min-w-0 rounded-lg border-2 border-zinc-200 px-2 text-right text-base outline-none"
                    inputMode="numeric"
                    value={editQuantityInput}
                    onChange={(event) =>
                      setEditQuantityInput(event.target.value)
                    }
                  />
                  <input
                    aria-label="수정 주문가"
                    className="h-8 min-w-0 rounded-lg border-2 border-zinc-200 px-2 text-right text-base outline-none"
                    inputMode="decimal"
                    value={editPriceInput}
                    onChange={(event) => setEditPriceInput(event.target.value)}
                  />
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <button
                      className="text-zinc-950 disabled:text-zinc-300"
                      disabled={updateOrder.isPending}
                      type="button"
                      onClick={() => handleUpdate(order)}
                    >
                      저장
                    </button>
                    <button
                      className="text-zinc-500 disabled:text-zinc-300"
                      disabled={updateOrder.isPending}
                      type="button"
                      onClick={cancelEdit}
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

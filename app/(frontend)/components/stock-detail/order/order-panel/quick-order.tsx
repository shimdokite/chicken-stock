"use client";

import { useState } from "react";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import type {
  CreateStockOrderRequest,
  StockOrderContext,
  StockOrderPriceType,
  StockTradeOrderType,
} from "../../../../apis/stocks/api";
import {
  useCancelAllStockOrders,
  useCreateStockOrder,
} from "../../../../apis/stocks/mutations";
import type {
  StockDetailData,
  StockOrderBookSnapshotData,
} from "../../../../types/stock/stock-detail";
import { formatPrice } from "../../../../utils/stock/stock-detail";
import {
  formatQuantity,
  getApiErrorMessage,
  getMaxBuyQuantity,
  getMaxMarketBuyQuantity,
  getMarketOrderAmountEstimate,
  parseQuantityInput,
  toInputValue,
} from "./utils";

type QuickOrderProps = {
  orderBookSnapshot?: StockOrderBookSnapshotData | null;
  orderContext: StockOrderContext;
  stock: StockDetailData;
};

const quantitySteps = [1, 10, 100];

export default function QuickOrder({
  orderBookSnapshot,
  orderContext,
  stock,
}: QuickOrderProps) {
  const createOrder = useCreateStockOrder();
  const cancelAllOrders = useCancelAllStockOrders(stock.id);
  const [quantityInput, setQuantityInput] = useState("");

  const quantity = parseQuantityInput(quantityInput);
  const maxLimitBuyQuantity = getMaxBuyQuantity(
    orderContext.buyingPower,
    stock.currentPrice,
  );
  const maxMarketBuyQuantity = getMaxMarketBuyQuantity({
    buyingPower: orderContext.buyingPower,
    currentPrice: stock.currentPrice,
    levels: orderBookSnapshot?.levels,
  });
  const maxSellQuantity = orderContext.holding.sellableQuantity;
  const maxQuickQuantity = Math.max(
    maxLimitBuyQuantity,
    maxMarketBuyQuantity,
    maxSellQuantity,
  );
  const limitBuyAmount = stock.currentPrice * quantity;
  const marketBuyAmount = getMarketOrderAmountEstimate({
    currentPrice: stock.currentPrice,
    levels: orderBookSnapshot?.levels,
    quantity,
    type: "BUY",
  });
  const sellAmount = stock.currentPrice * quantity;

  const setClampedQuantity = (nextQuantity: number) => {
    if (nextQuantity <= 0 || maxQuickQuantity <= 0) {
      setQuantityInput("");
      return;
    }

    setQuantityInput(toInputValue(Math.min(nextQuantity, maxQuickQuantity)));
  };

  const submitOrder = (
    type: StockTradeOrderType,
    orderPriceType: StockOrderPriceType,
  ) => {
    const maxQuantity =
      type === "BUY"
        ? orderPriceType === "MARKET"
          ? maxMarketBuyQuantity
          : maxLimitBuyQuantity
        : maxSellQuantity;

    if (quantity <= 0 || quantity > maxQuantity) {
      toast.warning(
        type === "BUY"
          ? "구매 가능 금액 안에서 수량을 입력해주세요."
          : "판매 가능 수량 안에서 수량을 입력해주세요.",
      );
      return;
    }

    const payload: CreateStockOrderRequest = {
      orderPriceType,
      pricePerShare:
        orderPriceType === "LIMIT" ? stock.currentPrice : undefined,
      quantity,
      type,
    };

    createOrder.mutate(
      {
        payload,
        stockId: stock.id,
      },
      {
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "주문 처리에 실패했습니다."));
        },
        onSuccess: () => {
          setQuantityInput("");
          toast.success(
            orderPriceType === "MARKET"
              ? "주문이 체결됐습니다."
              : "대기 주문이 등록됐습니다.",
          );
        },
      },
    );
  };

  const handleCancelAll = () => {
    cancelAllOrders.mutate(undefined, {
      onError: (error) => {
        toast.error(getApiErrorMessage(error, "주문 취소에 실패했습니다."));
      },
      onSuccess: (data) => {
        toast.success(`${data.canceledCount}건의 대기 주문을 취소했습니다.`);
      },
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <input
              className="h-10 min-w-0 flex-1 rounded-xl border-2 border-zinc-200 px-3 text-lg font-semibold outline-none focus:border-sky-300"
              inputMode="numeric"
              placeholder="주수입력"
              value={quantityInput}
              onChange={(event) => {
                const nextQuantity = parseQuantityInput(event.target.value);

                if (!event.target.value) {
                  setQuantityInput("");
                  return;
                }

                setClampedQuantity(nextQuantity);
              }}
            />
            <div className="flex h-10 overflow-hidden rounded-xl bg-zinc-200 text-zinc-400">
              <button
                aria-label="수량 줄이기"
                className="grid w-10 place-items-center border-r border-zinc-300"
                type="button"
                onClick={() => setClampedQuantity(quantity - 1)}
              >
                <IconMinus size={20} stroke={2.5} />
              </button>
              <button
                aria-label="수량 늘리기"
                className="grid w-10 place-items-center"
                type="button"
                onClick={() => setClampedQuantity(quantity + 1)}
              >
                <IconPlus size={20} stroke={2.5} />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {quantitySteps.map((step) => (
              <button
                key={step}
                className="h-9 rounded-lg bg-zinc-200 text-lg font-semibold text-zinc-600 disabled:opacity-40"
                disabled={maxQuickQuantity <= 0}
                type="button"
                onClick={() => setClampedQuantity(quantity + step)}
              >
                {step}주
              </button>
            ))}
            <button
              className="h-9 rounded-lg bg-zinc-200 text-lg font-semibold text-zinc-600 disabled:opacity-40"
              disabled={maxQuickQuantity <= 0}
              type="button"
              onClick={() => setClampedQuantity(maxQuickQuantity)}
            >
              최대
            </button>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-2 text-base">
          <dt>판매가능</dt>
          <dd>{formatQuantity(maxSellQuantity)}</dd>
          <dt>판매예상</dt>
          <dd>{formatPrice(sellAmount, stock.currencyCode)}</dd>
          <dt>구매가능</dt>
          <dd>{formatPrice(orderContext.buyingPower, stock.currencyCode)}</dd>
          <dt>현재가 구매</dt>
          <dd>{formatPrice(limitBuyAmount, stock.currencyCode)}</dd>
          <dt>시장가 구매</dt>
          <dd>{formatPrice(marketBuyAmount, stock.currencyCode)}</dd>
        </dl>

        <dl className="mt-6 grid grid-cols-[1fr_auto] gap-y-2 text-lg">
          <dt>내 주식 평균</dt>
          <dd>
            {formatPrice(orderContext.holding.averagePrice, stock.currencyCode)}
          </dd>
          <dt>현재 수익</dt>
          <dd>
            {formatPrice(
              orderContext.holding.currentProfit,
              stock.currencyCode,
            )}
          </dd>
        </dl>
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-2 gap-3 text-lg font-semibold">
        <button
          className="h-12 rounded-xl bg-sky-300 text-sky-700 disabled:opacity-40"
          disabled={createOrder.isPending || quantity <= 0}
          type="button"
          onClick={() => submitOrder("SELL", "LIMIT")}
        >
          현재가 판매
        </button>
        <button
          className="h-12 rounded-xl bg-red-300 text-red-600 disabled:opacity-40"
          disabled={
            createOrder.isPending ||
            quantity <= 0 ||
            quantity > maxLimitBuyQuantity
          }
          type="button"
          onClick={() => submitOrder("BUY", "LIMIT")}
        >
          현재가 구매
        </button>
        <button
          className="h-12 rounded-xl bg-sky-300 text-sky-700 disabled:opacity-40"
          disabled={createOrder.isPending || quantity <= 0}
          type="button"
          onClick={() => submitOrder("SELL", "MARKET")}
        >
          시장가 판매
        </button>
        <button
          className="h-12 rounded-xl bg-red-300 text-red-600 disabled:opacity-40"
          disabled={
            createOrder.isPending ||
            quantity <= 0 ||
            quantity > maxMarketBuyQuantity
          }
          type="button"
          onClick={() => submitOrder("BUY", "MARKET")}
        >
          시장가 구매
        </button>
      </div>

      <button
        className="mt-3 h-10 shrink-0 rounded-xl bg-zinc-200 text-lg font-semibold text-zinc-600 disabled:text-zinc-400"
        disabled={
          orderContext.pendingOrderCount === 0 || cancelAllOrders.isPending
        }
        type="button"
        onClick={handleCancelAll}
      >
        주문 {orderContext.pendingOrderCount}건 전체 취소
      </button>
    </div>
  );
}

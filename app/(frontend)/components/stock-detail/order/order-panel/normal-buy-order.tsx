"use client";

import { useState } from "react";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import type {
  CreateStockOrderRequest,
  StockOrderContext,
  StockOrderPriceType,
} from "../../../../apis/stocks/api";
import { useCreateStockOrder } from "../../../../apis/stocks/mutations";
import type {
  StockDetailData,
  StockOrderBookSnapshotData,
} from "../../../../types/stock/stock-detail";
import {
  formatPercent,
  formatPrice,
} from "../../../../utils/stock/stock-detail";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../utils/toast";
import { SegmentedControl } from "../../../ui";
import type { SelectedOrderBookLimitPrice } from "./index";
import {
  getApiErrorMessage,
  getMaxBuyQuantity,
  getMaxMarketBuyQuantity,
  getMarketOrderAmountEstimate,
  getProfitTextClassName,
  getQuantityByPercent,
  parsePriceInput,
  parseQuantityInput,
  toInputValue,
} from "./utils";

type NormalBuyOrderProps = {
  orderBookSnapshot?: StockOrderBookSnapshotData | null;
  orderContext: StockOrderContext;
  selectedLimitPrice: SelectedOrderBookLimitPrice | null;
  stock: StockDetailData;
};

const percentButtons = [10, 25, 50, 100];

function getInitialPriceInput(
  stock: StockDetailData,
  selectedLimitPrice: SelectedOrderBookLimitPrice | null,
) {
  const price = selectedLimitPrice?.price ?? stock.currentPrice;

  return stock.currencyCode === "KRW"
    ? String(Math.round(price))
    : price.toFixed(2);
}

export default function NormalBuyOrder({
  orderBookSnapshot,
  orderContext,
  selectedLimitPrice,
  stock,
}: NormalBuyOrderProps) {
  const createOrder = useCreateStockOrder();
  const [orderPriceType, setOrderPriceType] =
    useState<StockOrderPriceType>("LIMIT");
  const [priceInput, setPriceInput] = useState(
    getInitialPriceInput(stock, selectedLimitPrice),
  );
  const [quantityInput, setQuantityInput] = useState("");

  const isMarketOpen = orderContext.marketSession?.isOpen === true;
  const orderTypeLabel = isMarketOpen ? "정규장 주문" : "정규장 주문 예약";
  const price =
    orderPriceType === "MARKET"
      ? stock.currentPrice
      : parsePriceInput(priceInput);
  const quantity = parseQuantityInput(quantityInput);
  const maxLimitQuantity = getMaxBuyQuantity(orderContext.buyingPower, price);
  const maxMarketQuantity = getMaxMarketBuyQuantity({
    buyingPower: orderContext.buyingPower,
    currentPrice: stock.currentPrice,
    levels: orderBookSnapshot?.levels,
  });
  const maxQuantity =
    orderPriceType === "MARKET"
      ? isMarketOpen
        ? maxMarketQuantity
        : maxLimitQuantity
      : maxLimitQuantity;
  const orderAmount =
    orderPriceType === "MARKET"
      ? isMarketOpen
        ? getMarketOrderAmountEstimate({
            currentPrice: stock.currentPrice,
            levels: orderBookSnapshot?.levels,
            quantity,
            type: "BUY",
          })
        : stock.currentPrice * quantity
      : price * quantity;
  const currentInvested =
    orderContext.holding.averagePrice * orderContext.holding.quantity;
  const nextQuantity = orderContext.holding.quantity + quantity;
  const nextAveragePrice =
    quantity > 0 && nextQuantity > 0
      ? (currentInvested + orderAmount) / nextQuantity
      : null;
  const canSubmit =
    quantity > 0 &&
    price > 0 &&
    quantity <= maxQuantity &&
    orderAmount <= orderContext.buyingPower &&
    !createOrder.isPending;
  const currentProfitTextClassName = getProfitTextClassName(
    orderContext.holding.currentProfit,
  );

  const setClampedQuantity = (nextQuantity: number) => {
    if (nextQuantity <= 0 || maxQuantity <= 0) {
      setQuantityInput("");
      return;
    }

    setQuantityInput(toInputValue(Math.min(nextQuantity, maxQuantity)));
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      void showWarningToast("구매 가능 금액 안에서 수량을 입력해주세요.");
      return;
    }

    const payload: CreateStockOrderRequest = {
      orderPriceType,
      pricePerShare: orderPriceType === "LIMIT" ? price : undefined,
      quantity,
      type: "BUY",
    };

    createOrder.mutate(
      {
        idempotencyKey: crypto.randomUUID(),
        payload,
        stockId: stock.id,
      },
      {
        onError: (error) => {
          void showErrorToast(
            getApiErrorMessage(error, "구매 주문에 실패했습니다."),
          );
        },
        onSuccess: () => {
          setQuantityInput("");
          void showSuccessToast(
            !isMarketOpen
              ? "구매 주문이 예약됐습니다."
              : orderPriceType === "MARKET"
                ? "구매 주문이 체결됐습니다."
                : "구매 주문이 등록됐습니다.",
          );
        },
      },
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mt-5 grid gap-3">
          <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-3 text-lg">
            <span className="font-semibold">주문 유형</span>
            <div className="flex h-8 items-center rounded-lg border-2 border-zinc-200 px-3 text-base font-semibold">
              {orderTypeLabel}
            </div>
          </div>

          <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-3 text-lg">
            <span className="font-semibold">구매 가격</span>
            <SegmentedControl
              aria-label="구매 가격 유형"
              className="h-8 w-full text-base"
              value={orderPriceType.toLowerCase()}
              onValueChange={(value) =>
                setOrderPriceType(value.toUpperCase() as StockOrderPriceType)
              }
            >
              <SegmentedControl.Item className="h-6 flex-1" value="limit">
                지정가
              </SegmentedControl.Item>
              <SegmentedControl.Item className="h-6 flex-1" value="market">
                시장가
              </SegmentedControl.Item>
            </SegmentedControl>
          </div>

          <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-3">
            <span />
            <div className="flex items-center gap-2">
              <input
                className="h-8 min-w-0 flex-1 rounded-lg border-2 border-zinc-200 px-2 text-right text-base font-semibold outline-none"
                disabled={orderPriceType === "MARKET"}
                inputMode="decimal"
                value={
                  orderPriceType === "MARKET"
                    ? getInitialPriceInput(stock, null)
                    : priceInput
                }
                onChange={(event) => setPriceInput(event.target.value)}
              />
              <div className="flex h-8 overflow-hidden rounded-lg bg-zinc-200 text-zinc-400">
                <button
                  aria-label="가격 낮추기"
                  className="grid w-8 place-items-center border-r border-zinc-300 disabled:opacity-40"
                  disabled={orderPriceType === "MARKET"}
                  type="button"
                  onClick={() =>
                    setPriceInput(toInputValue(Math.max(price - 1, 0)))
                  }
                >
                  <IconMinus size={18} stroke={2.5} />
                </button>
                <button
                  aria-label="가격 높이기"
                  className="grid w-8 place-items-center disabled:opacity-40"
                  disabled={orderPriceType === "MARKET"}
                  type="button"
                  onClick={() => setPriceInput(toInputValue(price + 1))}
                >
                  <IconPlus size={18} stroke={2.5} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-3 text-lg">
            <span className="font-semibold">수량</span>
            <div className="flex items-center gap-2">
              <input
                className="h-8 min-w-0 flex-1 rounded-lg border-2 border-zinc-200 px-2 text-right text-base font-semibold outline-none"
                inputMode="numeric"
                placeholder={
                  maxQuantity > 0 ? `최대 ${maxQuantity}주 가능` : ""
                }
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
              <div className="flex h-8 overflow-hidden rounded-lg bg-zinc-200 text-zinc-400">
                <button
                  aria-label="수량 줄이기"
                  className="grid w-8 place-items-center border-r border-zinc-300"
                  type="button"
                  onClick={() => setClampedQuantity(quantity - 1)}
                >
                  <IconMinus size={18} stroke={2.5} />
                </button>
                <button
                  aria-label="수량 늘리기"
                  className="grid w-8 place-items-center"
                  type="button"
                  onClick={() => setClampedQuantity(quantity + 1)}
                >
                  <IconPlus size={18} stroke={2.5} />
                </button>
              </div>
            </div>
          </div>

          <div className="ml-[6.5rem] grid grid-cols-4 gap-2">
            {percentButtons.map((percent) => (
              <button
                key={percent}
                className="h-7 rounded-lg bg-zinc-200 text-sm font-semibold text-zinc-600 disabled:opacity-40"
                disabled={maxQuantity <= 0}
                type="button"
                onClick={() =>
                  setClampedQuantity(getQuantityByPercent(maxQuantity, percent))
                }
              >
                {percent === 100 ? "최대" : `${percent}%`}
              </button>
            ))}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-2 text-base">
          <dt>내 주식 평균</dt>
          <dd className="text-right">
            {formatPrice(orderContext.holding.averagePrice, stock.currencyCode)}
          </dd>
          <dt>구매 후 예상</dt>
          <dd className="text-right">
            {nextAveragePrice === null
              ? "-"
              : formatPrice(nextAveragePrice, stock.currencyCode)}
          </dd>
          <dt>현재 수익</dt>
          <dd className={`text-right ${currentProfitTextClassName}`}>
            {formatPrice(
              orderContext.holding.currentProfit,
              stock.currencyCode,
            )}
            <br />({formatPercent(orderContext.holding.currentProfitRate)})
          </dd>
        </dl>

        <div className="my-3 border-t border-zinc-200" />

        <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-base">
          <dt>구매가능 금액</dt>
          <dd className="text-right">
            {formatPrice(orderContext.buyingPower, stock.currencyCode)}
          </dd>
          <dt>총 주문 금액</dt>
          <dd className="text-right">
            {formatPrice(orderAmount, stock.currencyCode)}
          </dd>
        </dl>
      </div>

      <button
        className="mt-3 h-11 shrink-0 rounded-lg bg-red-500 text-xl font-semibold text-white disabled:bg-red-200"
        disabled={!canSubmit}
        type="button"
        onClick={handleSubmit}
      >
        {createOrder.isPending
          ? "처리 중"
          : isMarketOpen
            ? "구매하기"
            : "예약 구매하기"}
      </button>
    </div>
  );
}

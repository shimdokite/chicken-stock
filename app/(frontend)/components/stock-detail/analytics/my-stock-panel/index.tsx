"use client";

import { memo, useMemo } from "react";
import { useStockOrdersQuery } from "../../../../apis/stocks/queries";
import type {
  StockCurrencyCode,
  StockOnlyProps,
} from "../../../../types/stock/stock-detail";
import {
  convertCurrencyValue,
  formatChange,
  formatNumber,
  formatPrice,
} from "../../../../utils/stock/stock-detail";
import { getApiErrorMessage } from "../../order/order-panel/utils";

type DisplayHolding = {
  averagePrice: number;
  currentAmount: number;
  fee: number;
  profit: number;
  profitRate: number;
  quantity: number;
  saleTax: number;
};

function getProfitTextClassName(value: number) {
  if (value > 0) {
    return "text-red-500";
  }

  if (value < 0) {
    return "text-sky-600";
  }

  return "text-zinc-600";
}

function formatQuantity(value: number) {
  return `${formatNumber(value, 6)}주`;
}

function formatProfitRate(value: number) {
  const sign = value < 0 ? "-" : "";

  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function convertHoldingMoney(
  value: number,
  sourceCurrencyCode: StockCurrencyCode,
  targetCurrencyCode: StockCurrencyCode,
) {
  return convertCurrencyValue(value, sourceCurrencyCode, targetCurrencyCode);
}

function MyStockPanel({ stock }: StockOnlyProps) {
  const {
    data: orderContext,
    error,
    isFetched,
    isPending,
  } = useStockOrdersQuery(stock.id);

  const holding = useMemo<DisplayHolding | null>(() => {
    if (!orderContext) {
      return null;
    }

    const sourceCurrencyCode = orderContext.stock.currencyCode;
    const targetCurrencyCode = stock.currencyCode;
    const quantity = orderContext.holding.quantity;
    const currentAmount = stock.currentPrice * quantity;
    const totalInvested = convertHoldingMoney(
      orderContext.holding.totalInvested,
      sourceCurrencyCode,
      targetCurrencyCode,
    );
    const profit = currentAmount - totalInvested;

    return {
      averagePrice: convertHoldingMoney(
        orderContext.holding.averagePrice,
        sourceCurrencyCode,
        targetCurrencyCode,
      ),
      currentAmount,
      fee: convertHoldingMoney(
        orderContext.holding.fee,
        sourceCurrencyCode,
        targetCurrencyCode,
      ),
      profit,
      profitRate: totalInvested > 0 ? (profit / totalInvested) * 100 : 0,
      quantity,
      saleTax: convertHoldingMoney(
        orderContext.holding.saleTax,
        sourceCurrencyCode,
        targetCurrencyCode,
      ),
    };
  }, [orderContext, stock.currencyCode, stock.currentPrice]);

  const panelContent = (() => {
    if (!holding && isPending && !isFetched) {
      return (
        <div className="grid flex-1 place-items-center text-sm text-zinc-500">
          내 주식 정보를 불러오는 중입니다.
        </div>
      );
    }

    if (!holding) {
      return (
        <div className="grid flex-1 place-items-center px-4 text-center text-sm text-zinc-500">
          {getApiErrorMessage(error, "내 주식 정보를 불러오지 못했습니다.")}
        </div>
      );
    }

    const profitClassName = getProfitTextClassName(holding.profit);
    const rows = [
      {
        label: "총 수익",
        value: `${formatChange(holding.profit, stock.currencyCode)}(${formatProfitRate(
          holding.profitRate,
        )})`,
        valueClassName: profitClassName,
      },
      {
        label: "총 금액",
        value: formatPrice(holding.currentAmount, stock.currencyCode),
      },
      {
        label: "수량",
        value: formatQuantity(holding.quantity),
      },
      {
        label: "1주 평균 금액",
        value: formatPrice(holding.averagePrice, stock.currencyCode),
      },
      {
        label: "수수료",
        value:
          holding.fee > 0
            ? formatPrice(holding.fee, stock.currencyCode)
            : "-",
      },
      {
        label: "팔 때 낼 세금",
        value:
          holding.saleTax > 0
            ? formatPrice(holding.saleTax, stock.currencyCode)
            : "-",
      },
    ];

    return (
      <dl className="mt-3 grid gap-2 px-4 text-base text-zinc-700">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3"
          >
            <dt className="whitespace-nowrap">{row.label}</dt>
            <dd
              className={`min-w-0 text-right font-medium text-zinc-600 ${
                row.valueClassName ?? ""
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  })();

  return (
    <section
      aria-label={`${stock.name} 내 주식`}
      className="cs-data-panel flex h-130 flex-col overflow-hidden pt-4 text-sm leading-tight text-(--cs-text-strong) tabular-nums"
    >
      <p className="px-4 text-lg font-medium">내 주식</p>
      {panelContent}
    </section>
  );
}

export default memo(MyStockPanel);

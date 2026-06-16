"use client";

import { memo, useMemo, useState, type ReactNode } from "react";
import { useGetPortfolio } from "../../../../apis/portfolio/queries";
import type {
  PortfolioTransaction,
  PortfolioTransactionType,
} from "../../../../apis/portfolio/api";
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
import { useStockOrdersQuery } from "../../../../apis/stocks/queries";
import type { StockPendingOrder } from "../../../../apis/stocks/api";
import { SegmentedControl } from "../../../ui";
import { getApiErrorMessage } from "../../order/order-panel/utils";

type OrderHistoryTab = "completed" | "pending";
type OrderTone = "buy" | "sell";
type OrderHistoryPanelProps = StockOnlyProps & {
  sourceCurrencyCode: StockCurrencyCode;
};

const orderTabs: { label: string; value: OrderHistoryTab }[] = [
  { label: "완료", value: "completed" },
  { label: "대기", value: "pending" },
];

const completedTransactionTypes = new Set<PortfolioTransactionType>([
  "BUY",
  "SELL",
]);

function getOrderTone(
  type: PortfolioTransactionType | StockPendingOrder["type"],
) {
  return type === "SELL" ? "sell" : "buy";
}

function getOrderTypeLabel(
  type: PortfolioTransactionType | StockPendingOrder["type"],
) {
  return type === "SELL" ? "판매" : "구매";
}

function getOrderTypeClassName(tone: OrderTone) {
  return tone === "buy" ? "text-red-500" : "text-sky-600";
}

function getProfitClassName(value: number) {
  if (value > 0) {
    return "text-red-500";
  }

  if (value < 0) {
    return "text-sky-600";
  }

  return "text-zinc-500";
}

function formatQuantity(value: number) {
  return `${formatNumber(value, 6)}주`;
}

function formatDate(value: string) {
  const [date] = value.split("T");
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${year}.${month}.${day}`;
}

function formatPendingOrderDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function convertMoney(
  value: number,
  sourceCurrencyCode: StockCurrencyCode,
  targetCurrencyCode: StockCurrencyCode,
) {
  return convertCurrencyValue(value, sourceCurrencyCode, targetCurrencyCode);
}

function OrderHistoryPanel({
  sourceCurrencyCode,
  stock,
}: OrderHistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<OrderHistoryTab>("completed");
  const {
    data: orderContext,
    error: orderError,
    isFetched: isOrderFetched,
    isPending: isOrderPending,
  } = useStockOrdersQuery(stock.id);
  const {
    data: portfolio,
    error: portfolioError,
    isFetched: isPortfolioFetched,
    isPending: isPortfolioPending,
  } = useGetPortfolio();
  const completedOrderSourceCurrencyCode =
    orderContext?.stock.currencyCode ?? sourceCurrencyCode;

  const completedTransactions = useMemo(
    () =>
      (portfolio?.transactions ?? []).filter(
        (transaction) =>
          transaction.stockId === stock.id &&
          completedTransactionTypes.has(transaction.transactionType),
      ),
    [portfolio?.transactions, stock.id],
  );

  const pendingOrders = useMemo(
    () =>
      (orderContext?.pendingOrders ?? []).filter(
        (order) => order.stockId === stock.id,
      ),
    [orderContext?.pendingOrders, stock.id],
  );

  const renderCompletedContent = () => {
    if (!portfolio && isPortfolioPending && !isPortfolioFetched) {
      return <OrderHistoryState message="완료 주문을 불러오는 중입니다." />;
    }

    if (!portfolio && portfolioError) {
      return (
        <OrderHistoryState
          message={getApiErrorMessage(
            portfolioError,
            "완료 주문을 불러오지 못했습니다.",
          )}
        />
      );
    }

    if (completedTransactions.length === 0) {
      return <OrderHistoryState message="완료된 주문이 없습니다." />;
    }

    return (
      <OrderHistoryList>
        {completedTransactions.map((transaction) => (
          <CompletedOrderItem
            key={transaction.id}
            sourceCurrencyCode={completedOrderSourceCurrencyCode}
            targetCurrencyCode={stock.currencyCode}
            transaction={transaction}
          />
        ))}
      </OrderHistoryList>
    );
  };

  const renderPendingContent = () => {
    if (!orderContext && isOrderPending && !isOrderFetched) {
      return <OrderHistoryState message="대기 주문을 불러오는 중입니다." />;
    }

    if (!orderContext) {
      return (
        <OrderHistoryState
          message={getApiErrorMessage(
            orderError,
            "대기 주문을 불러오지 못했습니다.",
          )}
        />
      );
    }

    if (pendingOrders.length === 0) {
      return <OrderHistoryState message="대기 중인 주문이 없습니다." />;
    }

    return (
      <OrderHistoryList>
        {pendingOrders.map((order) => (
          <PendingOrderItem
            key={order.orderId}
            order={order}
            targetCurrencyCode={stock.currencyCode}
          />
        ))}
      </OrderHistoryList>
    );
  };

  return (
    <section
      aria-label={`${stock.name} 주문내역`}
      className="flex h-130 flex-col overflow-hidden rounded-3xl bg-white text-sm leading-tight text-zinc-950 tabular-nums shadow-[0_10px_18px_rgba(0,0,0,0.22)]"
    >
      <div className="shrink-0 px-4 pt-4">
        <p className="text-lg font-medium">주문내역</p>

        <SegmentedControl
          aria-label="주문내역 유형"
          className="mt-4 h-10 w-full rounded-lg p-1 text-base"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as OrderHistoryTab)}
        >
          {orderTabs.map((tab) => (
            <SegmentedControl.Item
              key={tab.value}
              className="h-full flex-1 rounded-lg"
              value={tab.value}
            >
              {tab.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl>
      </div>

      {activeTab === "completed"
        ? renderCompletedContent()
        : renderPendingContent()}
    </section>
  );
}

function OrderHistoryState({ message }: { message: string }) {
  return (
    <div className="grid min-h-0 flex-1 place-items-center px-5 pb-5 text-center text-base font-medium text-zinc-500">
      {message}
    </div>
  );
}

function OrderHistoryList({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      <ul className="mt-4 divide-y divide-zinc-200">{children}</ul>
    </div>
  );
}

function CompletedOrderItem({
  sourceCurrencyCode,
  targetCurrencyCode,
  transaction,
}: {
  sourceCurrencyCode: StockCurrencyCode;
  targetCurrencyCode: StockCurrencyCode;
  transaction: PortfolioTransaction;
}) {
  const tone = getOrderTone(transaction.transactionType);
  const totalAmount = convertMoney(
    Number(transaction.totalAmount),
    sourceCurrencyCode,
    targetCurrencyCode,
  );
  const averagePrice =
    transaction.totalQuantity > 0 ? totalAmount / transaction.totalQuantity : 0;
  const realizedProfit =
    transaction.realizedProfit === null
      ? null
      : convertMoney(
          Number(transaction.realizedProfit),
          sourceCurrencyCode,
          targetCurrencyCode,
        );

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold">
            <span className={getOrderTypeClassName(tone)}>
              {getOrderTypeLabel(transaction.transactionType)}
            </span>{" "}
            {formatQuantity(transaction.totalQuantity)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {formatDate(transaction.executedAt)} 완료
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            주당 {formatPrice(averagePrice, targetCurrencyCode)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-semibold">
            {formatPrice(totalAmount, targetCurrencyCode)}
          </p>
          {realizedProfit !== null && (
            <p className={`mt-1 text-sm ${getProfitClassName(realizedProfit)}`}>
              {formatChange(realizedProfit, targetCurrencyCode)}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function PendingOrderItem({
  order,
  targetCurrencyCode,
}: {
  order: StockPendingOrder;
  targetCurrencyCode: StockCurrencyCode;
}) {
  const tone = getOrderTone(order.type);
  const pricePerShare = convertMoney(
    order.pricePerShare,
    order.currencyCode,
    targetCurrencyCode,
  );
  const remainingAmount = pricePerShare * order.remainingQuantity;

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold">
            <span className={getOrderTypeClassName(tone)}>
              {getOrderTypeLabel(order.type)}
            </span>{" "}
            {formatQuantity(order.remainingQuantity)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {formatPendingOrderDate(order.orderedAt)} 접수
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            주당 {formatPrice(pricePerShare, targetCurrencyCode)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-semibold">
            {formatPrice(remainingAmount, targetCurrencyCode)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            미체결 {formatQuantity(order.remainingQuantity)}
          </p>
        </div>
      </div>
    </li>
  );
}

export default memo(OrderHistoryPanel);

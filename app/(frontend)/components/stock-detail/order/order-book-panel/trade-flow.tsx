import type {
  StockCurrencyCode,
  StockOrderBookSnapshotData,
} from "../../../../types/stock/stock-detail";
import {
  formatNumber,
  formatPlainPrice,
} from "../../../../utils/stock/stock-detail";
import { getOrderSideTextClassName } from "./utils";

type TradeFlowProps = {
  currencyCode: StockCurrencyCode;
  snapshot: StockOrderBookSnapshotData;
};

export default function TradeFlow({ currencyCode, snapshot }: TradeFlowProps) {
  const recentOrders = snapshot.recentOrders ?? [];

  return (
    <section className="h-full min-h-0 overflow-hidden border-t-2 border-r-2 border-zinc-950 px-3 py-3">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">체결강도</h2>
        <p className="mt-1 text-xs font-medium text-sky-600">
          {snapshot.executionStrength.toFixed(2)}%
        </p>
      </div>

      {recentOrders.length === 0 ? (
        <p className="pt-6 text-center text-xs font-medium text-zinc-400">
          최근 주문 없음
        </p>
      ) : (
        <ol className="space-y-2 text-xs">
          {recentOrders.map((order) => {
            const sideClassName = getOrderSideTextClassName(order.side);

            return (
              <li
                key={order.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2"
              >
                <span className="truncate text-xs font-medium text-zinc-950">
                  {formatPlainPrice(order.price, currencyCode)}
                </span>

                <span
                  className={`text-right text-xs font-medium whitespace-nowrap ${sideClassName}`}
                >
                  {formatNumber(order.quantity)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

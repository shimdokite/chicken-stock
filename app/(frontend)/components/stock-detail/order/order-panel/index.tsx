"use client";

import { useGetMyInfo } from "../../../../apis/auth/queries";
import {
  useStockOrderBookQuery,
  useStockOrdersQuery,
} from "../../../../apis/stocks/queries";
import type { StockOnlyProps } from "../../../../types/stock/stock-detail";
import { SegmentedControl, Tab } from "../../../ui";
import NormalBuyOrder from "./normal-buy-order";
import NormalSellOrder from "./normal-sell-order";
import PendingOrders from "./pending-orders";
import QuickOrder from "./quick-order";
import { getApiErrorMessage } from "./utils";
import OrderPanelState from "./order-panel-state";
import { useIsHydrated } from "../../../../hooks/use-is-hydrated";

export type MainOrderTab = "normal" | "quick";
export type NormalOrderTab = "buy" | "sell" | "pending";

export type SelectedOrderBookLimitPrice = {
  price: number;
  sequence: number;
};

type OrderPanelProps = StockOnlyProps & {
  mainTab: MainOrderTab;
  normalTab: NormalOrderTab;
  selectedLimitPrice: SelectedOrderBookLimitPrice | null;
  onMainTabChange: (tab: MainOrderTab) => void;
  onNormalTabChange: (tab: NormalOrderTab) => void;
};

export default function OrderPanel({
  mainTab,
  normalTab,
  onMainTabChange,
  onNormalTabChange,
  selectedLimitPrice,
  stock,
}: OrderPanelProps) {
  const isHydrated = useIsHydrated();
  const {
    data: myInfo,
    error: myInfoError,
    isPending: isMyInfoPending,
  } = useGetMyInfo();
  const isLoggedIn = myInfo?.isLoggedIn === true;
  const {
    data: orderContext,
    error,
    isFetched,
    isPending,
  } = useStockOrdersQuery(stock.id, { enabled: isLoggedIn });
  const { data: orderBookSnapshot } = useStockOrderBookQuery(
    stock.id,
    stock.orderBookSnapshot,
    { refetchInterval: false },
  );

  const renderPanelContent = () => {
    if (!isHydrated || isMyInfoPending) {
      return <OrderPanelState message="주문 정보를 불러오는 중입니다." />;
    }

    if (!myInfo) {
      return (
        <OrderPanelState
          message={getApiErrorMessage(
            myInfoError,
            "로그인 정보를 확인하지 못했습니다.",
          )}
        />
      );
    }

    if (!myInfo.isLoggedIn) {
      return <OrderPanelState message="로그인 후 주문할 수 있습니다." />;
    }

    if (!orderContext && isPending && !isFetched) {
      return <OrderPanelState message="주문 정보를 불러오는 중입니다." />;
    }

    if (!orderContext) {
      return (
        <OrderPanelState
          message={getApiErrorMessage(
            error,
            "주문 정보를 불러오지 못했습니다.",
          )}
        />
      );
    }

    if (mainTab === "quick") {
      return (
        <QuickOrder
          key={`${stock.id}-quick`}
          orderBookSnapshot={orderBookSnapshot}
          orderContext={orderContext}
          stock={stock}
        />
      );
    }

    if (normalTab === "sell") {
      return (
        <NormalSellOrder
          key={`${stock.id}-sell-${selectedLimitPrice?.sequence ?? "initial"}`}
          orderContext={orderContext}
          selectedLimitPrice={selectedLimitPrice}
          stock={stock}
        />
      );
    }

    if (normalTab === "pending") {
      return (
        <PendingOrders
          key={`${stock.id}-pending`}
          orderContext={orderContext}
          stock={stock}
        />
      );
    }

    return (
      <NormalBuyOrder
        key={`${stock.id}-buy-${selectedLimitPrice?.sequence ?? "initial"}`}
        orderBookSnapshot={orderBookSnapshot}
        orderContext={orderContext}
        selectedLimitPrice={selectedLimitPrice}
        stock={stock}
      />
    );
  };

  return (
    <section className="cs-data-panel flex h-130 flex-col overflow-hidden text-sm leading-tight text-(--cs-text-strong) tabular-nums">
      <div className="shrink-0 px-4 pt-4">
        <Tab.Root
          className="gap-3 bg-transparent p-0 text-lg"
          type="underline"
          value={mainTab}
          onValueChange={(value) => onMainTabChange(value as MainOrderTab)}
        >
          <Tab.Item
            activeClassName="border-zinc-950 "
            className="rounded-none px-0 pb-1"
            value="normal"
          >
            일반주문
          </Tab.Item>
          <Tab.Item
            activeClassName="border-zinc-950 "
            className="rounded-none px-0 pb-1"
            value="quick"
          >
            간편주문
          </Tab.Item>
        </Tab.Root>

        {mainTab === "normal" && (
          <SegmentedControl
            aria-label="일반 주문 유형"
            className="mt-4 h-10 w-full rounded-lg p-1 text-lg"
            value={normalTab}
            onValueChange={(value) =>
              onNormalTabChange(value as NormalOrderTab)
            }
          >
            <SegmentedControl.Item
              className="h-full flex-1 rounded-lg"
              selected="text-red-500"
              value="buy"
            >
              구매
            </SegmentedControl.Item>
            <SegmentedControl.Item
              className="h-full flex-1 rounded-lg"
              selected="text-sky-600"
              value="sell"
            >
              판매
            </SegmentedControl.Item>
            <SegmentedControl.Item
              className="h-full flex-1 rounded-lg"
              selected="text-emerald-500"
              value="pending"
            >
              대기
            </SegmentedControl.Item>
          </SegmentedControl>
        )}
      </div>

      {renderPanelContent()}
    </section>
  );
}

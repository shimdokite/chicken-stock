"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useStockOrderBookQuery } from "../../apis/stocks/queries";
import StockLogo from "./stock-logo";
import StockDetailPanelSkeleton from "./panel-skeleton";
import { useStockRealtime } from "../../hooks/use-stock-realtime";
import OrderPanel, {
  type MainOrderTab,
  type NormalOrderTab,
  type SelectedOrderBookLimitPrice,
} from "./order/order-panel";
import OrderBookPanel from "./order/order-book-panel";
import type {
  StockCurrencyCode,
  StockDetailTab,
  StockOnlyProps,
} from "../../types/stock/stock-detail";
import { SegmentedControl, Tab } from "../ui";
import {
  convertCurrencyValue,
  convertStockCurrency,
  formatChange,
  formatPercent,
  formatPlainPrice,
  formatPrice,
} from "../../utils/stock/stock-detail";
import MyStockPanel from "./analytics/my-stock-panel";
import OrderHistoryPanel from "./analytics/order-history-panel";

type StockDetailProps = StockOnlyProps & {
  activeTab: StockDetailTab;
};

const InfoPanel = dynamic(() => import("./analytics/info-panel"), {
  loading: () => (
    <StockDetailPanelSkeleton
      className="min-w-0"
      label="주요 정보를 불러오는 중입니다."
    />
  ),
  ssr: false,
});

const ChartPanel = dynamic(() => import("./order/chart-panel"), {
  loading: () => (
    <StockDetailPanelSkeleton
      className="min-w-0"
      label="차트를 불러오는 중입니다."
    />
  ),
  ssr: false,
});

const sideTabs: { label: string; value: StockDetailTab }[] = [
  { label: "차트 / 호가", value: "chart-orderbook" },
  { label: "내 주식 / 종목 정보", value: "portfolio-info" },
];

export default function StockDetail({ stock, activeTab }: StockDetailProps) {
  const router = useRouter();
  const isStockRealtimeConnected = useStockRealtime(stock.id);
  const [selectedCurrencyCode, setSelectedCurrencyCode] =
    useState<StockCurrencyCode>(stock.currencyCode);
  const [orderPanelMainTab, setOrderPanelMainTab] =
    useState<MainOrderTab>("normal");
  const [orderPanelNormalTab, setOrderPanelNormalTab] =
    useState<NormalOrderTab>("buy");
  const [selectedLimitPrice, setSelectedLimitPrice] =
    useState<SelectedOrderBookLimitPrice | null>(null);
  const isOrderTab = activeTab === "chart-orderbook";
  const analyticsPath = `/stock/${stock.id}/analytics`;
  const { data: liveOrderBookSnapshot } = useStockOrderBookQuery(
    stock.id,
    stock.orderBookSnapshot,
    {
      enabled: isOrderTab,
      refetchInterval: isStockRealtimeConnected ? false : undefined,
    },
  );

  const liveStock = useMemo(() => {
    const snapshot = liveOrderBookSnapshot ?? stock.orderBookSnapshot;

    if (!snapshot) {
      return stock;
    }

    const previousClose = snapshot.previousClose ?? stock.previousClose;
    const currentPrice = snapshot.currentPrice ?? stock.currentPrice;

    return {
      ...stock,
      changeAmount: currentPrice - previousClose,
      changeRate: snapshot.changeRate ?? stock.changeRate,
      currentPrice,
      dayHigh: snapshot.dayHigh ?? stock.dayHigh,
      dayLow: snapshot.dayLow ?? stock.dayLow,
      orderBookSnapshot: snapshot,
      previousClose,
      volume: snapshot.volumeAmount ?? stock.volume,
    };
  }, [liveOrderBookSnapshot, stock]);

  const displayStock = useMemo(
    () => convertStockCurrency(liveStock, selectedCurrencyCode),
    [liveStock, selectedCurrencyCode],
  );

  const isUp = displayStock.changeRate >= 0;
  const changeClassName = isUp ? "text-red-500" : "text-blue-500";
  const marketLabel =
    displayStock.countryCode === "KR" ? "한국주식" : "미국주식";

  const rangeStats = useMemo(
    () => [
      { label: "1일 최고", value: displayStock.dayHigh },
      { label: "1일 최저", value: displayStock.dayLow },
      { label: "52주 최고", value: displayStock.high52w },
      { label: "52주 최저", value: displayStock.low52w },
    ],
    [
      displayStock.dayHigh,
      displayStock.dayLow,
      displayStock.high52w,
      displayStock.low52w,
    ],
  );

  useEffect(() => {
    if (!isOrderTab) {
      return;
    }

    router.prefetch(analyticsPath);
  }, [analyticsPath, isOrderTab, router]);

  const prefetchAnalyticsPage = useCallback(() => {
    router.prefetch(analyticsPath);
  }, [analyticsPath, router]);

  const handleTabChange = useCallback(
    (nextTab: string) => {
      if (nextTab === "chart-orderbook") {
        router.push(`/stock/${liveStock.id}/order`);
        return;
      }

      if (nextTab === "portfolio-info") {
        router.push(analyticsPath);
      }
    },
    [analyticsPath, liveStock.id, router],
  );

  const selectedDisplayPrice = selectedLimitPrice
    ? convertCurrencyValue(
        selectedLimitPrice.price,
        liveStock.currencyCode,
        displayStock.currencyCode,
      )
    : null;

  const handleOrderBookPriceSelect = useCallback(
    (price: number) => {
      setSelectedLimitPrice((previous) => ({
        price: convertCurrencyValue(
          price,
          displayStock.currencyCode,
          liveStock.currencyCode,
        ),
        sequence: (previous?.sequence ?? 0) + 1,
      }));
      setOrderPanelMainTab("normal");
      setOrderPanelNormalTab((previous) =>
        previous === "sell" ? "sell" : "buy",
      );
    },
    [displayStock.currencyCode, liveStock.currencyCode],
  );

  return (
    <main className="mx-auto w-full max-w-355 px-8 py-16 text-zinc-950">
      <section className="mb-9 flex items-end justify-between gap-8">
        <div className="flex items-center gap-3">
          <StockLogo stock={liveStock} />

          <div>
            <div className="mb-3 flex items-center gap-3">
              <h1 className="text-2xl font-bold">{liveStock.name}</h1>

              <span className="bg-zinc-200 px-2 py-1 text-lg">
                {marketLabel}
              </span>
            </div>

            <p className="text-3xl font-medium">
              {formatPrice(
                displayStock.currentPrice,
                displayStock.currencyCode,
              )}

              <span className={`ml-3 text-2xl ${changeClassName}`}>
                어제보다{" "}
                {formatChange(
                  displayStock.changeAmount,
                  displayStock.currencyCode,
                )}
                ({formatPercent(displayStock.changeRate)})
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          {displayStock.countryCode === "US" && (
            <SegmentedControl
              aria-label="통화 선택"
              className="h-7 text-sm"
              value={selectedCurrencyCode.toLowerCase()}
              style="invertedPanel"
              onValueChange={(value) =>
                setSelectedCurrencyCode(
                  value.toUpperCase() as StockCurrencyCode,
                )
              }
            >
              <SegmentedControl.Item className="h-6 min-w-8 px-2" value="usd">
                달러
              </SegmentedControl.Item>

              <SegmentedControl.Item className="h-6 min-w-8 px-2" value="krw">
                원
              </SegmentedControl.Item>
            </SegmentedControl>
          )}

          <dl className="grid grid-cols-4 gap-10 text-right">
            {rangeStats.map((item) => (
              <div key={item.label}>
                <dt className="text-base">{item.label}</dt>
                <dd className="text-2xl font-medium">
                  {formatPlainPrice(item.value, displayStock.currencyCode)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Tab.Root
        className="mb-9 gap-0 bg-transparent p-0 text-2xl"
        value={activeTab}
        onValueChange={handleTabChange}
      >
        {sideTabs.map((tab) => (
          <Tab.Item
            key={tab.value}
            value={tab.value}
            className="rounded-none px-2 py-1"
            activeClassName="bg-zinc-200"
            onFocus={
              tab.value === "portfolio-info" ? prefetchAnalyticsPage : undefined
            }
            onMouseEnter={
              tab.value === "portfolio-info" ? prefetchAnalyticsPage : undefined
            }
          >
            {tab.label}
          </Tab.Item>
        ))}
      </Tab.Root>

      {activeTab === "chart-orderbook" && (
        <div className="grid grid-cols-[minmax(0,1fr)_20rem_20rem] gap-7">
          <ChartPanel stock={displayStock} />
          <OrderBookPanel
            initialOrderBookSnapshot={liveStock.orderBookSnapshot}
            onPriceSelect={handleOrderBookPriceSelect}
            selectedPrice={selectedDisplayPrice}
            sourceCurrencyCode={liveStock.currencyCode}
            stock={displayStock}
          />
          <OrderPanel
            mainTab={orderPanelMainTab}
            normalTab={orderPanelNormalTab}
            selectedLimitPrice={selectedLimitPrice}
            stock={liveStock}
            onMainTabChange={setOrderPanelMainTab}
            onNormalTabChange={setOrderPanelNormalTab}
          />
        </div>
      )}

      {activeTab === "portfolio-info" && (
        <div className="grid grid-cols-[minmax(0,1fr)_20rem_20rem] gap-7">
          <InfoPanel stock={displayStock} />
          <MyStockPanel stock={displayStock} />
          <OrderHistoryPanel
            sourceCurrencyCode={liveStock.currencyCode}
            stock={displayStock}
          />
        </div>
      )}
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ChartPanel from "./order/chart-panel";
import InfoPanel from "./analytics/info-panel";
import StockLogo from "./stock-logo";
import OrderBookPanel from "./order/order-book-panel";
import OrderPanel from "./order/order-panel";
import { SegmentedControl, Tab } from "../ui";
import type {
  StockCurrencyCode,
  StockDetailTab,
  StockOnlyProps,
} from "../../types/stock/stock-detail";
import {
  convertStockCurrency,
  formatChange,
  formatPercent,
  formatPlainPrice,
  formatPrice,
} from "../../utils/stock/stock-detail";

type StockDetailProps = StockOnlyProps & {
  activeTab: StockDetailTab;
};

const sideTabs: { label: string; value: StockDetailTab }[] = [
  { label: "차트 / 호가", value: "chart-orderbook" },
  { label: "내 주식 / 종목 정보", value: "portfolio-info" },
];

export default function StockDetail({ stock, activeTab }: StockDetailProps) {
  const router = useRouter();
  const [selectedCurrencyCode, setSelectedCurrencyCode] =
    useState<StockCurrencyCode>(stock.currencyCode);

  const displayStock = useMemo(
    () => convertStockCurrency(stock, selectedCurrencyCode),
    [selectedCurrencyCode, stock],
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

  const handleTabChange = (nextTab: string) => {
    if (nextTab === "chart-orderbook") {
      router.push(`/stock/${stock.id}/order`);
      return;
    }

    if (nextTab === "portfolio-info") {
      router.push(`/stock/${stock.id}/analytics`);
    }
  };

  return (
    <main className="mx-auto w-full max-w-355 px-8 py-16 text-zinc-950">
      <section className="mb-9 flex items-end justify-between gap-8">
        <div className="flex items-center gap-3">
          <StockLogo stock={stock} />

          <div>
            <div className="mb-3 flex items-center gap-3">
              <h1 className="text-2xl font-bold">{stock.name}</h1>

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
          >
            {tab.label}
          </Tab.Item>
        ))}
      </Tab.Root>

      {activeTab === "chart-orderbook" && (
        <div className="grid grid-cols-[minmax(0,1fr)_20rem_20rem] gap-7">
          <ChartPanel stock={displayStock} />
          <OrderBookPanel stock={displayStock} />
          <OrderPanel stock={displayStock} />
        </div>
      )}

      {activeTab === "portfolio-info" && (
        <div className="grid grid-cols-[minmax(0,1fr)_20rem_20rem] gap-7">
          <InfoPanel stock={displayStock} />
          <OrderBookPanel stock={displayStock} />
          <OrderPanel stock={displayStock} />
        </div>
      )}
    </main>
  );
}

"use client";

import { memo, useMemo, useSyncExternalStore } from "react";
import { useStockOrderBookQuery } from "../../../../apis/stocks/queries";
import { DISPLAY_LEVEL_COUNT } from "./constants";
import MarketSummary from "./market-summary";
import OrderBookFooter from "./order-book-footer";
import OrderBookStatePanel from "./state-panel";
import OrderCountColumn from "./order-count-column";
import PriceLadder from "./price-ladder";
import TradeFlow from "./trade-flow";
import type { OrderBookPanelProps } from "./types";
import {
  convertOrderBookSnapshotCurrency,
  fillRows,
  getClosestLevelKey,
  getVolumeChangeRate,
  groupLevels,
} from "./utils";

function subscribeToHydrationStore() {
  return () => undefined;
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

function OrderBookPanel({
  initialOrderBookSnapshot,
  onPriceSelect,
  selectedPrice,
  sourceCurrencyCode,
  stock,
}: OrderBookPanelProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydrationStore,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  const { data, isError, isLoading } = useStockOrderBookQuery(
    stock.id,
    initialOrderBookSnapshot,
    { refetchInterval: false },
  );

  const orderBookSnapshot =
    isHydrated && data !== undefined ? data : initialOrderBookSnapshot;

  const snapshot = useMemo(
    () =>
      convertOrderBookSnapshotCurrency(
        orderBookSnapshot,
        sourceCurrencyCode,
        stock.currencyCode,
      ),
    [orderBookSnapshot, sourceCurrencyCode, stock.currencyCode],
  );

  const displayStock = useMemo(
    () =>
      snapshot
        ? {
            ...stock,
            currentPrice: snapshot.currentPrice ?? stock.currentPrice,
            previousClose: snapshot.previousClose ?? stock.previousClose,
            changeRate: snapshot.changeRate ?? stock.changeRate,
            dayHigh: snapshot.dayHigh ?? stock.dayHigh,
            dayLow: snapshot.dayLow ?? stock.dayLow,
            volume: snapshot.volumeAmount ?? stock.volume,
          }
        : stock,
    [snapshot, stock],
  );

  const { askRows, bidRows, closestLevelKey, priceRows } = useMemo(() => {
    if (!snapshot) {
      return {
        askRows: fillRows([], DISPLAY_LEVEL_COUNT),
        bidRows: fillRows([], DISPLAY_LEVEL_COUNT),
        closestLevelKey: null,
        priceRows: fillRows([], DISPLAY_LEVEL_COUNT * 2),
      };
    }

    const { asks, bids } = groupLevels(
      snapshot.levels,
      displayStock.currentPrice,
    );
    const nextAskRows = fillRows(asks, DISPLAY_LEVEL_COUNT);
    const nextBidRows = fillRows(bids, DISPLAY_LEVEL_COUNT);

    return {
      askRows: nextAskRows,
      bidRows: nextBidRows,
      closestLevelKey: getClosestLevelKey(
        [...asks, ...bids],
        displayStock.currentPrice,
      ),
      priceRows: [...nextAskRows, ...nextBidRows],
    };
  }, [displayStock.currentPrice, snapshot]);

  const openingPrice =
    displayStock.candles.at(-1)?.openPrice ?? displayStock.previousClose;

  const volumeChangeRate = getVolumeChangeRate(displayStock);

  if (!snapshot) {
    if (isHydrated && data === undefined && isLoading) {
      return <OrderBookStatePanel message="호가 데이터를 불러오는 중입니다." />;
    }

    if (isHydrated && data === undefined && isError) {
      return (
        <OrderBookStatePanel message="호가 데이터를 불러오지 못했습니다." />
      );
    }

    return <OrderBookStatePanel message="표시할 호가 데이터가 없습니다." />;
  }

  return (
    <section className="flex h-130 flex-col overflow-hidden rounded-3xl bg-white text-sm leading-tight text-zinc-950 tabular-nums shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
      <p className="px-4 pt-3 text-lg font-medium">호가</p>

      <div className="grid min-h-0 flex-1 grid-cols-[34%_31%_35%] grid-rows-12">
        <OrderCountColumn
          className="col-start-1 row-span-6 row-start-1 border-r-2 border-zinc-950"
          rows={askRows}
          side="ASK"
        />

        <div className="col-start-2 row-span-12 row-start-1 min-h-0">
          <PriceLadder
            changeRate={displayStock.changeRate}
            closestLevelKey={closestLevelKey}
            currencyCode={displayStock.currencyCode}
            onPriceSelect={onPriceSelect}
            rows={priceRows}
            selectedPrice={selectedPrice}
          />
        </div>

        <div className="col-start-3 row-span-6 row-start-1 min-h-0">
          <MarketSummary
            openingPrice={openingPrice}
            stock={displayStock}
            volumeChangeRate={volumeChangeRate}
          />
        </div>

        <div className="col-start-1 row-span-6 row-start-7 min-h-0">
          <TradeFlow
            currencyCode={displayStock.currencyCode}
            snapshot={snapshot}
          />
        </div>

        <OrderCountColumn
          className="col-start-3 row-span-6 row-start-7"
          rows={bidRows}
          side="BID"
        />
      </div>
      <OrderBookFooter
        totalAskSize={snapshot.totalAskSize}
        totalBidSize={snapshot.totalBidSize}
      />
    </section>
  );
}

export default memo(OrderBookPanel);

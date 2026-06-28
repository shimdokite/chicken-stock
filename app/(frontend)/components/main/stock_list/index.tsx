"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStocksInfiniteQuery } from "../../../apis/stocks/queries";
import StockListControls from "./stock-list-controls";
import StockListTable from "./stock-list-table";
import type { StocksPage } from "../../../apis/stocks/api";

type StockListProps = {
  initialStocksPage?: StocksPage;
};

export default function StockList({ initialStocksPage }: StockListProps) {
  const [selectedMarket, setSelectedMarket] = useState("all");
  const [selectedRanking, setSelectedRanking] = useState("tradingAmount");
  const [selectedPeriod, setSelectedPeriod] = useState("live");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryInitialData =
    selectedMarket === "all" && selectedRanking === "tradingAmount"
      ? initialStocksPage
      : undefined;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useStocksInfiniteQuery(
      selectedMarket,
      selectedRanking,
      queryInitialData,
    );

  const stocks = useMemo(
    () => data?.pages.flatMap((page) => page.stocks) ?? [],
    [data],
  );

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;

    if (!loadMoreElement || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      {
        rootMargin: "240px 0px",
      },
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <section className="w-full bg-white py-8 text-zinc-950">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-normal">실시간 차트</h2>

        <StockListControls
          selectedMarket={selectedMarket}
          selectedPeriod={selectedPeriod}
          selectedRanking={selectedRanking}
          onMarketChange={setSelectedMarket}
          onPeriodChange={setSelectedPeriod}
          onRankingChange={setSelectedRanking}
        />
      </div>

      <StockListTable
        isLoading={isLoading}
        selectedRanking={selectedRanking}
        stocks={stocks}
      />

      <div ref={loadMoreRef} className="h-10" aria-hidden="true" />

      {isFetchingNextPage && (
        <div className="py-4 text-center text-sm text-zinc-400">
          종목을 더 불러오는 중입니다.
        </div>
      )}
    </section>
  );
}

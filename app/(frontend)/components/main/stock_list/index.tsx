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
    useStocksInfiniteQuery(selectedMarket, selectedRanking, queryInitialData);

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
    <section className="mt-5 w-full rounded-2xl bg-white px-5 text-(--cs-text-strong) md:px-7">
      <div className="flex flex-wrap items-end justify-between gap-5 py-5">
        <div>
          <h2 className="text-xl leading-tight font-bold tracking-[-0.02em] text-(--cs-text-strong)">
            실시간 차트
          </h2>
        </div>

        <StockListControls
          selectedMarket={selectedMarket}
          selectedPeriod={selectedPeriod}
          selectedRanking={selectedRanking}
          onMarketChange={setSelectedMarket}
          onPeriodChange={setSelectedPeriod}
          onRankingChange={setSelectedRanking}
        />
      </div>

      <div className="overflow-x-auto pt-2">
        <StockListTable
          isLoading={isLoading}
          selectedRanking={selectedRanking}
          stocks={stocks}
        />
      </div>

      <div ref={loadMoreRef} className="h-10" aria-hidden="true" />

      {isFetchingNextPage && (
        <div className="py-4 text-center text-sm text-zinc-400">
          종목을 더 불러오는 중입니다.
        </div>
      )}
    </section>
  );
}

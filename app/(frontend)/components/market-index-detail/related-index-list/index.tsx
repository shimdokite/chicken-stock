"use client";

import { useMarketIndicesQuery } from "../../../apis/market-indices/queries";
import { useIsHydrated } from "../../../hooks/use-is-hydrated";
import type { MarketIndexViewData } from "../../../types/market-index";
import MarketIndexListItem from "../../market-index-list-item";

type RelatedIndexListProps = {
  activeIndexId: string;
  initialIndices: MarketIndexViewData[];
};

function RelatedIndexListFallback() {
  return (
    <aside className="rounded-2xl bg-white p-5 md:p-6">
      <div className="h-5 w-20 rounded bg-zinc-100" />

      <div className="mt-4">
        <div className="h-5 w-16 rounded bg-zinc-100" />
        <div className="mt-2 space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center gap-2 px-2 py-1.5">
              <div className="h-10 w-14 shrink-0 rounded bg-zinc-100" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-16 rounded bg-zinc-100" />
                <div className="h-3 w-28 rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="h-5 w-12 rounded bg-zinc-100" />
        <div className="mt-2 flex items-center gap-2 px-2 py-1.5">
          <div className="h-10 w-14 shrink-0 rounded bg-zinc-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-16 rounded bg-zinc-100" />
            <div className="h-3 w-28 rounded bg-zinc-100" />
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function RelatedIndexList({
  activeIndexId,
  initialIndices,
}: RelatedIndexListProps) {
  const isHydrated = useIsHydrated();
  const { data } = useMarketIndicesQuery(initialIndices);
  const marketIndexes =
    isHydrated && data !== undefined ? data : initialIndices;
  const stockIndexes = marketIndexes.filter(
    (marketIndex) => marketIndex.category === "stockIndex",
  );
  const exchangeRates = marketIndexes.filter(
    (marketIndex) => marketIndex.category === "exchangeRate",
  );

  if (marketIndexes.length === 0) {
    return <RelatedIndexListFallback />;
  }

  return (
    <aside className="rounded-2xl bg-white p-5 md:p-6">
      <h2 className="text-base leading-5 font-semibold text-zinc-950">
        지수/환율
      </h2>

      <div className="mt-4">
        <h3 className="text-sm leading-5 font-medium text-zinc-950">
          주가지수
        </h3>
        <ul className="mt-2 space-y-1">
          {stockIndexes.map((marketIndex) => (
            <li key={marketIndex.id}>
              <MarketIndexListItem
                isActive={marketIndex.id === activeIndexId}
                marketIndex={marketIndex}
                size="compact"
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h3 className="text-sm leading-5 font-medium text-zinc-950">환율</h3>
        <ul className="mt-2 space-y-1">
          {exchangeRates.map((marketIndex) => (
            <li key={marketIndex.id}>
              <MarketIndexListItem
                isActive={marketIndex.id === activeIndexId}
                marketIndex={marketIndex}
                size="compact"
              />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

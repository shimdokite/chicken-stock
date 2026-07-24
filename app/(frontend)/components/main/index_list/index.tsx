"use client";

import { useMarketIndicesQuery } from "../../../apis/market-indices/queries";
import { useIsHydrated } from "../../../hooks/use-is-hydrated";
import type { MarketIndexViewData } from "../../../types/market-index";
import MarketIndex from "./market_index";

type IndexListProps = {
  initialIndices?: MarketIndexViewData[];
};

function IndexListFallback() {
  return (
    <div className="flex h-full gap-2 overflow-hidden">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="flex min-w-52 shrink-0 items-center gap-3 px-1 py-1"
        >
          <div className="h-10 w-14 rounded bg-zinc-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-20 rounded bg-zinc-100" />
            <div className="h-4 w-24 rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IndexList({ initialIndices }: IndexListProps) {
  const isHydrated = useIsHydrated();
  const { data } = useMarketIndicesQuery(initialIndices);
  const marketIndexes =
    isHydrated && data !== undefined ? data : (initialIndices ?? []);
  const shouldShowFallback = marketIndexes.length === 0;

  return (
    <section className="flex min-w-0 flex-col rounded-2xl bg-white p-5 lg:h-full">
      <div className="mb-4">
        <h2 className="text-xl leading-tight font-bold tracking-[-0.02em] text-(--cs-text-strong)">
          주요 지수
        </h2>
      </div>

      <div className="h-28 min-w-0 overflow-hidden py-2">
        {shouldShowFallback ? (
          <IndexListFallback />
        ) : (
          <ul className="flex h-full min-w-0 [scrollbar-width:none] gap-2 overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden">
            {marketIndexes.map((marketIndex) => (
              <li
                key={marketIndex.id}
                className="min-h-0 min-w-52 shrink-0 overflow-hidden"
              >
                <MarketIndex marketIndex={marketIndex} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

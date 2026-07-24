import type { MarketIndexViewData } from "../../types/market-index";
import { toMarketIndexChartData } from "../../utils/market-index";
import MarketIndexChartPanel from "./chart-panel";
import MarketIndexHeader from "./header";
import RelatedIndexList from "./related-index-list";

type MarketIndexDetailProps = {
  marketIndex: MarketIndexViewData;
  marketIndexes: MarketIndexViewData[];
};

export default function MarketIndexDetail({
  marketIndex,
  marketIndexes,
}: MarketIndexDetailProps) {
  const chartMarketIndex = toMarketIndexChartData(marketIndex);

  return (
    <main className="min-h-[calc(100dvh-74px)] bg-[#f8f8f9] py-8 md:py-12">
      <div className="cs-page-shell">
        <MarketIndexHeader marketIndex={marketIndex} />

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {chartMarketIndex ? (
            <MarketIndexChartPanel
              initialChartResult={marketIndex.chart}
              marketIndex={chartMarketIndex}
            />
          ) : (
            <section className="h-130 min-w-0 rounded-2xl bg-white px-5 py-5 md:px-7 md:py-6" />
          )}
          <RelatedIndexList
            activeIndexId={marketIndex.id}
            initialIndices={marketIndexes}
          />
        </div>
      </div>
    </main>
  );
}

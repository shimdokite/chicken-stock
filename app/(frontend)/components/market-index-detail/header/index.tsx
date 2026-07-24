import type { MarketIndexViewData } from "../../../types/market-index";
import MarketDataStatus from "../../market-data-status";
import {
  formatMarketIndexChange,
  formatMarketIndexPercent,
  formatMarketIndexValue,
  formatMarketIndexVolume,
  getMarketIndexCountryLabel,
  getMarketIndexTrendTextColor,
} from "../../../utils/market-index";

type MarketIndexHeaderProps = {
  marketIndex: MarketIndexViewData;
};

type StatItemProps = {
  label: string;
  value: string;
};

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="min-w-18 text-right">
      <dt className="text-sm text-zinc-950">{label}</dt>
      <dd className="mt-2 text-base leading-5 text-zinc-950">{value}</dd>
    </div>
  );
}

export default function MarketIndexHeader({
  marketIndex,
}: MarketIndexHeaderProps) {
  const quote = marketIndex.quote;
  const candles = marketIndex.chart.status === "error" ? [] : marketIndex.chart.data;
  const latest = candles.at(-1);
  const high52w = candles.length > 0 ? Math.max(...candles.map(({ high }) => high)) : null;
  const low52w = candles.length > 0 ? Math.min(...candles.map(({ low }) => low)) : null;
  const trendTextColor = getMarketIndexTrendTextColor(
    quote.status === "error" ? "flat" : quote.data.trend,
  );
  const realtimeText = quote.status === "success" ? "최신" : "최근 저장";
  const countryText = getMarketIndexCountryLabel(marketIndex.countryCode);

  return (
    <header className="flex flex-col gap-6 rounded-2xl bg-white p-5 lg:flex-row lg:items-start lg:justify-between lg:p-7">
      <div className="min-w-0">
        <h1 className="text-2xl leading-8 tracking-normal text-zinc-950">
          {marketIndex.name}{" "}
          {quote.status === "error"
            ? "-"
            : formatMarketIndexValue(quote.data.currentValue)}
        </h1>

        <div className="flow-root h-8">
          {quote.status !== "error" && (
            <p className="mt-3 text-base leading-5 text-zinc-950">
              전일 대비{" "}
              <span className={trendTextColor}>
                {formatMarketIndexChange(quote.data.changeAmount)}(
                {formatMarketIndexPercent(quote.data.changeRate)})
              </span>
              <span className="ml-3 text-zinc-500">
                {realtimeText} | {countryText}
              </span>
            </p>
          )}
        </div>
        <div className="flow-root h-12">
          {quote.status === "success" ? (
            <MarketDataStatus result={marketIndex.chart} />
          ) : (
            <MarketDataStatus result={quote} />
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-x-8 gap-y-5 md:grid-cols-6">
        <StatItem
          label="거래량"
          value={
            quote.status === "error"
              ? "-"
              : formatMarketIndexVolume(quote.data.volume)
          }
        />
        <StatItem
          label="시작"
          value={latest ? formatMarketIndexValue(latest.open) : "-"}
        />
        <StatItem
          label="1일 최고"
          value={latest ? formatMarketIndexValue(latest.high) : "-"}
        />
        <StatItem
          label="1일 최저"
          value={latest ? formatMarketIndexValue(latest.low) : "-"}
        />
        <StatItem
          label="52주 최고"
          value={high52w === null ? "-" : formatMarketIndexValue(high52w)}
        />
        <StatItem
          label="52주 최저"
          value={low52w === null ? "-" : formatMarketIndexValue(low52w)}
        />
      </dl>
    </header>
  );
}

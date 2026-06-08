import type { StockDetailData } from "../../../../types/stock/stock-detail";
import {
  formatPercent,
  formatPlainPrice,
} from "../../../../utils/stock/stock-detail";
import { formatCompactQuantity } from "./utils";

type MarketSummaryProps = {
  openingPrice: number;
  stock: StockDetailData;
  volumeChangeRate: number | null;
};

export default function MarketSummary({
  openingPrice,
  stock,
  volumeChangeRate,
}: MarketSummaryProps) {
  const summaryRows = [
    {
      label: "시작",
      value: formatPlainPrice(openingPrice, stock.currencyCode),
      valueClassName: "text-zinc-500",
    },
    {
      label: "최고",
      value: formatPlainPrice(stock.dayHigh, stock.currencyCode),
      valueClassName: "text-red-500",
    },
    {
      label: "최저",
      value: formatPlainPrice(stock.dayLow, stock.currencyCode),
      valueClassName: "text-sky-600",
    },
  ];

  return (
    <dl className="h-full min-h-0 overflow-hidden border-b-2 border-zinc-200 px-3 py-2.5 text-sm text-zinc-500">
      <div className="space-y-2">
        {summaryRows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2"
          >
            <dt className="">{row.label}</dt>
            <dd className={`min-w-0 truncate text-right ${row.valueClassName}`}>
              {row.value}
            </dd>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t-2 border-zinc-200 pt-2">
        <dt className="">거래량</dt>
        <dd className="mt-1">{formatCompactQuantity(stock.volume)}</dd>
        <dt className="mt-1.5">어제보다</dt>
        <dd className="mt-1">
          {volumeChangeRate === null ? "- " : formatPercent(volumeChangeRate)}
        </dd>
      </div>
    </dl>
  );
}

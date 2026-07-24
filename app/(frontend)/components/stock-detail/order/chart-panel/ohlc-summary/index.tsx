import type { OhlcItem } from "../types";
import type { StockCurrencyCode } from "../../../../../types/stock/stock-detail";
import {
  formatPercent,
  formatPrice,
} from "../../../../../utils/stock/stock-detail";

type OhlcSummaryProps = {
  currencyCode: StockCurrencyCode;
  items: OhlcItem[];
};

export function OhlcSummary({ currencyCode, items }: OhlcSummaryProps) {
  return (
    <dl className="mb-2 flex flex-wrap gap-x-2 gap-y-1 text-xs whitespace-nowrap text-zinc-950">
      {items.map((item) => {
        const rateColorClassName =
          item.rate > 0
            ? "text-(--cs-color-red-500)"
            : item.rate < 0
              ? "text-(--cs-color-blue-700)"
              : "text-zinc-500";

        return (
          <div key={item.label} className="flex items-center">
            <dt>{item.label}</dt>
            <dd className="ml-1">
              {formatPrice(item.value, currencyCode)}
              <span className={`ml-1 ${rateColorClassName}`}>
                ({formatPercent(item.rate)})
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

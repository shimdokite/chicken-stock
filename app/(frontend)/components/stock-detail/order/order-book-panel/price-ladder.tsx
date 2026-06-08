import type { StockCurrencyCode } from "../../../../types/stock/stock-detail";
import {
  formatPercent,
  formatPlainPrice,
} from "../../../../utils/stock/stock-detail";
import { ORDER_BOOK_ROW_COUNT } from "./constants";
import type { OrderBookLevelRow } from "./types";
import { getLevelKey, getTrendTextClassName } from "./utils";

type PriceLadderProps = {
  changeRate: number;
  closestLevelKey: string | null;
  currencyCode: StockCurrencyCode;
  onPriceSelect: (price: number) => void;
  rows: OrderBookLevelRow[];
  selectedPrice: number | null;
};

export default function PriceLadder({
  changeRate,
  closestLevelKey,
  currencyCode,
  onPriceSelect,
  rows,
  selectedPrice,
}: PriceLadderProps) {
  const trendTextClassName = getTrendTextClassName(changeRate);

  return (
    <div
      className="grid h-full min-h-0 border-r-2 border-zinc-950 text-center"
      style={{
        gridTemplateRows: `repeat(${ORDER_BOOK_ROW_COUNT}, minmax(0, 1fr))`,
      }}
    >
      {rows.map((level, index) => {
        const isClosestLevel =
          level !== null &&
          (selectedPrice === null
            ? getLevelKey(level) === closestLevelKey
            : level.price === selectedPrice);

        return (
          <div
            key={level ? getLevelKey(level) : `empty-price-${index}`}
            className="flex min-h-0 items-center justify-center px-1"
          >
            {level && (
              <button
                className={`flex h-[calc(100%-0.25rem)] w-[calc(100%-0.5rem)] min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 transition-colors hover:bg-zinc-50 ${
                  isClosestLevel
                    ? "rounded-lg border-2 border-zinc-800 bg-white"
                    : "border-2 border-transparent"
                }`}
                type="button"
                onClick={() => onPriceSelect(level.price)}
              >
                <strong
                  className={`max-w-full truncate leading-none font-semibold ${trendTextClassName}`}
                >
                  {formatPlainPrice(level.price, currencyCode)}
                </strong>
                <span
                  className={`max-w-full truncate text-xs leading-none font-medium ${trendTextClassName}`}
                >
                  {formatPercent(changeRate)}
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

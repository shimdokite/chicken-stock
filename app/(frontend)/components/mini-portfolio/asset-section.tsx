import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { twMerge } from "tailwind-merge";
import type {
  PortfolioAssetType,
  PortfolioItem,
} from "@/app/(frontend)/apis/portfolio/api";
import { ASSET_LABELS } from "./constants";
import StockRow from "./stock-row";
import type { AmountView, ForeignStockCurrency } from "./types";

type AssetSectionProps = {
  amountView: AmountView;
  assetType: PortfolioAssetType;
  foreignStockCurrency: ForeignStockCurrency;
  isCollapsed: boolean;
  items: PortfolioItem[];
  onToggle: (assetType: PortfolioAssetType) => void;
  onForeignStockCurrencyChange: (currency: ForeignStockCurrency) => void;
};

export default function AssetSection({
  amountView,
  assetType,
  foreignStockCurrency,
  isCollapsed,
  items,
  onForeignStockCurrencyChange,
  onToggle,
}: AssetSectionProps) {
  const hasAssetItems = items.length > 0;
  const shouldShowForeignCurrencyToggle = assetType === "FOREIGN_STOCK";
  const shouldShowAssetItems = !isCollapsed && hasAssetItems;
  const shouldShowEmptyAssetMessage = !isCollapsed && !hasAssetItems;
  let assetSectionAriaLabel = `${ASSET_LABELS[assetType]} 닫기`;

  if (isCollapsed) {
    assetSectionAriaLabel = `${ASSET_LABELS[assetType]} 열기`;
  }

  return (
    <section className="col gap-3">
      <div className="row items-center justify-between gap-3">
        <button
          type="button"
          aria-expanded={!isCollapsed}
          aria-label={assetSectionAriaLabel}
          className="row cursor-pointer items-center gap-1"
          onClick={() => onToggle(assetType)}
        >
          <span className="text-[12px] leading-4 font-medium">
            {ASSET_LABELS[assetType]}
          </span>

          {isCollapsed && (
            <IconChevronDown
              aria-hidden="true"
              className="size-3.5 text-[#cccccc]"
              stroke={3}
            />
          )}
          {!isCollapsed && (
            <IconChevronUp
              aria-hidden="true"
              className="size-3.5 text-[#cccccc]"
              stroke={3}
            />
          )}
        </button>

        {shouldShowForeignCurrencyToggle && (
          <div className="row shrink-0 items-center gap-1">
            <button
              type="button"
              className={twMerge(
                "cursor-pointer text-[12px] leading-4 font-medium text-[#777777]",
                foreignStockCurrency === "KRW" && "text-black underline",
              )}
              onClick={() => onForeignStockCurrencyChange("KRW")}
            >
              원
            </button>
            <button
              type="button"
              className={twMerge(
                "cursor-pointer text-[12px] leading-4 font-medium text-[#777777]",
                foreignStockCurrency === "USD" && "text-black underline",
              )}
              onClick={() => onForeignStockCurrencyChange("USD")}
            >
              $
            </button>
          </div>
        )}
      </div>

      {shouldShowAssetItems && (
        <ul className="col gap-4">
          {items.map((item) => (
            <StockRow
              key={`${item.portfolioId}-${item.stockId}`}
              amountView={amountView}
              foreignStockCurrency={foreignStockCurrency}
              item={item}
            />
          ))}
        </ul>
      )}

      {shouldShowEmptyAssetMessage && (
        <p className="py-1 text-[12px] leading-4 text-[#888888]">
          보유 중인 종목이 없습니다.
        </p>
      )}
    </section>
  );
}

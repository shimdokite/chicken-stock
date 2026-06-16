import { useMemo, useState } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { twMerge } from "tailwind-merge";
import type { PortfolioAssetType } from "@/app/(frontend)/apis/portfolio/api";
import { useGetPortfolio } from "@/app/(frontend)/apis/portfolio/queries";
import AssetSection from "./asset-section";
import { ASSET_ORDER, SORT_OPTIONS } from "./constants";
import type {
  AmountView,
  CollapsedAssetSections,
  ForeignStockCurrency,
  SortOption,
} from "./types";
import {
  formatDollar,
  formatProfit,
  formatWon,
  getPortfolioItemsByAsset,
  getProfitClassName,
  getSortOptionLabel,
} from "./utils";
import Link from "next/link";

export default function MiniPortfolioPanel() {
  const { data } = useGetPortfolio();
  const [isOpen, setIsOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("profitRateDesc");
  const [amountView, setAmountView] = useState<AmountView>("evaluationAmount");
  const [foreignStockCurrency, setForeignStockCurrency] =
    useState<ForeignStockCurrency>("USD");
  const [collapsedAssetSections, setCollapsedAssetSections] =
    useState<CollapsedAssetSections>({
      DOMESTIC_STOCK: false,
      FOREIGN_STOCK: false,
    });

  const totalProfit = useMemo(() => {
    return (
      data?.items.reduce((total, item) => total + Number(item.profit), 0) ?? 0
    );
  }, [data?.items]);

  if (!data) {
    return null;
  }

  const selectedSortOptionLabel = getSortOptionLabel(sortOption);
  let togglePortfolioAriaLabel = "미니 포트폴리오 열기";
  let totalProfitRate = 0;

  if (isOpen) {
    togglePortfolioAriaLabel = "미니 포트폴리오 닫기";
  }

  if (data.totalInvestmentAmount > 0) {
    totalProfitRate = (totalProfit / data.totalInvestmentAmount) * 100;
  }

  const toggleAssetSection = (assetType: PortfolioAssetType) => {
    setCollapsedAssetSections((prev) => ({
      ...prev,
      [assetType]: !prev[assetType],
    }));
  };

  return (
    <aside
      className={twMerge(
        "fixed right-6 z-40 w-[300px] overflow-hidden border border-[rgba(123,120,120,0.35)] bg-white shadow-[0_4px_18px_rgba(0,0,0,0.18)] transition-all duration-300 ease-out",
        isOpen &&
          "col bottom-3 h-[min(450px,calc(100dvh-24px))] gap-5 rounded-[8px] py-5",
        !isOpen && "bottom-0 h-[30px] rounded-t-[8px]",
      )}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={togglePortfolioAriaLabel}
        className="row h-[30px] w-full cursor-pointer items-center justify-between px-5 text-left"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span
          className={twMerge(
            "text-[16px] leading-none font-semibold transition-opacity duration-200",
            isOpen && "opacity-100",
            !isOpen && "opacity-0",
          )}
        >
          기본계좌
        </span>

        {isOpen && (
          <IconChevronDown
            aria-hidden="true"
            className="text-[#cccccc]"
            size={20}
          />
        )}
        {!isOpen && (
          <IconChevronUp
            aria-hidden="true"
            className="mr-5 ml-auto text-[#cccccc]"
            size={20}
          />
        )}
      </button>

      <div
        aria-hidden={!isOpen}
        className="h-[calc(100%-30px)] overflow-y-auto px-5"
      >
        <Link href="/portfolio" className="grid grid-cols-2 gap-4">
          <div className="col gap-1">
            <p className="text-[12px] leading-4 font-medium">원화</p>
            <p className="truncate text-[18px] leading-6 font-medium">
              {formatWon(data.krwBalance)}
            </p>
          </div>

          <div className="col gap-1">
            <p className="text-[12px] leading-4 font-medium">달러</p>
            <p className="truncate text-[18px] leading-6 font-medium">
              {formatDollar(data.usdBalance)}
            </p>
          </div>
        </Link>

        <section className="col mt-7 gap-1">
          <p className="text-[13px] leading-4 font-medium">내 투자</p>
          <p className="text-[24px] leading-7 font-bold tracking-normal">
            {formatWon(data.totalInvestmentAmount)}
          </p>
          <p
            className={twMerge(
              "text-[13px] leading-4 font-medium",
              getProfitClassName(totalProfit),
            )}
          >
            {formatProfit(totalProfit, totalProfitRate, "KRW")}
          </p>
        </section>

        <div className="row mt-7 items-center justify-between gap-3 text-[12px] leading-4 font-medium">
          <div className="row relative w-fit shrink-0 items-center gap-1">
            <span className="text-[12px] leading-4 font-medium">
              {selectedSortOptionLabel}
            </span>
            <IconChevronDown
              aria-hidden="true"
              className="size-3.5 shrink-0 text-[#cccccc]"
              stroke={3}
            />

            <select
              aria-label="보유 주식 정렬"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value as SortOption)
              }
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="row items-center gap-3">
            <button
              type="button"
              className={twMerge(
                "cursor-pointer text-[12px] leading-4 font-medium text-[#777777]",
                amountView === "currentPrice" && "text-black underline",
              )}
              onClick={() => setAmountView("currentPrice")}
            >
              현재가
            </button>
            <button
              type="button"
              className={twMerge(
                "cursor-pointer text-[12px] leading-4 font-medium text-[#777777]",
                amountView === "evaluationAmount" && "text-black underline",
              )}
              onClick={() => setAmountView("evaluationAmount")}
            >
              평가금
            </button>
          </div>
        </div>

        <div className="col mt-5 gap-6">
          {ASSET_ORDER.map((assetType) => {
            const items = getPortfolioItemsByAsset(
              data.items,
              assetType,
              sortOption,
            );

            return (
              <AssetSection
                key={assetType}
                amountView={amountView}
                assetType={assetType}
                foreignStockCurrency={foreignStockCurrency}
                isCollapsed={collapsedAssetSections[assetType]}
                items={items}
                onForeignStockCurrencyChange={setForeignStockCurrency}
                onToggle={toggleAssetSection}
              />
            );
          })}
        </div>
      </div>
    </aside>
  );
}

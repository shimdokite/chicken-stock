import Link from "next/link";
import { twMerge } from "tailwind-merge";
import type { PortfolioItem } from "@/app/(frontend)/apis/portfolio/api";
import { convertCurrencyValue, type CurrencyCode } from "@/app/(frontend)/utils/currency";
import StockLogo from "./stock-logo";
import type { AmountView, ForeignStockCurrency } from "./types";
import {
  formatCurrencyAmount,
  formatProfit,
  getProfitClassName,
} from "./utils";

type StockRowProps = {
  amountView: AmountView;
  foreignStockCurrency: ForeignStockCurrency;
  item: PortfolioItem;
};

export default function StockRow({
  amountView,
  foreignStockCurrency,
  item,
}: StockRowProps) {
  const profit = Number(item.profit);
  const profitRate = Number(item.profitRate);
  const evaluationAmount = Number(item.currentPrice) * item.quantity;
  let displayCurrency: CurrencyCode = "KRW";
  let displaySourceAmount = evaluationAmount;
  let displayAmount = displaySourceAmount;
  let displayProfit = profit;

  if (item.assetType === "FOREIGN_STOCK") {
    displayCurrency = foreignStockCurrency;
  }

  if (amountView === "currentPrice") {
    displaySourceAmount = Number(item.currentPrice);
    displayAmount = displaySourceAmount;
  }

  if (item.assetType === "FOREIGN_STOCK" && foreignStockCurrency === "KRW") {
    displayAmount = convertCurrencyValue(displaySourceAmount, "USD", "KRW");
    displayProfit = convertCurrencyValue(profit, "USD", "KRW");
  }

  return (
    <li>
      <Link
        href={`/stock/${item.stockId}/order`}
        prefetch={false}
        className="row items-center justify-between gap-3 rounded-(--cs-radius-md) py-1 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
      >
        <div className="row min-w-0 items-center gap-2">
          <StockLogo item={item} />

          <div className="col min-w-0 gap-0.5">
            <p className="truncate typography-medium-13 leading-4">
              {item.companyName}
            </p>
            <p className="text-[12px] leading-4 text-[#111111]">
              {item.quantity.toLocaleString("ko-KR")}주
            </p>
          </div>
        </div>

        <div className="col shrink-0 items-end gap-0.5 text-right">
          <p className="typography-medium-14 leading-4">
            {formatCurrencyAmount(displayAmount, displayCurrency)}
          </p>
          <p
            className={twMerge(
              "text-xs leading-4",
              getProfitClassName(profit),
            )}
          >
            {formatProfit(displayProfit, profitRate, displayCurrency)}
          </p>
        </div>
      </Link>
    </li>
  );
}

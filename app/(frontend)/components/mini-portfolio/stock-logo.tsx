import { twMerge } from "tailwind-merge";
import type { PortfolioItem } from "@/app/(frontend)/apis/portfolio/api";
import {
  getLogoColorClassName,
  getLogoLabel,
} from "@/app/(frontend)/utils/stock/stock-detail";

type StockLogoProps = {
  item: PortfolioItem;
};

export default function StockLogo({ item }: StockLogoProps) {
  const logoColorClassName = getLogoColorClassName(item.stockId);

  return (
    <span
      className={twMerge(
        "flex size-10 shrink-0 items-center justify-center rounded-full border text-base font-bold",
        logoColorClassName,
      )}
      aria-hidden="true"
    >
      {getLogoLabel(item.companyName)}
    </span>
  );
}

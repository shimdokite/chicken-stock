import Link from "next/link";
import type { StockData, StockTrend } from "../types";

type StockListRowProps = {
  stock: StockData;
};

const logoColorClassNames = [
  "border-red-200 bg-red-100 text-red-700",
  "border-orange-200 bg-orange-100 text-orange-700",
  "border-amber-200 bg-amber-100 text-amber-700",
  "border-emerald-200 bg-emerald-100 text-emerald-700",
  "border-cyan-200 bg-cyan-100 text-cyan-700",
  "border-blue-200 bg-blue-100 text-blue-700",
  "border-indigo-200 bg-indigo-100 text-indigo-700",
  "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700",
];

function getChangeRateClassName(trend: StockTrend) {
  if (trend === "up") {
    return "bg-red-200 text-zinc-950";
  }

  return "bg-indigo-200 text-zinc-950";
}

function getLogoColorClassName(stockId: number) {
  return logoColorClassNames[stockId % logoColorClassNames.length];
}

export default function StockListRow({ stock }: StockListRowProps) {
  const changeRateClassName = getChangeRateClassName(stock.trend);
  const logoColorClassName = getLogoColorClassName(stock.id);

  return (
    <li>
      <Link
        href={`/stock/${stock.id}/order`}
        prefetch={false}
        className="grid grid-cols-[2.5rem_3.25rem_minmax(16rem,1fr)_12rem_minmax(8rem,1fr)_10rem_12rem] items-center gap-4 border-b border-(--cs-border-subtle) py-3 text-lg transition-colors last:border-b-0 hover:bg-(--cs-brand-50)"
      >
        <span className="text-left text-base">{stock.rank}</span>

        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-base font-bold ${logoColorClassName}`}
          aria-hidden="true"
        >
          {stock.logoLabel}
        </span>

        <strong className="truncate text-left text-lg font-semibold">
          {stock.name}
        </strong>

        <span className="col-start-4 text-right">{stock.price}</span>

        <span className="col-start-5 translate-x-1/2 text-center">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-base ${changeRateClassName}`}
          >
            {stock.changeRate}
          </span>
        </span>

        <span className="col-start-7 text-right">{stock.rankingValue}</span>
      </Link>
    </li>
  );
}

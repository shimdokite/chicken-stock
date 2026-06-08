import { formatNumber } from "../../../../utils/stock/stock-detail";

type OrderBookFooterProps = {
  totalAskSize: number;
  totalBidSize: number;
};

export default function OrderBookFooter({
  totalAskSize,
  totalBidSize,
}: OrderBookFooterProps) {
  return (
    <div className="grid h-8 shrink-0 grid-cols-2 items-center gap-3 border-t-2 border-zinc-200 px-4 text-xs">
      <p className="truncate text-sky-600">
        <span className="text-zinc-950">총 판매대기 </span>
        {formatNumber(totalAskSize)}
      </p>
      <p className="truncate text-right text-red-500">
        <span className="text-zinc-950">총 구매대기 </span>
        {formatNumber(totalBidSize)}
      </p>
    </div>
  );
}

import type { StockData } from "../types";
import StockListRow from "../stock-list-row";

type StockListTableProps = {
  stocks: StockData[];
  selectedRanking: string;
};

function getRankingLabel(selectedRanking: string) {
  if (selectedRanking === "tradingVolume") {
    return "거래량 순";
  }

  return "거래대금 순";
}

export default function StockListTable({
  stocks,
  selectedRanking,
}: StockListTableProps) {
  const rankingLabel = getRankingLabel(selectedRanking);

  return (
    <>
      <div className="grid grid-cols-[2.5rem_3.25rem_minmax(16rem,1fr)_12rem_minmax(8rem,1fr)_10rem_12rem] items-center gap-4 border-b border-zinc-100 pb-3 text-sm text-zinc-400">
        <span className="col-span-3 flex h-4 items-center text-left leading-none">
          순위/오늘 11:30 기준
        </span>
        <span className="col-start-4 flex h-4 items-center justify-end leading-none">
          현재가
        </span>
        <span className="col-start-5 flex h-4 translate-x-1/2 items-center justify-center leading-none">
          등락률
        </span>
        <span className="col-start-7 flex h-4 items-center justify-end leading-none">
          {rankingLabel}
        </span>
      </div>

      {stocks.length === 0 && (
        <div className="py-16 text-center text-base text-zinc-500">
          표시할 종목이 없습니다.
        </div>
      )}

      {stocks.length > 0 && (
        <ol>
          {stocks.map((stock) => (
            <StockListRow key={stock.id} stock={stock} />
          ))}
        </ol>
      )}
    </>
  );
}

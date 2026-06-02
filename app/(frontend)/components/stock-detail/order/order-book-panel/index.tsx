// TODO: 추후 실제 데이터로 변경 예정
import type {
  StockOnlyProps,
  StockOrderBookLevelData,
} from "../../../../types/stock/stock-detail";
import {
  formatNumber,
  formatPercent,
  formatPlainPrice,
  formatTradingValue,
} from "../../../../utils/stock/stock-detail";

function groupLevels(levels: StockOrderBookLevelData[]) {
  return {
    asks: levels
      .filter((level) => level.side === "ASK")
      .sort((a, b) => b.levelRank - a.levelRank)
      .slice(0, 8),
    bids: levels
      .filter((level) => level.side === "BID")
      .sort((a, b) => a.levelRank - b.levelRank)
      .slice(0, 8),
  };
}

export default function OrderBookPanel({ stock }: StockOnlyProps) {
  const snapshot = stock.orderBookSnapshot;
  const fallbackQuantity = Math.max(Math.round(stock.volume / 1000), 1);
  const { asks, bids } = snapshot
    ? groupLevels(snapshot.levels)
    : {
        asks: Array.from({ length: 8 }, (_, index) => ({
          side: "ASK" as const,
          levelRank: index + 1,
          price: stock.currentPrice + (8 - index) * 100,
          quantity: fallbackQuantity,
        })),
        bids: Array.from({ length: 8 }, (_, index) => ({
          side: "BID" as const,
          levelRank: index + 1,
          price: stock.currentPrice - index * 100,
          quantity: fallbackQuantity,
        })),
      };

  return (
    <section className="h-130 border-4 border-[#ff260d] bg-white">
      <div className="grid h-full grid-cols-[1fr_1fr_7rem] text-sm">
        <div className="border-r border-zinc-500">
          <h3 className="px-3 py-3 text-xl font-semibold">호가</h3>
          <div className="grid grid-cols-2 border-y border-zinc-300 text-right font-semibold text-sky-600">
            <span className="px-2 py-2">{formatNumber(fallbackQuantity)}</span>
            <span className="px-2 py-2">
              {formatPlainPrice(stock.currentPrice, stock.currencyCode)}
            </span>
          </div>
          {asks.map((level) => (
            <div
              key={`ask-${level.levelRank}`}
              className="grid grid-cols-2 border-b border-zinc-200 text-right"
            >
              <span className="px-2 py-1.5 text-sky-600">
                {formatNumber(level.quantity)}
              </span>
              <span className="px-2 py-1.5 font-semibold text-sky-600">
                {formatPlainPrice(level.price, stock.currencyCode)}
              </span>
            </div>
          ))}
          <div className="border-y border-zinc-500 px-2 py-2">
            <p>체결강도</p>
            <p className="text-sky-600">
              {snapshot ? `${snapshot.executionStrength.toFixed(2)}%` : "-"}
            </p>
          </div>
          {bids.map((level) => (
            <div
              key={`bid-${level.levelRank}`}
              className="grid grid-cols-2 border-b border-zinc-100 text-right"
            >
              <span className="px-2 py-1 text-zinc-950">
                {formatPlainPrice(level.price, stock.currencyCode)}
              </span>
              <span className="px-2 py-1 text-sky-600">
                {formatNumber(level.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-r border-zinc-500 text-center">
          {[...asks, ...bids].slice(0, 14).map((level, index) => (
            <div
              key={`center-${level.side}-${level.levelRank}`}
              className={`border-b px-2 py-2 ${
                index < asks.length ? "text-sky-600" : "text-red-500"
              }`}
            >
              <strong className="block text-lg">
                {formatPlainPrice(level.price, stock.currencyCode)}
              </strong>
              <span className="text-xs">{formatPercent(stock.changeRate)}</span>
            </div>
          ))}
        </div>

        <div className="px-2 py-12 text-zinc-500">
          <dl className="space-y-3">
            <div>
              <dt>시작</dt>
              <dd>
                {formatPlainPrice(stock.previousClose, stock.currencyCode)}
              </dd>
            </div>
            <div>
              <dt>최고</dt>
              <dd className="text-red-500">
                {formatPlainPrice(stock.dayHigh, stock.currencyCode)}
              </dd>
            </div>
            <div>
              <dt>최저</dt>
              <dd className="text-sky-600">
                {formatPlainPrice(stock.dayLow, stock.currencyCode)}
              </dd>
            </div>
            <div className="border-t pt-3">
              <dt>거래량</dt>
              <dd>{formatNumber(stock.volume)}</dd>
            </div>
            <div>
              <dt>거래대금</dt>
              <dd>
                {formatTradingValue(stock.tradingValue, stock.currencyCode)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

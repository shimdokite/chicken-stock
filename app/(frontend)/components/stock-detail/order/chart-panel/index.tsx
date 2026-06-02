// TODO: 추후 실제 데이터로 변경 예정
import type { StockOnlyProps } from "../../../../types/stock/stock-detail";
import {
  formatDateLabel,
  formatPercent,
  formatPlainPrice,
  formatPrice,
} from "../../../../utils/stock/stock-detail";

const chartPeriods = ["1분", "일", "주", "월", "년", "캔들"];

function getCandleStyle(
  value: number,
  minValue: number,
  range: number,
  minimum = 12,
) {
  return `${minimum + ((value - minValue) / range) * (100 - minimum)}%`;
}

export default function ChartPanel({ stock }: StockOnlyProps) {
  const candles = stock.candles.length
    ? stock.candles
    : [
        {
          timestamp: 0,
          openPrice: stock.previousClose,
          highPrice: stock.dayHigh,
          lowPrice: stock.dayLow,
          closePrice: stock.currentPrice,
        },
      ];
  const values = candles.flatMap((candle) => [
    candle.openPrice,
    candle.highPrice,
    candle.lowPrice,
    candle.closePrice,
  ]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, 1);
  const chartCandles = candles.slice(-18);

  return (
    <section className="h-130 border-4 border-[#ff260d] bg-white p-7">
      <div className="mb-5 flex items-center gap-8 text-lg">
        {chartPeriods.map((period) => (
          <span
            key={period}
            className={
              period === "일"
                ? "rounded-lg bg-zinc-200 px-2 py-1 font-semibold"
                : ""
            }
          >
            {period}
          </span>
        ))}
      </div>

      <div className="grid h-105 grid-cols-[1fr_4.5rem] gap-3">
        <div className="relative border-y border-zinc-200 bg-[linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-size-[25%_25%]">
          <div className="absolute inset-x-4 top-8 text-center text-sm text-red-500">
            {formatPrice(maxValue, stock.currencyCode)}
            {`(${formatPercent(stock.changeRate)})`}
          </div>

          <div className="absolute inset-x-0 top-8 bottom-0 flex items-end justify-around px-2">
            {chartCandles.map((candle) => {
              const isUp = candle.closePrice >= candle.openPrice;
              const colorClassName = isUp ? "bg-red-500" : "bg-blue-500";
              const wickTop = getCandleStyle(candle.highPrice, minValue, range);
              const wickBottom = getCandleStyle(
                candle.lowPrice,
                minValue,
                range,
              );
              const bodyTop = getCandleStyle(
                Math.max(candle.openPrice, candle.closePrice),
                minValue,
                range,
              );
              const bodyBottom = getCandleStyle(
                Math.min(candle.openPrice, candle.closePrice),
                minValue,
                range,
              );

              return (
                <div
                  key={`${candle.timestamp}-${candle.closePrice}`}
                  className="relative h-full w-5"
                >
                  <span
                    className={`absolute left-1/2 w-0.5 -translate-x-1/2 ${colorClassName}`}
                    style={{
                      bottom: wickBottom,
                      height: `calc(${wickTop} - ${wickBottom})`,
                    }}
                  />
                  <span
                    className={`absolute left-0 w-full ${colorClassName}`}
                    style={{
                      bottom: bodyBottom,
                      height: `max(calc(${bodyTop} - ${bodyBottom}), 4px)`,
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="absolute right-0 bottom-2 left-0 flex justify-around text-base">
            {chartCandles.slice(0, 4).map((candle) => (
              <span key={candle.timestamp}>
                {formatDateLabel(candle.timestamp)}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between text-right text-sm text-zinc-500">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index}>
              {formatPlainPrice(
                maxValue - (range / 7) * index,
                stock.currencyCode,
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

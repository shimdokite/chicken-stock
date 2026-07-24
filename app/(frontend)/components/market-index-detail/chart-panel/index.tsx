"use client";

import type {
  MarketDataResult,
  MarketIndexCandleData,
  MarketIndexDetailData,
} from "../../../types/market-index";
import { ChartOverlayLabels } from "../../stock-detail/order/chart-panel/chart-overlay-labels";
import { RangeToolbar } from "../../stock-detail/order/chart-panel/range-toolbar";
import type { ChartCandleData } from "../../stock-detail/order/chart-panel/types";
import { MarketIndexOhlcSummary } from "./ohlc-summary";
import { useMarketIndexChartPanel } from "./use-market-index-chart-panel";

type MarketIndexChartPanelProps = {
  initialChartResult: MarketDataResult<MarketIndexCandleData[]>;
  marketIndex: MarketIndexDetailData;
};

const STATIC_CHART_WIDTH = 960;
const STATIC_CHART_HEIGHT = 340;
const STATIC_CHART_PADDING = {
  bottom: 28,
  left: 12,
  right: 44,
  top: 16,
};
const STATIC_CHART_MAX_CANDLES = 90;

function getStaticChartY(value: number, min: number, max: number) {
  const chartHeight =
    STATIC_CHART_HEIGHT -
    STATIC_CHART_PADDING.top -
    STATIC_CHART_PADDING.bottom;
  const denominator = max - min || 1;

  return (
    STATIC_CHART_PADDING.top + ((max - value) / denominator) * chartHeight
  );
}

function getStaticChartX(index: number, candleCount: number) {
  const chartWidth =
    STATIC_CHART_WIDTH -
    STATIC_CHART_PADDING.left -
    STATIC_CHART_PADDING.right;

  if (candleCount <= 1) {
    return STATIC_CHART_PADDING.left + chartWidth;
  }

  return (
    STATIC_CHART_PADDING.left + (index / (candleCount - 1)) * chartWidth
  );
}

function StaticMarketIndexChartPreview({
  candles,
}: {
  candles: ChartCandleData[];
}) {
  const visibleCandles = candles.slice(-STATIC_CHART_MAX_CANDLES);
  const prices = visibleCandles.flatMap((candle) => [candle.high, candle.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const candleWidth = Math.max(
    3,
    Math.min(
      8,
      (STATIC_CHART_WIDTH -
        STATIC_CHART_PADDING.left -
        STATIC_CHART_PADDING.right) /
        Math.max(visibleCandles.length, 1) /
        2.4,
    ),
  );

  if (visibleCandles.length === 0) {
    return <div className="h-full w-full rounded-2xl bg-zinc-50" />;
  }

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      viewBox={`0 0 ${STATIC_CHART_WIDTH} ${STATIC_CHART_HEIGHT}`}
      preserveAspectRatio="none"
    >
      {[0, 1, 2, 3].map((line) => {
        const y =
          STATIC_CHART_PADDING.top +
          ((STATIC_CHART_HEIGHT -
            STATIC_CHART_PADDING.top -
            STATIC_CHART_PADDING.bottom) /
            3) *
            line;

        return (
          <line
            key={line}
            x1={STATIC_CHART_PADDING.left}
            x2={STATIC_CHART_WIDTH - STATIC_CHART_PADDING.right}
            y1={y}
            y2={y}
            stroke="#e4e4e7"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}

      {visibleCandles.map((candle, index) => {
        const x = getStaticChartX(index, visibleCandles.length);
        const highY = getStaticChartY(candle.high, minPrice, maxPrice);
        const lowY = getStaticChartY(candle.low, minPrice, maxPrice);
        const openY = getStaticChartY(candle.open, minPrice, maxPrice);
        const closeY = getStaticChartY(candle.close, minPrice, maxPrice);
        const isUp = candle.close >= candle.open;
        const color = isUp ? "#ef4444" : "#1d4ed8";
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2, Math.abs(closeY - openY));

        return (
          <g key={candle.time}>
            <line
              x1={x}
              x2={x}
              y1={highY}
              y2={lowY}
              stroke={color}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={x - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={isUp ? color : "white"}
              stroke={color}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function MarketIndexChartPanel({
  initialChartResult,
  marketIndex,
}: MarketIndexChartPanelProps) {
  const {
    axisTickLabels,
    chartContainerRef,
    chartCandles,
    chartResult,
    crosshairDateLabel,
    crosshairPriceLabel,
    currentPriceLabel,
    currentPriceLabelClassName,
    handleRangeChange,
    highLabelPosition,
    isHydrated,
    lowLabelPosition,
    ohlcItems,
    priceAxisTickLabels,
    selectedRange,
  } = useMarketIndexChartPanel({ initialChartResult, marketIndex });

  if (chartResult.status === "error") {
    return (
      <section className="h-130 min-w-0 rounded-2xl bg-white px-5 py-5 md:px-7 md:py-6" />
    );
  }

  return (
    <section className="flex h-130 min-w-0 flex-col rounded-2xl bg-white px-5 py-5 md:px-7 md:py-6">
      <RangeToolbar
        selectedRange={selectedRange}
        onRangeChange={handleRangeChange}
      />

      <MarketIndexOhlcSummary items={ohlcItems} />

      <div className="relative min-h-0 flex-1">
        {isHydrated ? (
          <div ref={chartContainerRef} className="h-full w-full" />
        ) : (
          <StaticMarketIndexChartPreview candles={chartCandles} />
        )}

        <ChartOverlayLabels
          axisTickLabels={axisTickLabels}
          crosshairDateLabel={crosshairDateLabel}
          crosshairPriceLabel={crosshairPriceLabel}
          currentPriceLabel={currentPriceLabel}
          currentPriceLabelClassName={currentPriceLabelClassName}
          highLabelPosition={highLabelPosition}
          lowLabelPosition={lowLabelPosition}
          priceAxisTickLabels={priceAxisTickLabels}
        />
      </div>
    </section>
  );
}

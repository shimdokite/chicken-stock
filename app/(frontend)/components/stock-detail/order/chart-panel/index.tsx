"use client";

import { ChartOverlayLabels } from "./chart-overlay-labels";
import { OhlcSummary } from "./ohlc-summary";
import { RangeToolbar } from "./range-toolbar";
import { useChartPanel } from "./use-chart-panel";
import type { StockOnlyProps } from "../../../../types/stock/stock-detail";

export default function ChartPanel({ stock }: StockOnlyProps) {
  const {
    axisTickLabels,
    chartContainerRef,
    crosshairDateLabel,
    crosshairPriceLabel,
    currentPriceLabel,
    currentPriceLabelClassName,
    handleRangeChange,
    highLabelPosition,
    lowLabelPosition,
    ohlcItems,
    priceAxisTickLabels,
    selectedRange,
  } = useChartPanel({ stock });

  return (
    <section className="cs-data-panel flex h-130 min-w-0 flex-col px-5 py-5 md:px-7 md:py-6">
      <RangeToolbar
        selectedRange={selectedRange}
        onRangeChange={handleRangeChange}
      />

      <OhlcSummary currencyCode={stock.currencyCode} items={ohlcItems} />

      <div className="relative min-h-0 flex-1">
        <div ref={chartContainerRef} className="h-full w-full" />

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

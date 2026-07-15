import { useEffect, useMemo, useRef, useState } from "react";
import { CandlestickSeries, createChart } from "lightweight-charts";
import type {
  IChartApi,
  IPriceLine,
  IRange,
  ISeriesApi,
  Time,
} from "lightweight-charts";
import { useStockCandlesQuery } from "../../../../apis/stocks/queries";
import { getCandlesForRange } from "./chart-candles";
import { createCrosshairMoveHandler } from "./chart-crosshair";
import { getOhlcItems } from "./chart-format";
import { convertCurrencyValue } from "../../../../utils/stock/stock-detail";
import {
  getCandlestickSeriesOptions,
  getChartOptions,
  getCurrentPriceLineOptions,
} from "./chart-options";
import { createChartOverlayUpdaters } from "./chart-overlay-updaters";
import type {
  AxisTickLabel,
  CandleRange,
  ChartCandleData,
  CrosshairDateLabel,
  CrosshairPriceLabel,
  CurrentPriceLabel,
  HighLowLabel,
  PriceAxisTickLabel,
} from "./types";
import type {
  StockCurrencyCode,
  StockOnlyProps,
} from "../../../../types/stock/stock-detail";

function getInitialDailyChartCandles({ stock }: StockOnlyProps) {
  return stock.candles.map((candle) => ({
    time: new Date(candle.timestamp).toISOString().slice(0, 10),
    open: candle.openPrice,
    high: candle.highPrice,
    low: candle.lowPrice,
    close: candle.closePrice,
    volume: candle.volume,
  }));
}

export function useChartPanel({ stock }: StockOnlyProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
  const currentPriceLineRef = useRef<IPriceLine | null>(null);
  const scheduleOverlayLabelUpdateRef = useRef<() => void>(() => {});

  const [selectedRange, setSelectedRange] = useState<CandleRange>("daily");
  const [highLabelPosition, setHighLabelPosition] =
    useState<HighLowLabel | null>(null);
  const [lowLabelPosition, setLowLabelPosition] = useState<HighLowLabel | null>(
    null,
  );
  const [hoveredCandle, setHoveredCandle] = useState<ChartCandleData | null>(
    null,
  );
  const [crosshairDateLabel, setCrosshairDateLabel] =
    useState<CrosshairDateLabel | null>(null);
  const [crosshairPriceLabel, setCrosshairPriceLabel] =
    useState<CrosshairPriceLabel | null>(null);
  const [currentPriceLabel, setCurrentPriceLabel] =
    useState<CurrentPriceLabel | null>(null);
  const [axisTickLabels, setAxisTickLabels] = useState<AxisTickLabel[]>([]);
  const [priceAxisTickLabels, setPriceAxisTickLabels] = useState<
    PriceAxisTickLabel[]
  >([]);

  const selectedInterval = useMemo(() => {
    if (selectedRange === "weekly") {
      return "WEEK";
    }

    if (selectedRange === "monthly") {
      return "MONTH";
    }

    return "DAY";
  }, [selectedRange]);

  const initialDailyChartCandles = useMemo(
    () => getInitialDailyChartCandles({ stock }),
    [stock],
  );

  const initialChartCandles = useMemo(
    () => getCandlesForRange(initialDailyChartCandles, selectedRange),
    [initialDailyChartCandles, selectedRange],
  );

  const { data: rawChartCandles = [] } = useStockCandlesQuery(
    stock.id,
    selectedInterval,
    {
      initialData:
        selectedInterval === "DAY" ? initialDailyChartCandles : undefined,
      placeholderData:
        selectedInterval === "DAY" ? undefined : initialChartCandles,
    },
  );

  const chartCandles = useMemo(() => {
    const sourceCurrencyCode: StockCurrencyCode =
      stock.countryCode === "US" ? "USD" : "KRW";

    return rawChartCandles.map((candle) => ({
      ...candle,
      open: convertCurrencyValue(
        candle.open,
        sourceCurrencyCode,
        stock.currencyCode,
      ),
      high: convertCurrencyValue(
        candle.high,
        sourceCurrencyCode,
        stock.currencyCode,
      ),
      low: convertCurrencyValue(
        candle.low,
        sourceCurrencyCode,
        stock.currencyCode,
      ),
      close: convertCurrencyValue(
        candle.close,
        sourceCurrencyCode,
        stock.currencyCode,
      ),
    }));
  }, [rawChartCandles, stock.countryCode, stock.currencyCode]);

  const latestCandle = chartCandles.at(-1);
  const displayCandle = hoveredCandle ?? latestCandle;
  const displayCandleBasePrice = useMemo(() => {
    if (!displayCandle) {
      return 0;
    }

    const displayCandleIndex = chartCandles.findIndex(
      (candle) => candle.time === displayCandle.time,
    );

    return chartCandles[displayCandleIndex - 1]?.close ?? displayCandle.open;
  }, [chartCandles, displayCandle]);

  const ohlcItems = useMemo(
    () => getOhlcItems(displayCandle, displayCandleBasePrice),
    [displayCandle, displayCandleBasePrice],
  );

  const monthStartTimes = useMemo(() => {
    const monthStarts = new Set<string>();

    chartCandles.forEach((candle, index) => {
      const previousCandle = chartCandles[index - 1];

      if (
        !previousCandle ||
        previousCandle.time.slice(0, 7) !== candle.time.slice(0, 7)
      ) {
        monthStarts.add(candle.time);
      }
    });

    return monthStarts;
  }, [chartCandles]);

  const currentPriceLabelClassName =
    stock.changeRate > 0
      ? "bg-(--cs-color-red-500)"
      : stock.changeRate < 0
        ? "bg-(--cs-color-blue-700)"
        : "bg-zinc-500";

  const handleRangeChange = (nextRange: CandleRange) => {
    setSelectedRange(nextRange);
    setHighLabelPosition(null);
    setLowLabelPosition(null);
    setHoveredCandle(null);
    setCrosshairDateLabel(null);
    setCrosshairPriceLabel(null);
    setCurrentPriceLabel(null);
    setAxisTickLabels([]);
    setPriceAxisTickLabels([]);
  };

  useEffect(() => {
    const chartContainer = chartContainerRef.current;

    if (!chartContainer) {
      return;
    }

    const chart = createChart(chartContainer, getChartOptions(chartContainer));
    const candleSeries = chart.addSeries(
      CandlestickSeries,
      getCandlestickSeriesOptions(stock.currencyCode),
    );

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
      });
      scheduleOverlayLabelUpdateRef.current();
    });

    resizeObserver.observe(chartContainer);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      currentPriceLineRef.current = null;
      scheduleOverlayLabelUpdateRef.current = () => {};
    };
  }, [stock.currencyCode]);

  useEffect(() => {
    const chartContainer = chartContainerRef.current;
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    if (
      !chartContainer ||
      !chart ||
      !candleSeries ||
      chartCandles.length === 0
    ) {
      return;
    }

    candleSeries.setData(chartCandles);

    if (currentPriceLineRef.current) {
      candleSeries.removePriceLine(currentPriceLineRef.current);
    }

    currentPriceLineRef.current = candleSeries.createPriceLine(
      getCurrentPriceLineOptions(stock.currentPrice),
    );

    const {
      updateAxisTickLabels,
      updateCurrentPriceLabel,
      updateHighLowLabels,
      updatePriceAxisTickLabels,
    } = createChartOverlayUpdaters({
      candleSeries,
      chart,
      chartCandles,
      chartContainer,
      monthStartTimes,
      selectedRange,
      setAxisTickLabels,
      setCurrentPriceLabel,
      setHighLabelPosition,
      setLowLabelPosition,
      setPriceAxisTickLabels,
      stock,
    });

    const scheduleOverlayLabelUpdate = (attempt = 0) => {
      requestAnimationFrame(() => {
        const isPositioned = updateHighLowLabels();
        updateAxisTickLabels();
        updatePriceAxisTickLabels();
        updateCurrentPriceLabel();

        if (!isPositioned && attempt < 20) {
          scheduleOverlayLabelUpdate(attempt + 1);
        }
      });
    };
    scheduleOverlayLabelUpdateRef.current = scheduleOverlayLabelUpdate;

    const handleCrosshairMove = createCrosshairMoveHandler({
      candleSeries,
      chart,
      chartCandles,
      chartContainer,
      currencyCode: stock.currencyCode,
      selectedRange,
      setCrosshairDateLabel,
      setCrosshairPriceLabel,
      setHoveredCandle,
    });

    chart.timeScale().fitContent();
    scheduleOverlayLabelUpdate();

    const handleVisibleTimeRangeChange = (range: IRange<Time> | null) => {
      updateHighLowLabels(range);
    };

    const handleVisibleLogicalRangeChange = () => {
      updateAxisTickLabels();
      updatePriceAxisTickLabels();
      updateCurrentPriceLabel();
    };

    chart
      .timeScale()
      .subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);
    chart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart
        .timeScale()
        .unsubscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);
      chart
        .timeScale()
        .unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      scheduleOverlayLabelUpdateRef.current = () => {};
    };
  }, [
    chartCandles,
    monthStartTimes,
    selectedRange,
    stock,
    stock.currencyCode,
    stock.currentPrice,
  ]);

  return {
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
  };
}

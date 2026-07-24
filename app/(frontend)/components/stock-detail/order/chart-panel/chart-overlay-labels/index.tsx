import type {
  AxisTickLabel,
  CrosshairDateLabel,
  CrosshairPriceLabel,
  CurrentPriceLabel,
  HighLowLabel,
  PriceAxisTickLabel,
} from "../types";

type ChartOverlayLabelsProps = {
  axisTickLabels: AxisTickLabel[];
  crosshairDateLabel: CrosshairDateLabel | null;
  crosshairPriceLabel: CrosshairPriceLabel | null;
  currentPriceLabel: CurrentPriceLabel | null;
  currentPriceLabelClassName: string;
  highLabelPosition: HighLowLabel | null;
  lowLabelPosition: HighLowLabel | null;
  priceAxisTickLabels: PriceAxisTickLabel[];
};

export function ChartOverlayLabels({
  axisTickLabels,
  crosshairDateLabel,
  crosshairPriceLabel,
  currentPriceLabel,
  currentPriceLabelClassName,
  highLabelPosition,
  lowLabelPosition,
  priceAxisTickLabels,
}: ChartOverlayLabelsProps) {
  return (
    <>
      {highLabelPosition && (
        <span
          className="pointer-events-none absolute z-10 text-xs font-medium whitespace-nowrap text-(--cs-color-red-500)"
          style={{
            left: highLabelPosition.left,
            top: highLabelPosition.top,
          }}
        >
          {highLabelPosition.text}
        </span>
      )}

      {lowLabelPosition && (
        <span
          className="pointer-events-none absolute z-10 text-xs font-medium whitespace-nowrap text-(--cs-color-blue-700)"
          style={{
            left: lowLabelPosition.left,
            top: lowLabelPosition.top,
          }}
        >
          {lowLabelPosition.text}
        </span>
      )}

      {crosshairDateLabel && (
        <span
          className="pointer-events-none absolute bottom-8 z-10 rounded-sm bg-(--cs-color-green-100) px-2 py-1 text-sm text-black"
          style={{
            left: crosshairDateLabel.left,
          }}
        >
          {crosshairDateLabel.text}
        </span>
      )}

      {crosshairPriceLabel && (
        <span
          className="pointer-events-none absolute right-0 z-30 rounded-sm bg-(--cs-color-green-100) px-2 py-1 text-sm text-black"
          style={{
            top: crosshairPriceLabel.top,
          }}
        >
          {crosshairPriceLabel.text}
        </span>
      )}

      {currentPriceLabel && (
        <span
          className={`pointer-events-none absolute right-0 z-20 rounded-sm px-2 py-1 text-sm text-white ${currentPriceLabelClassName}`}
          style={{
            top: currentPriceLabel.top,
          }}
        >
          {currentPriceLabel.text}
        </span>
      )}

      {priceAxisTickLabels.map((label) => (
        <span
          key={`${label.text}-${label.top}`}
          className="pointer-events-none absolute right-0 z-10 bg-(--cs-surface-raised) px-1 text-sm font-normal text-(--cs-text-muted)"
          style={{
            top: label.top,
          }}
        >
          {label.text}
        </span>
      ))}

      {axisTickLabels.map((label) => (
        <span
          key={`${label.text}-${label.left}`}
          className={`pointer-events-none absolute bottom-0 z-10 bg-(--cs-surface-raised) px-1 text-sm text-(--cs-text-muted) ${
            label.isMonth ? "font-semibold" : "font-normal"
          }`}
          style={{
            left: label.left,
          }}
        >
          {label.text}
        </span>
      ))}
    </>
  );
}

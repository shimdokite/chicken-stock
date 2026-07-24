import SegmentedControl from "../../../ui/segmented-control";

type StockListControlsProps = {
  selectedMarket: string;
  selectedRanking: string;
  selectedPeriod: string;
  onMarketChange: (value: string) => void;
  onRankingChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
};

const marketOptions = [
  { label: "전체", value: "all" },
  { label: "국내", value: "domestic" },
  { label: "해외", value: "global" },
];

const rankingOptions = [
  { label: "거래대금", value: "tradingAmount" },
  { label: "거래량", value: "tradingVolume" },
];

const periodOptions = [
  { label: "실시간", value: "live" },
  { label: "1일", value: "1d" },
  { label: "1주일", value: "1w" },
  { label: "1개월", value: "1m" },
  { label: "3개월", value: "3m" },
  { label: "6개월", value: "6m" },
  { label: "1년", value: "1y" },
];

export default function StockListControls({
  selectedMarket,
  selectedRanking,
  selectedPeriod,
  onMarketChange,
  onRankingChange,
  onPeriodChange,
}: StockListControlsProps) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-3 md:w-auto md:gap-5">
      <SegmentedControl
        aria-label="시장 선택"
        onValueChange={onMarketChange}
        value={selectedMarket}
      >
        {marketOptions.map((option) => (
          <SegmentedControl.Item key={option.value} value={option.value}>
            {option.label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl>

      <SegmentedControl
        aria-label="랭킹 기준"
        onValueChange={onRankingChange}
        value={selectedRanking}
      >
        {rankingOptions.map((option) => (
          <SegmentedControl.Item key={option.value} value={option.value}>
            {option.label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl>

      <SegmentedControl
        aria-label="기간 선택"
        className="scrollbar-hide w-full max-w-full overflow-x-auto md:w-auto"
        onValueChange={onPeriodChange}
        value={selectedPeriod}
      >
        {periodOptions.map((option) => (
          <SegmentedControl.Item
            key={option.value}
            className="shrink-0 whitespace-nowrap"
            value={option.value}
          >
            {option.label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl>
    </div>
  );
}

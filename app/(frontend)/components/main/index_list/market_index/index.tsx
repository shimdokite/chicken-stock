export type MarketIndexTrend = "up" | "down";

export type MarketIndexData = {
  name: string;
  value: string;
  changeValue: string;
  changeRate: string;
  trend: MarketIndexTrend;
};

type MarketIndexProps = {
  marketIndex: MarketIndexData;
};

// TODO: 추후 실제 데이터로 변경 예정
const upDummyChartPoints =
  "0,30 10,20 20,23 30,18 40,21 50,14 60,16 70,12 80,15 90,8 100,10 110,5";
const downDummyChartPoints =
  "0,6 10,10 20,8 30,14 40,16 50,22 60,20 70,27 80,25 90,32 100,35 110,42";

function getTrendTextColor(trend: MarketIndexTrend) {
  if (trend === "up") {
    return "text-red-600";
  }

  return "text-indigo-500";
}

function getTrendStrokeColor(trend: MarketIndexTrend) {
  if (trend === "up") {
    return "#ef4444";
  }

  return "#60a5fa";
}

function getDummyChartPoints(trend: MarketIndexTrend) {
  if (trend === "up") {
    return upDummyChartPoints;
  }

  return downDummyChartPoints;
}

// TODO: 추후 라이브러리로 변경할 예정
function DummyMarketIndexChart({ trend }: { trend: MarketIndexTrend }) {
  const chartPoints = getDummyChartPoints(trend);
  const chartAreaPoints = `${chartPoints} 110,48 0,48`;
  const strokeColor = getTrendStrokeColor(trend);

  return (
    <div className="h-12 w-20 shrink-0 overflow-hidden" aria-hidden="true">
      <svg
        className="h-full w-full"
        viewBox="0 0 110 48"
        preserveAspectRatio="none"
      >
        <polygon fill={strokeColor} opacity="0.16" points={chartAreaPoints} />
        <polyline
          fill="none"
          points={chartPoints}
          stroke={strokeColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export default function MarketIndex({ marketIndex }: MarketIndexProps) {
  const trendTextColor = getTrendTextColor(marketIndex.trend);

  return (
    <article className="flex items-center gap-3">
      <DummyMarketIndexChart trend={marketIndex.trend} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-xl tracking-normal text-zinc-950 md:text-xl">
          {marketIndex.name}
        </h3>

        <p className="mt-1 text-lg tracking-normal text-zinc-950 md:text-xl">
          {marketIndex.value}
          <span className={`ml-2 ${trendTextColor}`}>
            {marketIndex.changeValue}({marketIndex.changeRate})
          </span>
        </p>
      </div>
    </article>
  );
}

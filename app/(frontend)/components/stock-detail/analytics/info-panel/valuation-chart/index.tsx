"use client";

import type { ChartDatum, ValuationMetricTab } from "../types";

type ValuationChartProps = {
  data: ChartDatum[];
  industryLabel: string;
  metric: ValuationMetricTab;
};

type BarSpec = {
  key: "stockValue" | "industryValue";
  label: string;
  className: string;
};

export default function ValuationChart({
  data,
  industryLabel,
  metric,
}: ValuationChartProps) {
  const bars: BarSpec[] = [
    {
      key: "stockValue",
      label: "조회종목",
      className: "bg-[#e989dc] ring-2 ring-[#d65ccd]",
    },
    {
      key: "industryValue",
      label: industryLabel,
      className: "bg-[#bdf5e5] ring-2 ring-[#75e5ca]",
    },
  ];

  const values = data.flatMap((item) =>
    bars
      .map((bar) => item[bar.key])
      .filter((value): value is number => value !== undefined),
  );

  const maxValue = Math.max(...values, 1);
  const hasData = values.length > 0;

  return (
    <div className="w-full min-w-0">
      <div className="relative h-48 px-4 pb-7">
        {hasData && (
          <>
            <div className="pointer-events-none absolute inset-x-4 top-0 bottom-7 grid grid-cols-4 border-l border-zinc-200">
              <span className="border-r border-zinc-200" />
              <span className="border-r border-zinc-200" />
              <span className="border-r border-zinc-200" />
              <span className="border-r border-zinc-200" />
            </div>

            <div className="relative z-10 grid h-full grid-cols-2 gap-8">
              {data.map((item) => (
                <div
                  className="grid min-w-0 grid-rows-[1fr_auto] gap-1"
                  key={item.label}
                >
                  <div className="flex items-end justify-center gap-5 border-b border-zinc-200">
                    {bars.map((bar) => {
                      const value = item[bar.key];
                      const height =
                        value === undefined
                          ? 0
                          : Math.max((value / maxValue) * 100, 4);

                      return (
                        <span
                          aria-label={`${item.label} ${bar.label} ${metric}`}
                          className={`w-8 rounded-t-sm ${bar.className}`}
                          key={bar.key}
                          style={{ height: `${height}%` }}
                          title={
                            value === undefined
                              ? `${bar.label}: 데이터 없음`
                              : `${bar.label}: ${value.toFixed(2)}배`
                          }
                        />
                      );
                    })}
                  </div>

                  <span className="truncate text-center text-xs text-zinc-500">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {!hasData && (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">
            표시할 가치평가 데이터가 없습니다.
          </div>
        )}
      </div>

      <div className="mx-auto mt-5 flex w-full max-w-96 items-center justify-center gap-6 rounded-2xl bg-zinc-100 px-4 py-4 text-sm font-semibold">
        <span className="flex items-center gap-2">
          <span className="size-3 bg-[#e989dc]" />
          조회종목
        </span>

        <span className="h-5 w-px bg-zinc-900" />

        <span className="flex items-center gap-2">
          <span className="size-3 bg-[#bdf5e5]" />
          {industryLabel}
        </span>
      </div>
    </div>
  );
}

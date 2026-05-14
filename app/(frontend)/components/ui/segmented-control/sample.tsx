"use client";

import { useState } from "react";
import SegmentedControl from ".";

const marketOptions = [
  { label: "전체", value: "all" },
  { label: "국내", value: "domestic" },
  { label: "해외", value: "global" },
];

const chartOptions = [
  { label: "거래대금", value: "amount" },
  { label: "거래량", value: "volume" },
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

const orderOptions = [
  {
    label: "구매",
    value: "buy",
    className: "w-20",
    selected: "text-red-500",
  },
  {
    label: "판매",
    value: "sell",
    className: "w-20",
    selected: "text-blue-500",
  },
  {
    label: "대기",
    value: "wait",
    className: "w-20",
    selected: "text-green-500",
  },
];

const priceTypeOptions = [
  { label: "지정가", value: "limit" },
  { label: "시장가", value: "market" },
];

const graphPeriodOptions = [
  { label: "일", value: "day" },
  { label: "주", value: "week" },
  { label: "월", value: "month" },
  { label: "년", value: "year" },
];

export default function SegmentedControlSample() {
  const [orderType, setOrderType] = useState("buy");
  const [graphPeriod, setGraphPeriod] = useState("day");

  return (
    <main className="min-h-screen bg-white px-10 py-9 font-sans text-zinc-950">
      <section className="grid gap-20 py-8">
        <div>
          <h2 className="mb-6 border-b-2 border-dashed border-zinc-950 pb-5 text-4xl font-semibold tracking-normal">
            Segmented Control
          </h2>

          <h3 className="mb-6 text-4xl font-semibold tracking-normal">메인</h3>

          <div className="mb-20 flex flex-wrap items-center gap-6">
            <SegmentedControl aria-label="시장 선택" defaultValue="all">
              {marketOptions.map((option) => (
                <SegmentedControl.Item key={option.value} value={option.value}>
                  {option.label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl>

            <SegmentedControl aria-label="차트 기준" defaultValue="amount">
              {chartOptions.map((option) => (
                <SegmentedControl.Item key={option.value} value={option.value}>
                  {option.label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl>

            <SegmentedControl aria-label="기간 선택" defaultValue="live">
              {periodOptions.map((option) => (
                <SegmentedControl.Item key={option.value} value={option.value}>
                  {option.label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl>
          </div>

          <h3 className="mb-6 text-4xl font-semibold tracking-normal">
            종목 상세
          </h3>

          <div className="flex flex-wrap items-center gap-5">
            <SegmentedControl
              aria-label="통화 선택"
              defaultValue="krw"
              style="text"
            >
              <SegmentedControl.Item value="usd">달러</SegmentedControl.Item>
              <SegmentedControl.Item value="krw">원</SegmentedControl.Item>
            </SegmentedControl>

            <SegmentedControl
              aria-label="주문 유형"
              onValueChange={setOrderType}
              value={orderType}
            >
              {orderOptions.map((option) => (
                <SegmentedControl.Item
                  className={option.className}
                  key={option.value}
                  selected={option.selected}
                  value={option.value}
                >
                  {option.label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl>

            <SegmentedControl aria-label="가격 유형" defaultValue="limit">
              {priceTypeOptions.map((option) => (
                <SegmentedControl.Item key={option.value} value={option.value}>
                  {option.label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl>
          </div>

          <div className="mt-8 ml-28">
            <SegmentedControl
              aria-label="그래프 기간"
              onValueChange={setGraphPeriod}
              style="invertedPanel"
              value={graphPeriod}
            >
              {graphPeriodOptions.map((option) => (
                <SegmentedControl.Item key={option.value} value={option.value}>
                  {option.label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl>
          </div>
        </div>
      </section>
    </main>
  );
}

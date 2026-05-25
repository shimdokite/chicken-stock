"use client";

import { useState } from "react";
import { useStocksQuery } from "../../../apis/stocks/queries";
import StockListControls from "./stock-list-controls";
import StockListTable from "./stock-list-table";

export default function StockList() {
  const [selectedMarket, setSelectedMarket] = useState("all");
  const [selectedRanking, setSelectedRanking] = useState("tradingAmount");
  const [selectedPeriod, setSelectedPeriod] = useState("live");
  const { data: stocks = [] } = useStocksQuery(selectedMarket, selectedRanking);

  return (
    <section className="w-full bg-white py-8 text-zinc-950">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-normal">실시간 차트</h2>

        <StockListControls
          selectedMarket={selectedMarket}
          selectedPeriod={selectedPeriod}
          selectedRanking={selectedRanking}
          onMarketChange={setSelectedMarket}
          onPeriodChange={setSelectedPeriod}
          onRankingChange={setSelectedRanking}
        />
      </div>

      <StockListTable
        selectedRanking={selectedRanking}
        stocks={stocks}
      />
    </section>
  );
}

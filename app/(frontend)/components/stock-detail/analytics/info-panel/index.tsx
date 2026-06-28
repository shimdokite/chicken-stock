"use client";

import { useCallback, useRef, useState } from "react";
import { useStockAnalyticsQuery } from "../../../../apis/stocks/queries";
import { Tab } from "../../../ui";
import EarningsSection from "./earnings-section";
import FinancialSection from "./financial-section";
import ValuationSection from "./valuation-section";
import { sectionLabels } from "./helpers";
import type { InfoSection } from "./types";
import type {
  StockAnalyticsData,
  StockOnlyProps,
} from "../../../../types/stock/stock-detail";

const sections: InfoSection[] = ["financial", "earnings", "valuation"];

export default function InfoPanel({ stock }: StockOnlyProps) {
  const initialAnalyticsData: StockAnalyticsData = {
    earnings: stock.earnings,
    financialMetric: stock.financialMetric,
    financialStatements: stock.financialStatements,
    themeFinancialMetric: stock.themeFinancialMetric,
    valuationMetric: stock.valuationMetric,
  };
  const { data: analyticsData, error, isPending } = useStockAnalyticsQuery(
    stock.id,
    initialAnalyticsData,
  );
  const [activeSection, setActiveSection] = useState<InfoSection>("financial");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<InfoSection, HTMLElement | null>>({
    financial: null,
    earnings: null,
    valuation: null,
  });

  const handleSectionChange = useCallback((section: string) => {
    const nextSection = section as InfoSection;
    const scrollContainer = scrollContainerRef.current;
    const sectionElement = sectionRefs.current[nextSection];

    setActiveSection(nextSection);

    if (!scrollContainer || !sectionElement) {
      return;
    }

    scrollContainer.scrollTo({
      top:
        sectionElement.getBoundingClientRect().top -
        scrollContainer.getBoundingClientRect().top +
        scrollContainer.scrollTop,
      behavior: "smooth",
    });
  }, []);

  const handleScroll = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const isScrolledToBottom =
      scrollContainer.scrollTop + scrollContainer.clientHeight >=
      scrollContainer.scrollHeight - 2;

    if (isScrolledToBottom) {
      setActiveSection("valuation");
      return;
    }

    const containerTop = scrollContainer.getBoundingClientRect().top;
    const nextSection =
      sections.findLast((section) => {
        const sectionElement = sectionRefs.current[section];

        if (!sectionElement) {
          return false;
        }

        return sectionElement.getBoundingClientRect().top - containerTop <= 80;
      }) ?? "financial";

    setActiveSection((current) =>
      current === nextSection ? current : nextSection,
    );
  }, []);
  const displayStock = analyticsData ? { ...stock, ...analyticsData } : stock;
  const hasAnalyticsData =
    displayStock.financialStatements.length > 0 ||
    displayStock.earnings.length > 0 ||
    displayStock.financialMetric !== null;

  const panelContent = (() => {
    if (!hasAnalyticsData && isPending) {
      return (
        <div className="grid h-full place-items-center text-sm text-zinc-500">
          주요 정보를 불러오는 중입니다.
        </div>
      );
    }

    if (!hasAnalyticsData && error) {
      return (
        <div className="grid h-full place-items-center text-sm text-zinc-500">
          주요 정보를 불러오지 못했습니다.
        </div>
      );
    }

    return (
      <>
        <section
          ref={(element) => {
            sectionRefs.current.financial = element;
          }}
          className="pb-20"
        >
          <FinancialSection stock={displayStock} />
        </section>

        <section
          ref={(element) => {
            sectionRefs.current.earnings = element;
          }}
          className="pb-20"
        >
          <EarningsSection stock={displayStock} />
        </section>

        <section
          ref={(element) => {
            sectionRefs.current.valuation = element;
          }}
        >
          <ValuationSection stock={displayStock} />
        </section>
      </>
    );
  })();

  return (
    <section className="grid h-130 grid-cols-[10rem_minmax(0,1fr)] rounded-3xl bg-white px-7 py-6 shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
      <aside>
        <h2 className="mb-6 text-xl font-semibold tracking-normal">
          주요 정보
        </h2>

        <Tab.Root
          className="gap-4 bg-transparent p-0 pr-10 text-2xl"
          direction="col"
          type="underline"
          value={activeSection}
          onValueChange={handleSectionChange}
        >
          {sections.map((section) => (
            <Tab.Item
              key={section}
              value={section}
              className="rounded-none px-0 py-1"
              activeClassName="font-semibold"
              inactiveClassName="border-transparent"
            >
              {sectionLabels[section]}
            </Tab.Item>
          ))}
        </Tab.Root>
      </aside>

      <div
        ref={scrollContainerRef}
        className="scrollbar-thin [scrollbar-color:#d4d4d8_transparent] overflow-y-auto pr-5"
        tabIndex={0}
        onScroll={handleScroll}
      >
        {panelContent}
      </div>
    </section>
  );
}

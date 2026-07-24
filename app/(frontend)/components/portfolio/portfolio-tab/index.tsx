"use client";

import { Tab } from "@/app/(frontend)/components/ui";
import { PORTFOLIO_TAB } from "@/app/(frontend)/constants/portfolio";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import { toast } from "sonner";

export default function PortfolioTab() {
  const { selectedTab, setSelectedTab } = usePortfolioStore();

  return (
    <Tab.Root
      defaultValue={selectedTab}
      direction="row"
      type="fill"
      className="w-full overflow-x-auto rounded-none bg-transparent p-0"
    >
      {PORTFOLIO_TAB.map((tab) => (
        <Tab.Item
          key={tab}
          className="shrink-0 rounded-none px-4 py-3 text-base font-semibold md:px-6 md:text-lg"
          activeClassName="bg-transparent text-[#df2b2e]"
          value={tab}
          onClick={() => {
            if (tab === "예상 배당금") {
              return toast.warning("준비 중입니다.");
            }

            setSelectedTab(tab);
          }}
        >
          {tab}
        </Tab.Item>
      ))}
    </Tab.Root>
  );
}

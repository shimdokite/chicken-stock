import type { PortfolioResponse } from "@/app/(frontend)/apis/portfolio/api";
import AccountData from "./account-data";
import BalanceData from "./balance-data";

type DefaultAccountProps = {
  initialPortfolio?: PortfolioResponse;
};

export default function DefaultAccount({
  initialPortfolio,
}: DefaultAccountProps) {
  return (
    <div className="col gap-5">
      <AccountData initialPortfolio={initialPortfolio} />
      <BalanceData initialPortfolio={initialPortfolio} />
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { getPortfolio, type GetPortfolioParams } from "./api";

export const portfolioQueryKeys = {
  myPortfolio: ["portfolio", "my-portfolio"],
  myPortfolioWithParams: (params?: GetPortfolioParams) => [
    ...portfolioQueryKeys.myPortfolio,
    params?.incomeYear ?? null,
    params?.incomeMonth ?? null,
  ],
} as const;

const PORTFOLIO_REFETCH_INTERVAL_MS = 10_000;

export function useGetPortfolio(params?: GetPortfolioParams) {
  return useQuery({
    queryFn: () => getPortfolio(params),
    queryKey: portfolioQueryKeys.myPortfolioWithParams(params),
    refetchInterval: PORTFOLIO_REFETCH_INTERVAL_MS,
  });
}

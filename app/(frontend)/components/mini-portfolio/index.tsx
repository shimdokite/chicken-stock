"use client";

import { useGetMyInfo } from "@/app/(frontend)/apis/auth/queries";
import MiniPortfolioPanel from "./mini-portfolio-panel";

export default function MiniPortfolio() {
  const { data, isPending } = useGetMyInfo();

  if (isPending || !data?.isLoggedIn || !data.user.investmentType) {
    return null;
  }

  return <MiniPortfolioPanel />;
}

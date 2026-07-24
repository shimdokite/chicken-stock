import { formatSignedWon } from "@/app/(frontend)/utils/portfolio/income-analysis";

interface SaleProfitTotalProps {
  totalSaleProfit: number | null;
}

export default function SaleProfitTotal({
  totalSaleProfit,
}: SaleProfitTotalProps) {
  return (
    <p className="rounded-2xl bg-white p-6 text-xl md:p-8">
      총 판매수익 {formatSignedWon(totalSaleProfit)}
    </p>
  );
}

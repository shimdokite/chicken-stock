import { notFound } from "next/navigation";
import { getStockDetailData } from "../page-data";
import StockDetail from "@/app/(frontend)/components/stock-detail";

export const revalidate = 10;

type StockAnalyticsPageProps = {
  params: Promise<{
    stockId: string;
  }>;
};

export default async function StockAnalyticsPage({
  params,
}: StockAnalyticsPageProps) {
  const { stockId } = await params;
  const parsedStockId = Number(stockId);

  if (!Number.isInteger(parsedStockId) || parsedStockId <= 0) notFound();

  const stock = await getStockDetailData(parsedStockId);

  if (!stock) notFound();

  return <StockDetail activeTab="portfolio-info" stock={stock} />;
}

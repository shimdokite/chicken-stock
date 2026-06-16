import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCachedStockPageShellData } from "./page-data";

const SITE_URL = "https://chicken-stock-app.vercel.app";
const SITE_NAME = "Chicken Stock";
const OG_IMAGE_PATH = "/og-image?v=20260616-logo";

type StockDetailRouteProps = {
  params: Promise<{
    stockId: string;
  }>;
};

type StockDetailLayoutProps = StockDetailRouteProps & {
  children: ReactNode;
};

function parseStockId(value: string) {
  const stockId = Number(value);

  return Number.isInteger(stockId) && stockId > 0 ? stockId : null;
}

function getStockDetailSeo(stockName: string, stockId: number) {
  const title = `${stockName} 주가, 차트, 호가, 투자지표 | Chicken Stock`;
  const description = `${stockName}의 현재가, 차트, 호가, PER, PBR, 시가총액 등 주요 투자 정보를 확인하고 Chicken Stock의 모의 투자 화면에서 종목 흐름을 살펴보세요.`;
  const url = new URL(`/stock/${stockId}/order`, SITE_URL).toString();

  return {
    description,
    title,
    url,
  };
}

async function getStockDetailSeoData(stockIdParam: string) {
  const stockId = parseStockId(stockIdParam);

  if (!stockId) {
    notFound();
  }

  const stock = await getCachedStockPageShellData(stockId);

  if (!stock) {
    notFound();
  }

  return {
    stock,
    ...getStockDetailSeo(stock.name, stock.id),
  };
}

export async function generateMetadata({
  params,
}: StockDetailRouteProps): Promise<Metadata> {
  const { stockId } = await params;
  const { description, title, url } = await getStockDetailSeoData(stockId);

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} 대표 이미지`,
        },
      ],
    },
  };
}

export default async function StockDetailLayout({
  children,
  params,
}: StockDetailLayoutProps) {
  const { stockId } = await params;
  const { description, stock, title, url } =
    await getStockDetailSeoData(stockId);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url,
    description,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
    },
    about: {
      "@type": "FinancialProduct",
      name: stock.name,
      description: `${stock.name} 종목 상세 정보`,
      url,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
      {children}
    </>
  );
}

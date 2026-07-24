import type { Metadata } from "next";

import { getCachedMarketIndexViews } from "../../(backend)/lib/market-indices";
import {
  DEFAULT_STOCKS_PAGE,
  STOCKS_PAGE_SIZE,
  getCachedStocksPage,
} from "../../(backend)/lib/stocks";
import EduProgress from "../components/main/edu-progress";
import IndexList from "../components/main/index_list";
import StockList from "../components/main/stock_list";

const SITE_URL = "https://chicken-stock.com/";
const SITE_NAME = "Chicken Stock";
const HOME_TITLE = "Chicken Stock - 가상 주식 투자 학습 플랫폼";
const HOME_DESCRIPTION =
  "Chicken Stock은 모의 투자, 투자 퀴즈, 학습 콘텐츠를 통해 주식 투자를 연습하고 경험할 수 있는 가상 주식 투자 플랫폼입니다.";
const OG_IMAGE_PATH = "/og-image?v=20260616-logo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: HOME_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: HOME_DESCRIPTION,
};

export default async function Home() {
  const [initialIndices, initialStocksPage] = await Promise.all([
    getCachedMarketIndexViews(),
    getCachedStocksPage({
      limit: STOCKS_PAGE_SIZE,
      market: "all",
      page: DEFAULT_STOCKS_PAGE,
      ranking: "tradingAmount",
    }),
  ]);

  return (
    <main className="min-h-[calc(100dvh-74px)] bg-[#f8f8f9] py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd),
        }}
      />

      <div className="cs-page-shell">
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:items-stretch">
          <IndexList initialIndices={initialIndices} />
          <EduProgress />
        </div>

        <StockList initialStocksPage={initialStocksPage} />
      </div>
    </main>
  );
}

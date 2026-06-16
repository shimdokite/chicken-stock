import type { Metadata } from "next";
import { Suspense } from "react";
import EduContent from "../../components/edu/edu-content";
import EduPageFallback from "../../components/edu/edu-page-fallback";
import { createCanonicalUrl, createPageMetadata, SITE_NAME } from "./seo";

const title = "주식 투자 학습 | Chicken Stock";
const description =
  "Chicken Stock에서 주식 기초 개념, 투자 지표, 시장 이해를 위한 학습 콘텐츠를 단계별로 확인해보세요.";
const url = createCanonicalUrl("/edu");

export const metadata: Metadata = createPageMetadata({
  title,
  description,
  url,
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: title,
  url,
  description:
    "주식 기초 개념, 투자 지표, 시장 이해를 위한 학습 콘텐츠를 단계별로 확인할 수 있는 페이지입니다.",
  isPartOf: {
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${new URL(url).origin}/`,
  },
};

export default function Edu() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
      <Suspense fallback={<EduPageFallback />}>
        <EduContent />
      </Suspense>
    </>
  );
}

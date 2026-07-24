import type { Metadata } from "next";
import { getCachedEducationArticle } from "@/app/(backend)/lib/education";
import { parseArticleContent } from "../../utils/edu/article-content";
import { isPositiveIntegerString } from "../../utils/number";

export const SITE_URL = "https://chicken-stock.com";
export const SITE_NAME = "Chicken Stock";
export const OG_IMAGE_PATH = "/og-image?v=20260616-logo";

export function createCanonicalUrl(pathname: string, query?: URLSearchParams) {
  const url = new URL(pathname, SITE_URL);

  query?.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

export function createPageMetadata({
  description,
  ogType = "website",
  robots,
  title,
  url,
}: {
  description: string;
  ogType?: "article" | "website";
  robots?: Metadata["robots"];
  title: string;
  url: string;
}): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: ogType,
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
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
    robots,
  };
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getPlainArticleText(content: string) {
  return normalizeWhitespace(
    parseArticleContent(content)
      .filter((block) => block.type !== "divider")
      .flatMap((block) => {
        if (block.type === "list") {
          return block.items;
        }

        if (block.type === "table") {
          return [...block.headers, ...block.rows.flat()];
        }

        return block.text;
      })
      .join(" "),
  );
}

export function createArticleDescription(title: string, content?: string) {
  const plainText = content ? getPlainArticleText(content) : "";

  if (plainText.length >= 40) {
    return plainText.length > 120 ? `${plainText.slice(0, 117)}...` : plainText;
  }

  return `${title}의 핵심 개념과 투자 판단에서 활용되는 방법을 Chicken Stock 학습 콘텐츠로 확인해보세요.`;
}

export async function getArticleSeoData(articleId: string, level?: string) {
  if (
    !isPositiveIntegerString(articleId) ||
    typeof level !== "string" ||
    !isPositiveIntegerString(level)
  ) {
    return null;
  }

  const articleLevel = Number(level);
  const article = await getCachedEducationArticle(
    Number(articleId),
    articleLevel,
  );

  if (!article) {
    return null;
  }

  return {
    article,
    level,
  };
}

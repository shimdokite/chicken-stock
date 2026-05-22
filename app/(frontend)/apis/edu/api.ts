export type EducationSummaryArticle = {
  id: number;
  title: string;
};

export type EducationSummary = {
  id: number;
  stage: number;
  title: string;
  summary: string[];
  articles: EducationSummaryArticle[];
};

export type EducationArticle = {
  id: number;
  educationSummaryId: number;
  title: string;
  content: string;
  imageUrl: string;
  educationSummary: {
    stage: number;
    title: string;
  };
};

type EducationSummariesResponse =
  | {
      ok: true;
      data: EducationSummary[];
    }
  | {
      ok: false;
      error: string;
    };

type EducationArticleResponse =
  | {
      ok: true;
      data: EducationArticle;
    }
  | {
      ok: false;
      error: string;
    };

export async function fetchEducationSummaries() {
  const response = await fetch("/api/edu");
  const result = (await response.json()) as EducationSummariesResponse;

  if (!response.ok || !result.ok) {
    throw new Error(
      result.ok ? "EDUCATION_CONTENT_FETCH_FAILED" : result.error,
    );
  }

  return result.data;
}

export async function fetchEducationArticle(
  articleId: string,
  level: string,
  origin: string,
) {
  const url = new URL("/api/edu", origin);
  url.searchParams.set("id", articleId);
  url.searchParams.set("level", level);

  const response = await fetch(url, { cache: "no-store" });
  const result = (await response.json()) as EducationArticleResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.ok ? "ARTICLE_FETCH_FAILED" : result.error);
  }

  return result.data;
}



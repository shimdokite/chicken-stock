import { requests } from "../request";

export type EducationSummaryArticle = {
  id: number;
  title: string;
  sortOrder: number;
  progressRate: number;
  isCompleted: boolean;
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
  sortOrder: number;
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

export async function fetchEducationSummaries(userId?: string | null) {
  const { data } = await requests.get<EducationSummariesResponse>("/api/edu", {
    params: userId ? { userId } : undefined,
  });

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function fetchEducationArticle(
  articleId: string,
  level: string,
  origin: string,
) {
  const url = new URL("/api/edu", origin);
  url.searchParams.set("id", articleId);
  url.searchParams.set("level", level);

  const { data } = await requests.get<EducationArticleResponse>(url.toString());

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}

import { useQuery } from "@tanstack/react-query";
import { fetchEducationArticle, fetchEducationSummaries } from "./api";

export const educationQueryKeys = {
  summaries: (userId?: string | null) =>
    ["educationSummaries", userId ?? null] as const,
};

export function useEducationSummariesQuery(userId?: string | null) {
  return useQuery({
    queryKey: educationQueryKeys.summaries(userId),
    queryFn: () => fetchEducationSummaries(userId),
  });
}

export async function getEducationArticle(
  articleId: string,
  level: string,
  origin: string,
) {
  try {
    return await fetchEducationArticle(articleId, level, origin);
  } catch {
    return null;
  }
}

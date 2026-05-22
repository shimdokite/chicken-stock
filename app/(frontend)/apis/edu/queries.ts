import { useQuery } from "@tanstack/react-query";
import { fetchEducationArticle, fetchEducationSummaries } from "./api";

export const educationQueryKeys = {
  summaries: ["educationSummaries"] as const,
};

export function useEducationSummariesQuery() {
  return useQuery({
    queryKey: educationQueryKeys.summaries,
    queryFn: fetchEducationSummaries,
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

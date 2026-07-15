import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

function shouldRetryQuery(failureCount: number, error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;

    if (status && status >= 400 && status < 500) {
      return false;
    }
  }

  return failureCount < 1;
}

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30,
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
        throwOnError: false,
      },
      mutations: {
        throwOnError: false,
      },
    },
  });

let client: QueryClient | null = null;

export const getQueryClient = () => {
  if (!client) {
    client = makeQueryClient();
  }
  return client;
};

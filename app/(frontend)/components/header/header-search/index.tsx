"use client";

import { IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  fetchStockSearchResults,
  type StockSearchResult,
} from "../../../apis/stocks/api";
import { useStockSearchQuery } from "../../../apis/stocks/queries";
import { Input, Popover, SearchIcon } from "../../ui";

const RECENT_SEARCHES_STORAGE_KEY = "chicken-stock:recent-searches";
const MAX_RECENT_SEARCHES = 10;
const SEARCH_DEBOUNCE_MS = 180;

function readRecentSearches() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedSearches = window.localStorage.getItem(
      RECENT_SEARCHES_STORAGE_KEY,
    );

    if (!storedSearches) {
      return [];
    }

    const parsedSearches: unknown = JSON.parse(storedSearches);

    if (!Array.isArray(parsedSearches)) {
      return [];
    }

    return parsedSearches
      .filter((search): search is string => typeof search === "string")
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]) {
  try {
    window.localStorage.setItem(
      RECENT_SEARCHES_STORAGE_KEY,
      JSON.stringify(searches),
    );
  } catch {}
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

function findBestStockMatch(stocks: StockSearchResult[], search: string) {
  const normalizedSearch = normalizeSearchValue(search);

  return (
    stocks.find(
      (stock) => normalizeSearchValue(stock.ticker) === normalizedSearch,
    ) ??
    stocks.find(
      (stock) => normalizeSearchValue(stock.name) === normalizedSearch,
    ) ??
    stocks[0] ??
    null
  );
}

function getMarketLabel(market: StockSearchResult["market"]) {
  if (market === "domestic") {
    return "국내";
  }

  return "해외";
}

export default function HeaderSearch() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [searchError, setSearchError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(-1);
  const isComposingRef = useRef(false);
  const trimmedSearchValue = searchValue.trim();
  const debouncedSearchValue = useDebouncedValue(
    trimmedSearchValue,
    SEARCH_DEBOUNCE_MS,
  );
  const { data: searchedStocksData = [], isFetching: isFetchingSearchResults } =
    useStockSearchQuery(debouncedSearchValue, searchOpen);
  const canShowSearchResults =
    trimmedSearchValue.length > 0 &&
    debouncedSearchValue === trimmedSearchValue;
  const searchedStocks = canShowSearchResults ? searchedStocksData : [];
  const isSearching =
    trimmedSearchValue.length > 0 &&
    (!canShowSearchResults || isFetchingSearchResults);
  const normalizedActiveSearchResultIndex =
    activeSearchResultIndex >= 0 &&
    activeSearchResultIndex < searchedStocks.length
      ? activeSearchResultIndex
      : -1;
  const activeSearchResult = searchedStocks[normalizedActiveSearchResultIndex];
  const activeSearchResultId = activeSearchResult
    ? `header-search-result-${activeSearchResult.id}`
    : undefined;

  const updateRecentSearches = (searches: string[]) => {
    setRecentSearches(searches);
    saveRecentSearches(searches);
  };

  const addRecentSearch = (search: string) => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      return;
    }

    const nextSearches = [
      trimmedSearch,
      ...recentSearches.filter(
        (recentSearch) => recentSearch !== trimmedSearch,
      ),
    ].slice(0, MAX_RECENT_SEARCHES);

    updateRecentSearches(nextSearches);
  };

  const removeRecentSearch = (search: string) => {
    updateRecentSearches(
      recentSearches.filter((recentSearch) => recentSearch !== search),
    );
  };

  const navigateToStock = (stock: StockSearchResult, search: string) => {
    addRecentSearch(search || stock.ticker);
    setSearchValue("");
    setSearchError("");
    setSearchOpen(false);
    router.push(`/stock/${stock.id}/order`);
  };

  const submitSearch = async (search: string) => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      setSearchError("검색어를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setSearchError("");

    try {
      const stocks = await fetchStockSearchResults(trimmedSearch, 1);
      const stock = findBestStockMatch(stocks, trimmedSearch);

      if (!stock) {
        setSearchError("일치하는 종목이 없습니다.");
        return;
      }

      navigateToStock(stock, trimmedSearch);
    } catch {
      setSearchError("검색 중 문제가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveActiveSearchResult = (direction: "previous" | "next") => {
    if (isSearching || isSubmitting || searchedStocks.length === 0) {
      return;
    }

    setActiveSearchResultIndex((currentIndex) => {
      if (currentIndex < 0) {
        return direction === "next" ? 0 : searchedStocks.length - 1;
      }

      const offset = direction === "next" ? 1 : -1;

      return (
        (currentIndex + offset + searchedStocks.length) % searchedStocks.length
      );
    });
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.nativeEvent.isComposing ||
      event.keyCode === 229 ||
      isComposingRef.current
    ) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveSearchResult(event.key === "ArrowDown" ? "next" : "previous");
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (activeSearchResult) {
      navigateToStock(activeSearchResult, event.currentTarget.value);
      return;
    }

    void submitSearch(event.currentTarget.value);
  };

  const handleSearchCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleSearchCompositionEnd = () => {
    isComposingRef.current = false;
  };

  const handleSearchValueChange = (value: string) => {
    setSearchValue(value);
    setSearchError("");
    setActiveSearchResultIndex(-1);
  };

  return (
    <Popover
      className="flex items-center"
      open={searchOpen}
      onOpenChange={setSearchOpen}
    >
      <Popover.Trigger className="relative hidden h-10 w-48 items-center rounded-xl border border-(--cs-border-subtle) bg-(--cs-surface-base) pr-3 pl-9 text-left text-sm text-(--cs-text-muted) transition hover:border-(--cs-border-strong) md:inline-flex lg:w-64">
        <SearchIcon className="absolute left-1 size-5" />
        <span className="truncate">종목, 티커를 검색해보세요.</span>
      </Popover.Trigger>

      <Popover.Content
        align="right"
        className="w-[calc(100vw-2.5rem)] max-w-162.5 rounded-xl border-(--cs-border-subtle) bg-(--cs-surface-raised) p-4 shadow-(--cs-shadow-lg)"
      >
        <Input
          aria-label="종목 검색"
          inputClassName="bg-(--cs-surface-base) placeholder:text-(--cs-text-muted)"
          size="sm"
          leftAddon={<SearchIcon className="size-4" />}
          placeholder="검색어를 입력해주세요"
          variant="pill"
          autoFocus={searchOpen}
          value={searchValue}
          aria-activedescendant={activeSearchResultId}
          aria-autocomplete="list"
          onChange={(event) =>
            handleSearchValueChange(event.currentTarget.value)
          }
          onCompositionEnd={handleSearchCompositionEnd}
          onCompositionStart={handleSearchCompositionStart}
          onKeyDown={handleSearchKeyDown}
        />

        {trimmedSearchValue ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold">검색 결과</p>
            <div
              role="listbox"
              className="flex max-h-72 flex-col overflow-y-auto"
            >
              {isSearching || isSubmitting ? (
                <p className="py-4 text-sm text-(--cs-text-muted)">
                  종목을 검색하는 중입니다.
                </p>
              ) : null}

              {!isSearching && !isSubmitting && searchedStocks.length === 0 ? (
                <p className="py-4 text-sm text-(--cs-text-muted)">
                  일치하는 종목이 없습니다.
                </p>
              ) : null}

              {!isSearching &&
                !isSubmitting &&
                searchedStocks.map((stock, index) => {
                  const isActive = index === normalizedActiveSearchResultIndex;

                  return (
                    <button
                      key={stock.id}
                      id={`header-search-result-${stock.id}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-(--cs-brand-50) ${
                        isActive ? "bg-(--cs-brand-100)" : ""
                      }`}
                      onMouseEnter={() => setActiveSearchResultIndex(index)}
                      onClick={() => navigateToStock(stock, trimmedSearchValue)}
                    >
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-(--cs-border-subtle) bg-(--cs-surface-tint) text-sm font-bold text-(--cs-brand-800)"
                        aria-hidden="true"
                      >
                        {stock.logoLabel}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-(--cs-text-strong)">
                          {stock.name}
                        </span>
                        <span className="block truncate text-xs text-(--cs-text-muted)">
                          {stock.ticker} · {getMarketLabel(stock.market)}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold">최근 검색</p>
            {recentSearches.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search) => (
                  <span
                    key={search}
                    className="inline-flex items-center rounded-lg bg-(--cs-brand-100) text-xs font-semibold text-(--cs-brand-800)"
                  >
                    <button
                      type="button"
                      className="cursor-pointer px-1.5 py-0.5"
                      onClick={() => {
                        setSearchValue(search);
                        void submitSearch(search);
                      }}
                    >
                      {search}
                    </button>
                    <button
                      type="button"
                      aria-label={`${search} 최근 검색어 삭제`}
                      className="flex size-5 cursor-pointer items-center justify-center rounded-r-lg transition hover:bg-(--cs-brand-300)"
                      onClick={() => removeRecentSearch(search)}
                    >
                      <IconX aria-hidden="true" className="size-3" stroke={2} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="py-4 text-sm text-(--cs-text-muted)">
                최근 검색어가 없습니다.
              </p>
            )}
          </div>
        )}

        {searchError ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-red-500">
            {searchError}
          </p>
        ) : null}
      </Popover.Content>
    </Popover>
  );
}

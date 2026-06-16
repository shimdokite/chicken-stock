"use client";

import { IconX } from "@tabler/icons-react";
import { type KeyboardEvent, useRef, useState } from "react";
import { Input, Popover, SearchIcon } from "../../ui";

const RECENT_SEARCHES_STORAGE_KEY = "chicken-stock:recent-searches";
const MAX_RECENT_SEARCHES = 10;

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

export default function HeaderSearch() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const isComposingRef = useRef(false);

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
    setSearchValue("");
  };

  const removeRecentSearch = (search: string) => {
    updateRecentSearches(
      recentSearches.filter((recentSearch) => recentSearch !== search),
    );
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.nativeEvent.isComposing ||
      event.keyCode === 229 ||
      isComposingRef.current
    ) {
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addRecentSearch(event.currentTarget.value);
  };

  const handleSearchCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleSearchCompositionEnd = () => {
    isComposingRef.current = false;
  };

  return (
    <Popover
      className="flex items-center"
      open={searchOpen}
      onOpenChange={setSearchOpen}
    >
      <Popover.Trigger className="relative inline-flex h-7 w-56 items-center border-b border-zinc-500 bg-transparent pr-0 pl-7 text-left text-sm text-zinc-400 transition outline-none focus:border-zinc-950">
        <SearchIcon className="absolute left-1 size-5" />
        <span className="truncate">종목, 용어를 검색해보세요.</span>
      </Popover.Trigger>

      <Popover.Content
        align="right"
        className="h-42.5 w-[calc(100vw-2.5rem)] max-w-162.5 px-3 pt-2"
      >
        <Input
          aria-label="최근 검색"
          inputClassName="bg-zinc-300 placeholder:text-zinc-400"
          size="sm"
          leftAddon={<SearchIcon className="size-4" />}
          placeholder="검색어를 입력해주세요"
          variant="pill"
          autoFocus={searchOpen}
          focusable={false}
          value={searchValue}
          onChange={(event) => setSearchValue(event.currentTarget.value)}
          onCompositionEnd={handleSearchCompositionEnd}
          onCompositionStart={handleSearchCompositionStart}
          onKeyDown={handleSearchKeyDown}
        />
        <p className="mt-4 mb-2 text-sm font-semibold">최근 검색</p>
        <div className="flex flex-wrap gap-2">
          {recentSearches.map((search) => (
            <button
              key={search}
              type="button"
              aria-label={`${search} 최근 검색어 삭제`}
              className="inline-flex items-center gap-1 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-semibold text-zinc-500"
              onClick={() => removeRecentSearch(search)}
            >
              {search}
              <IconX aria-hidden="true" className="size-3" stroke={2} />
            </button>
          ))}
        </div>
      </Popover.Content>
    </Popover>
  );
}

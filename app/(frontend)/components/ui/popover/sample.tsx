"use client";

import { useState } from "react";
import { IconChevronRight, IconX } from "@tabler/icons-react";
import Input, { SearchIcon } from "../input";
import Popover from ".";

export default function PopoverSample() {
  const [searchOpen, setSearchOpen] = useState(true);
  const recentSearches = [
    "스피어",
    "TIGER 미국나스닥100커버드콜(합성)",
    "천보",
  ];

  return (
    <div className="bg-zinc-300 p-8">
      <h2 className="mb-6 border-b-2 border-dashed border-zinc-950 pb-5 text-4xl font-semibold tracking-normal">
        Popover
      </h2>

      <div className="mb-5 flex flex-wrap items-start gap-4">
        <Popover>
          <Popover.Trigger className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
            프로필 메뉴
          </Popover.Trigger>
          <Popover.Content className="h-42.5 w-95 px-9.75 pt-7.75 pb-8.5">
            <div className="flex items-center gap-4.5">
              <div className="relative size-12.5 overflow-hidden rounded-full bg-[radial-gradient(circle_at_35%_35%,#e3f77c_0,#789315_28%,#203a08_58%,#0d1605_100%)]"></div>
              <span className="text-xl font-semibold text-zinc-950">
                김현수
              </span>
            </div>

            <div className="mt-3.25 h-px bg-zinc-300" />

            <button
              className="flex h-14.75 w-full items-center justify-between text-[21px] font-medium text-zinc-800"
              type="button"
            >
              <span>마이페이지</span>
              <IconChevronRight
                aria-hidden="true"
                className="size-8 text-zinc-950"
                stroke={2}
              />
            </button>
          </Popover.Content>
        </Popover>

        <Popover>
          <Popover.Trigger className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-950">
            로그인
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="fixed top-28 left-8 flex h-17 w-95 items-center justify-center">
              <span className="text-4xl font-bold">
                <span className="text-[#4285f4]">G</span>
              </span>
              구글 계정으로 로그인
            </Popover.Content>
          </Popover.Portal>
        </Popover>
      </div>

      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <Popover.Trigger className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          최근 검색
        </Popover.Trigger>
        <Popover.Content className="h-42.5 w-162.5 px-3 pt-2">
          <Input
            aria-label="최근 검색"
            inputClassName="bg-zinc-300 placeholder:text-zinc-400"
            size="sm"
            leftAddon={<SearchIcon className="size-4" />}
            placeholder="검색어를 입력해주세요"
            variant="pill"
          />
          <p className="mt-4 mb-2 text-sm font-semibold">최근 검색</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search) => (
              <span
                key={search}
                className="inline-flex items-center gap-1 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-semibold text-zinc-500"
              >
                {search}
                <IconX aria-hidden="true" className="size-3" stroke={2} />
              </span>
            ))}
          </div>
        </Popover.Content>
      </Popover>
    </div>
  );
}

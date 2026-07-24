"use client";

import { type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useGetMyInfo } from "@/app/(frontend)/apis/auth/queries";
import { showWarningToast } from "@/app/(frontend)/utils/toast";

const AUTH_REQUIRED_MESSAGE = "로그인이 필요한 페이지입니다.";

const NAVIGATION = [
  {
    label: "학습",
    href: "/edu",
  },
  {
    label: "포트폴리오",
    href: "/portfolio",
  },
] as const;

export default function HeaderNavigation() {
  const router = useRouter();
  const { data, refetch } = useGetMyInfo();

  const handlePortfolioClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (data?.isLoggedIn) {
      return;
    }

    event.preventDefault();

    const myInfo = data ?? (await refetch()).data;

    if (myInfo?.isLoggedIn) {
      router.push("/portfolio");
      return;
    }

    void showWarningToast(AUTH_REQUIRED_MESSAGE);
  };

  return (
    <nav aria-label="주요 메뉴" className="hidden gap-1 md:flex">
      {NAVIGATION.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex h-10 items-center justify-center rounded-lg px-4 text-base font-medium text-(--cs-text-default) duration-200 hover:bg-(--cs-brand-50) hover:text-(--cs-brand-800) lg:px-6 lg:text-lg"
          onClick={
            item.href === "/portfolio" ? handlePortfolioClick : undefined
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

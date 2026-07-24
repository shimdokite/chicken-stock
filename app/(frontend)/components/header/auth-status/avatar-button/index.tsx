"use client";

import { usePostLogout } from "@/app/(frontend)/apis/auth/mutations";
import { useGetMyInfo } from "@/app/(frontend)/apis/auth/queries";
import { Avatar, Popover } from "@/app/(frontend)/components/ui";
import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

export default function AvatarButton() {
  const { data, isPending } = useGetMyInfo();
  const { mutate: logout, isPending: isLogoutPending } = usePostLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  if (isPending || !data?.isLoggedIn) {
    return null;
  }

  return (
    <Popover
      className="flex items-center"
      open={menuOpen}
      onOpenChange={setMenuOpen}
    >
      <Popover.Trigger className="cursor-pointer">
        <Avatar
          type="header"
          src={data.user.profileImageUrl || "/test-image.webp"}
          alt={data.user.name}
        />
      </Popover.Trigger>

      <Popover.Content align="right">
        <div className="flex w-[calc(100vw-2.5rem)] max-w-95 flex-col px-5 py-5 whitespace-nowrap md:px-9 md:py-7">
          <div className="flex items-center gap-3 border-b border-(--cs-border-subtle) py-2">
            <Avatar
              type="header"
              src={data.user.profileImageUrl || "/test-image.webp"}
              alt={data.user.name}
            />

            <p className="text-xl">{data.user.name}</p>
          </div>

          <Link
            href="/my"
            className="flex items-center justify-between rounded-lg px-2 py-3 transition hover:bg-(--cs-brand-50)"
            onNavigate={() => setMenuOpen(false)}
          >
            <p className="text-xl">마이페이지</p>

            <IconChevronRight stroke={2} />
          </Link>

          <button
            type="button"
            className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-3 text-left transition hover:bg-(--cs-brand-50) disabled:cursor-not-allowed disabled:text-(--cs-text-muted)"
            disabled={isLogoutPending}
            onClick={handleLogout}
          >
            <p className="text-xl">로그아웃</p>

            <IconChevronRight stroke={2} />
          </button>
        </div>
      </Popover.Content>
    </Popover>
  );
}

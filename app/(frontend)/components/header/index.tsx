import Link from "next/link";
import Logo from "../icons/logo";
import HeaderSearch from "./header-search";
import HeaderAuthStatus from "./auth-status";
import HeaderNavigation from "./header-navigation";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-(--cs-border-subtle) bg-(--cs-surface-raised)/92 font-sans font-normal text-(--cs-text-strong) shadow-(--cs-shadow-sm) backdrop-blur-xl">
      <div className="cs-page-shell flex h-18 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5 lg:gap-12">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-lg"
          >
            <span className="grid size-10 place-items-center rounded-xl">
              <Logo size={30} />
            </span>
            <span className="text-xl tracking-[-0.03em] text-[#df2b2e]">
              치킨스톡
            </span>
          </Link>

          <HeaderNavigation />
        </div>

        <div className="flex min-w-0 items-center gap-2 md:gap-4">
          <HeaderSearch />

          <HeaderAuthStatus />
        </div>
      </div>
    </header>
  );
}

"use client";

import GoogleLogo from "../../../icons/google-logo";
import { Button, Popover } from "../../../ui";

export default function LoginButton() {
  const handleGoogleLogin = () => {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const loginUrl = new URL("/api/auth/google", window.location.origin);

    loginUrl.searchParams.set("returnTo", returnTo);
    window.location.assign(loginUrl.toString());
  };

  return (
    <Popover className="flex items-center">
      <Popover.Trigger className="flex h-10 cursor-pointer items-center justify-center rounded-lg bg-(--cs-brand-700) px-4 text-sm font-semibold text-white duration-200 hover:bg-(--cs-brand-800) md:px-6 md:text-base">
        로그인
      </Popover.Trigger>

      <Popover.Content align="right">
        <div className="flex flex-col justify-center p-5">
          <div className="pb-5 text-sm">
            <div className="">배우고 실습하는 주식 투자 서비스</div>
            <div className="">구글 계정으로 3초 만에 시작해 보세요!</div>
          </div>

          <Button
            variant="custom"
            className="flex h-12 w-[calc(100vw-2.5rem)] max-w-72 items-center justify-center gap-3 rounded-lg bg-(--cs-brand-700) px-4 whitespace-nowrap"
            onClick={handleGoogleLogin}
          >
            <GoogleLogo />
            <span className="text-white">Google 계정으로 로그인</span>
          </Button>
        </div>
      </Popover.Content>
    </Popover>
  );
}

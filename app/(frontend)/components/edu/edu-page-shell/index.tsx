import type { ReactNode } from "react";
import Image from "next/image";

type EduPageShellProps = {
  children: ReactNode;
};

export default function EduPageShell({ children }: EduPageShellProps) {
  return (
    <main className="relative min-h-[calc(100dvh-74px)] overflow-hidden px-5">
      <Image
        src="/images/edu/edu-background.webp"
        alt=""
        aria-hidden="true"
        fill
        className="object-cover object-center"
        priority
        sizes="100vw"
      />

      <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-74px)] w-full max-w-7xl flex-col items-center gap-8 pt-12 pb-12 md:block md:min-h-237.5 md:pt-32">
        <div className="mx-auto max-w-5xl text-center text-black">
          <h1 className="text-4xl leading-tight font-bold tracking-normal md:text-6xl lg:text-8xl">
            레벨별로 학습해보세요!
          </h1>
          <p className="mt-4 text-xl leading-tight font-medium tracking-normal md:text-3xl lg:text-4xl">
            학습하고 퀴즈 맞혀 크레딧을 얻어보세요
          </p>
        </div>

        <div className="mt-8 flex w-full flex-col items-center gap-8 md:mt-0">
          {children}
        </div>
      </section>
    </main>
  );
}

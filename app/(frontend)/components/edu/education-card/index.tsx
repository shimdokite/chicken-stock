"use client";

import { useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { IconInfoCircle } from "@tabler/icons-react";
import Modal from "../../ui/modal";

export type EducationListItem = {
  id?: string;
  level?: string;
  title: string;
  description?: string;
};

export type EducationCardData = {
  summary: string[];
  list: EducationListItem[];
};

export type EducationCardProps = {
  level: string;
  title: string;
  image: string | StaticImageData;
  data: EducationCardData;
  className?: string;
  autoOpenList?: boolean;
};

type OpenPanel = "summary" | "list" | "closed" | null;

function getListItemKey(item: EducationListItem, index: number) {
  return item.id ?? `${item.title}-${index}`;
}

export default function EducationCard({
  level,
  title,
  image,
  data,
  className,
  autoOpenList = false,
}: EducationCardProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const hasSummary = data.summary.some((item) => item.trim().length > 0);
  const hasList = data.list.length > 0;
  const visiblePanel = openPanel === null && autoOpenList ? "list" : openPanel;

  return (
    <>
      <article
        className={twMerge(
          "relative z-0 h-90 w-full max-w-md overflow-hidden rounded-3xl px-8 pt-5 pb-7 text-black shadow-[0_12px_24px_rgb(0_0_0/0.18),0_4px_8px_rgb(0_0_0/0.12)] transition-transform duration-200 hover:z-50 hover:-translate-y-2",
          className,
        )}
      >
        <Image
          src={image}
          alt={`${level} ${title}`}
          fill
          className="object-cover"
          priority={false}
          sizes="(max-width: 768px) 90vw, 448px"
          unoptimized
        />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-3xl leading-none font-medium tracking-normal">
              Level {level}
            </p>
            <h2 className="mt-1 truncate text-xl leading-6 font-medium tracking-normal">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="h-11 shrink-0 cursor-pointer rounded-full bg-[#72327d] px-5 text-2xl leading-none font-medium text-white transition-colors hover:bg-[#5f286b] focus-visible:ring-2 focus-visible:ring-[#72327d] focus-visible:ring-offset-2 focus-visible:outline-none"
            onClick={() => setOpenPanel("list")}
          >
            Play Now
          </button>
        </div>

        <button
          type="button"
          aria-label={`${title} 요약 보기`}
          className="absolute bottom-4 left-8 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full text-zinc-700 transition-colors hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2 focus-visible:outline-none"
          onClick={() => setOpenPanel("summary")}
        >
          <IconInfoCircle aria-hidden="true" className="size-6" stroke={1.5} />
        </button>
      </article>

      <Modal.Root
        isOpen={visiblePanel === "summary" || visiblePanel === "list"}
        setIsOpen={(isOpen) => setOpenPanel(isOpen ? visiblePanel : "closed")}
      >
        <Modal.Overlay>
          <Modal.Content className="w-[min(100%,600px)] rounded-2xl p-7">
            {visiblePanel === "summary" ? (
              <section>
                <h3 className="mt-1 text-2xl font-semibold tracking-normal">
                  이런걸 배울 수 있어요
                </h3>

                {hasSummary ? (
                  <ul className="mt-8 list-disc space-y-5 pl-11 text-xl leading-7">
                    {data.summary.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 rounded-lg bg-zinc-100 px-4 py-5 text-center text-sm text-zinc-500">
                    아직 요약이 준비되지 않았어요.
                  </p>
                )}
              </section>
            ) : null}

            {visiblePanel === "list" ? (
              <section>
                <h3 className="mt-1 text-2xl font-semibold tracking-normal">
                  Level {level} 목록
                </h3>

                {hasList ? (
                  <ol className="mt-5 grid">
                    {data.list.map((item, index) => (
                      <li
                        key={getListItemKey(item, index)}
                        className="px-4 py-3"
                      >
                        <div className="flex items-center">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                            {index + 1}.
                          </span>

                          <div className="min-w-0">
                            {!item.id ? (
                              <p className="text-xl">{item.title}</p>
                            ) : (
                              <Link
                                href={{
                                  pathname: `/edu/articles/${item.id}`,
                                  query: { level: item.level ?? level },
                                }}
                                className="block text-xl transition-colors hover:text-[#72327d] focus-visible:ring-2 focus-visible:ring-[#72327d] focus-visible:ring-offset-2 focus-visible:outline-none"
                              >
                                {item.title}
                              </Link>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-5 rounded-lg bg-zinc-100 px-4 py-5 text-center text-sm text-zinc-500">
                    아직 학습 목록이 준비되지 않았어요.
                  </p>
                )}
              </section>
            ) : null}
          </Modal.Content>
        </Modal.Overlay>
      </Modal.Root>
    </>
  );
}

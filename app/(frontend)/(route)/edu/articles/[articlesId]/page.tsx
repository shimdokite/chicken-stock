import Link from "next/link";
import Image from "next/image";
import { IconChevronLeft } from "@tabler/icons-react";
import { getEducationArticle } from "@/app/(frontend)/apis/edu/queries";
import { getRequestOrigin } from "../../../../lib/server/request";
import { parseArticleContent } from "../../../../utils/edu/article-content";
import { isPositiveIntegerString } from "../../../../utils/number";
import ArticleMessage from "../../../../components/edu/article-message";

type ArticlePageProps = {
  params: Promise<{
    articlesId: string;
  }>;
  searchParams: Promise<{
    level?: string;
  }>;
};

export default async function ArticlePage({
  params,
  searchParams,
}: ArticlePageProps) {
  const { articlesId } = await params;
  const { level } = await searchParams;

  if (!isPositiveIntegerString(articlesId) || !isPositiveIntegerString(level)) {
    return (
      <ArticleMessage
        title="학습 글을 찾을 수 없어요"
        message="선택한 학습 단계나 글 정보가 올바르지 않아요."
      />
    );
  }

  const articleLevel = level ?? "";
  const article = await getEducationArticle(
    articlesId,
    articleLevel,
    await getRequestOrigin(),
  );

  if (!article) {
    return (
      <ArticleMessage
        title="학습 글을 불러오지 못했어요"
        message="선택한 학습 글이 없거나 일시적으로 조회할 수 없어요."
      />
    );
  }

  const contentBlocks = parseArticleContent(article.content);
  const visibleContentBlocks =
    contentBlocks[0]?.type === "heading" && contentBlocks[0].level === 1
      ? contentBlocks.slice(1)
      : contentBlocks;

  return (
    <main className="relative min-h-[calc(100dvh-74px)] bg-white px-5 pt-36 pb-20 text-zinc-950">
      <Link
        href={{
          pathname: "/edu",
          query: { openLevel: String(article.educationSummary.stage) },
        }}
        aria-label="학습 목록으로 돌아가기"
        className="absolute top-20 left-6 flex size-16 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:outline-none md:top-24 md:left-20"
      >
        <IconChevronLeft aria-hidden="true" className="size-16" stroke={1.8} />
      </Link>

      <article className="mx-auto max-w-4xl">
        <h1 className="text-center text-4xl leading-tight font-bold tracking-normal md:text-5xl">
          {article.title}
        </h1>

        {article.imageUrl ? (
          <div className="relative mx-auto mt-14 h-72 w-full max-w-md overflow-hidden rounded-xl bg-zinc-100">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              unoptimized
            />
          </div>
        ) : null}

        {visibleContentBlocks.length > 0 ? (
          <div className="mx-auto mt-14 max-w-4xl space-y-8 text-zinc-950">
            {visibleContentBlocks.map((block, index) => {
              if (block.type === "heading") {
                const headingClassName =
                  block.level === 1
                    ? "text-4xl leading-tight font-bold text-zinc-950"
                    : block.level === 2
                      ? "pt-6 text-3xl leading-tight font-bold text-zinc-950"
                      : "pt-3 text-2xl leading-tight font-semibold text-zinc-950";

                const HeadingTag = `h${block.level}` as const;

                return (
                  <HeadingTag
                    key={`${block.text}-${index}`}
                    className={headingClassName}
                  >
                    {block.text}
                  </HeadingTag>
                );
              }

              if (block.type === "list") {
                return (
                  <ul
                    key={`list-${index}`}
                    className="list-disc space-y-3 pl-8 text-2xl leading-10 md:text-3xl md:leading-relaxed"
                  >
                    {block.items.map((item, itemIndex) => (
                      <li key={`${item}-${itemIndex}`}>{item}</li>
                    ))}
                  </ul>
                );
              }

              if (block.type === "quote") {
                return (
                  <blockquote
                    key={`${block.text}-${index}`}
                    className="border-l-4 border-zinc-300 px-6 py-2 text-2xl leading-10 font-medium text-zinc-950 md:text-3xl md:leading-relaxed"
                  >
                    {block.text}
                  </blockquote>
                );
              }

              if (block.type === "divider") {
                return (
                  <hr key={`divider-${index}`} className="border-zinc-300" />
                );
              }

              return (
                <p
                  key={`${block.text}-${index}`}
                  className="text-2xl leading-10 md:text-3xl md:leading-relaxed"
                >
                  {block.text}
                </p>
              );
            })}
          </div>
        ) : (
          <p className="mt-8 rounded-lg bg-white px-5 py-6 text-center text-base text-zinc-500 shadow-sm">
            아직 본문이 준비되지 않았어요.
          </p>
        )}

        <div className="mt-16 flex justify-center">
          <Link
            href={`/edu/quizzes/${articlesId}`}
            className="inline-flex min-h-14 items-center justify-center rounded-lg bg-zinc-950 px-10 text-2xl font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            퀴즈 풀러 가기
          </Link>
        </div>
      </article>
    </main>
  );
}

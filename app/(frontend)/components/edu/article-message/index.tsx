import Link from "next/link";

type ArticleMessageProps = {
  title: string;
  message: string;
};

export default function ArticleMessage({
  title,
  message,
}: ArticleMessageProps) {
  return (
    <main className="min-h-[calc(100dvh-74px)] bg-[#f8f8f9] px-5 py-8 md:px-8 md:py-12">
      <section className="mx-auto flex min-h-[calc(100dvh-170px)] max-w-3xl flex-col items-center justify-center rounded-2xl bg-white p-6 text-center md:p-8">
        <h1 className="text-3xl font-bold tracking-normal text-zinc-950">
          {title}
        </h1>

        <p className="mt-4 text-base leading-7 text-zinc-600">{message}</p>

        <Link
          href="/edu"
          className="mt-8 rounded-full bg-[#72327d] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#5f286b] focus-visible:ring-2 focus-visible:ring-[#72327d] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          학습 목록으로 돌아가기
        </Link>
      </section>
    </main>
  );
}

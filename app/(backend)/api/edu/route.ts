import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const articleId = parsePositiveInteger(searchParams.get("id"));
    const educationSummaryId = parsePositiveInteger(
      searchParams.get("education_summary_id") ??
        searchParams.get("educationSummaryId"),
    );

    if (
      searchParams.has("id") ||
      searchParams.has("education_summary_id") ||
      searchParams.has("educationSummaryId")
    ) {
      if (!articleId || !educationSummaryId) {
        return NextResponse.json(
          {
            ok: false,
            error: "INVALID_ARTICLE_QUERY",
          },
          { status: 400 },
        );
      }

      const article = await prisma.article.findFirst({
        where: {
          id: articleId,
          educationSummaryId,
        },
        select: {
          id: true,
          educationSummaryId: true,
          title: true,
          content: true,
        },
      });

      if (!article) {
        return NextResponse.json(
          {
            ok: false,
            error: "ARTICLE_NOT_FOUND",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        data: article,
      });
    }

    const educationSummaries = await prisma.educationSummary.findMany({
      orderBy: { stage: "asc" },
      select: {
        title: true,
        stage: true,
        summary: true,
        articles: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: educationSummaries,
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "EDUCATION_CONTENT_FETCH_FAILED"
        : error instanceof Error
        ? error.message
        : "EDUCATION_CONTENT_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

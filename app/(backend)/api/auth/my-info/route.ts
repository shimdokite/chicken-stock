import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  clearAuthCookies,
  setAuthCookies,
  verifyAuthToken,
} from "@/app/(backend)/lib/auth";
import { rotateAuthSession } from "@/app/(backend)/lib/auth-session";
import { prisma } from "@/app/(backend)/lib/prisma";
import { getUserOrderRealtimeChannelName } from "@/app/(backend)/lib/realtime-channels";
import {
  InvestmentType,
  type InvestmentType as InvestmentTypeValue,
} from "@/app/(backend)/generated/prisma/enums";

export const runtime = "nodejs";

const investmentTypeValues = new Set<string>(Object.values(InvestmentType));

const userSelect = {
  createdAt: true,
  currentLevel: true,
  currentStep: true,
  email: true,
  id: true,
  investmentType: true,
  name: true,
  profileImageUrl: true,
  totalSteps: true,
  type: true,
  updatedAt: true,
} as const;

type UserForMyInfo = {
  createdAt: Date;
  currentLevel: number | null;
  currentStep: number | null;
  email: string | null;
  id: bigint;
  investmentType: InvestmentTypeValue | null;
  name: string;
  profileImageUrl: string | null;
  totalSteps: number | null;
  type: string;
  updatedAt: Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInvestmentType(value: unknown): value is InvestmentTypeValue {
  return typeof value === "string" && investmentTypeValues.has(value);
}

function serializeUser(user: UserForMyInfo) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    id: user.id.toString(),
    realtimeOrderChannel: getUserOrderRealtimeChannelName(user.id),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function createLoggedOutResponse(options?: { clearCookies?: boolean }) {
  const response = NextResponse.json({
    isLoggedIn: false,
    user: null,
  });

  if (options?.clearCookies) {
    clearAuthCookies(response);
  }

  return response;
}

function createLoggedInResponse(user: UserForMyInfo) {
  return NextResponse.json({
    isLoggedIn: true,
    user: serializeUser(user),
  });
}

async function findUserByTokenPayload(payload: { sub: string }) {
  return prisma.user.findUnique({
    select: userSelect,
    where: {
      id: BigInt(payload.sub),
    },
  });
}

async function getUserFromAccessToken(accessToken: string | undefined) {
  if (!accessToken) {
    return null;
  }

  const payload = verifyAuthToken(accessToken, "access");

  return findUserByTokenPayload(payload);
}

async function getUserFromRefreshToken(
  request: NextRequest,
  refreshToken: string | undefined,
) {
  if (!refreshToken) {
    return null;
  }

  return rotateAuthSession(refreshToken, request);
}

function getAuthenticatedUserId(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const payload = verifyAuthToken(accessToken, "access");

    return BigInt(payload.sub);
  } catch {
    return null;
  }
}

async function getUpdateMyInfoPayload(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(body) || !isInvestmentType(body.investmentType)) {
    return null;
  }

  return {
    investmentType: body.investmentType,
  };
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;
  const shouldClearCookies = Boolean(accessToken || refreshToken);

  try {
    const user = await getUserFromAccessToken(accessToken);

    if (user) {
      return createLoggedInResponse(user);
    }
  } catch {
    // Access token 만료/오염은 refresh token으로 한 번 더 판단한다.
  }

  try {
    const session = await getUserFromRefreshToken(request, refreshToken);

    if (!session) {
      return createLoggedOutResponse({ clearCookies: shouldClearCookies });
    }

    const response = createLoggedInResponse(session.user);

    setAuthCookies(response, session.tokens);

    return response;
  } catch {
    return createLoggedOutResponse({ clearCookies: shouldClearCookies });
  }
}

export async function PATCH(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json(
      { message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const payload = await getUpdateMyInfoPayload(request);

  if (!payload) {
    return NextResponse.json(
      { message: "유효한 투자 성향이 필요합니다." },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    data: {
      investmentType: payload.investmentType,
    },
    select: userSelect,
    where: {
      id: userId,
    },
  });

  return createLoggedInResponse(user);
}

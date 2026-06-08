import { requests } from "../request";
import type { InvestmentType } from "../../types/portfolio";

export type MyInfoUser = {
  createdAt: string;
  currentLevel: number | null;
  currentStep: number | null;
  email: string | null;
  id: string;
  investmentType: InvestmentType | null;
  name: string;
  profileImageUrl: string | null;
  realtimeOrderChannel: string;
  totalSteps: number | null;
  type: "NORMAL" | "AGENT";
  updatedAt: string;
};

export type MyInfoResponse =
  | {
      isLoggedIn: false;
      user: null;
    }
  | {
      isLoggedIn: true;
      user: MyInfoUser;
    };

export type UpdateMyInfoRequest = {
  investmentType: InvestmentType;
};

export async function getMyInfo() {
  const { data } = await requests.get<MyInfoResponse>("/api/auth/my-info");

  return data;
}

export async function updateMyInfo(payload: UpdateMyInfoRequest) {
  const { data } = await requests.patch<MyInfoResponse>(
    "/api/auth/my-info",
    payload,
  );

  return data;
}

export async function postLogout() {
  const { data } = await requests.post<{ ok: true }>("/api/auth/logout");

  return data;
}

export async function deleteAccount() {
  const { data } = await requests.delete<{ ok: true }>(
    "/api/auth/delete-account",
  );

  return data;
}

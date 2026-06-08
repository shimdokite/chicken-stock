"use client";

import { useGetMyInfo } from "@/app/(frontend)/apis/auth/queries";
import { useUserRealtime } from "@/app/(frontend)/hooks/use-stock-realtime";

export default function RealtimeBridge() {
  const { data } = useGetMyInfo();
  const userOrderChannel =
    data?.isLoggedIn === true ? data.user.realtimeOrderChannel : null;

  useUserRealtime(userOrderChannel);

  return null;
}

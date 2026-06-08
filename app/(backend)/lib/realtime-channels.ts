import { createHmac } from "node:crypto";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다.`);
  }

  return value;
}

function toChannelId(value: bigint | number | string) {
  return value.toString();
}

function getChannelSignature(namespace: string, value: string) {
  return createHmac("sha256", getRequiredEnv("AUTH_JWT_SECRET"))
    .update(`${namespace}:${value}`)
    .digest("base64url")
    .slice(0, 32);
}

export function getUserOrderRealtimeChannelName(
  userId: bigint | number | string,
) {
  const channelId = toChannelId(userId);
  const signature = getChannelSignature("user-order", channelId);

  return `user:${channelId}:${signature}`;
}

export function getStockRealtimeChannelName(stockId: number) {
  return `stock:${stockId}`;
}

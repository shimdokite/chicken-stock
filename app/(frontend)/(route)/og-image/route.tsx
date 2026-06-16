/* eslint-disable @next/next/no-img-element -- next/og renders raw image tags inside ImageResponse. */
import { ImageResponse } from "next/og";

const size = {
  width: 1200,
  height: 630,
};

export async function GET(request: Request) {
  const logoUrl = new URL("/images/logo-og.webp", request.url).toString();
  const logoResponse = await fetch(logoUrl);
  const logoBuffer = await logoResponse.arrayBuffer();
  const logoDataUrl = `data:image/png;base64,${Buffer.from(logoBuffer).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "34px",
          }}
        >
          <img
            src={logoDataUrl}
            alt="Chicken Stock"
            style={{
              width: "188px",
              height: "188px",
            }}
          />
          <div
            style={{
              color: "#ef3232",
              fontSize: "88px",
              fontWeight: 500,
              letterSpacing: "0",
            }}
          >
            치킨스톡
          </div>
        </div>
      </div>
    ),
    size,
  );
}

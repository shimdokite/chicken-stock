import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import QueryProvider from "../components/providers/query-provider";
import RealtimeBridge from "../components/providers/realtime-bridge";
import ToastProvider from "../components/providers/toast-provider";
import Header from "../components/header";
import MiniPortfolio from "../components/mini-portfolio";

const atoz = localFont({
  src: [
    {
      path: "../fonts/atoz-4-regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/atoz-5-medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/atoz-6-semi-bold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/atoz-7-bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  variable: "--font-atoz",
});

export const metadata: Metadata = {
  title: "Chicken Stock",
  description: "Chicken Stock",
  verification: {
    google: "_Rw9venikBySdkKF0Y78BSVhJpXs6JEcX_gsGnGPaqo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${atoz.className} ${atoz.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden text-(--cs-text-default)">
        <QueryProvider>
          <RealtimeBridge />
          {/* <ReactQueryDevtools initialIsOpen={false} /> */}

          <Header />
          {children}

          <MiniPortfolio />
          <ToastProvider position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}

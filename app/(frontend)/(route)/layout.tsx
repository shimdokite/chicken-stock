import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import QueryProvider from "../components/providers/query-provider";
import RealtimeBridge from "../components/providers/realtime-bridge";
import Header from "../components/header";

const atoz = localFont({
  src: [
    {
      path: "../fonts/atoz-1-thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../fonts/atoz-2-extra-light.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../fonts/atoz-3-light.ttf",
      weight: "300",
      style: "normal",
    },
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
    {
      path: "../fonts/atoz-8-extra-bold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../fonts/atoz-9-black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-atoz",
});

export const metadata: Metadata = {
  title: "Chicken Stock",
  description: "Chicken Stock",
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
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <RealtimeBridge />
          <ReactQueryDevtools initialIsOpen={false} />

          <Header />
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ToasterProps } from "sonner";

const Toaster = dynamic(() => import("sonner").then((mod) => mod.Toaster), {
  ssr: false,
});

type ToastProviderProps = Pick<ToasterProps, "position">;

export default function ToastProvider({ position }: ToastProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const scheduleIdle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback.bind(window)
        : (callback: IdleRequestCallback) =>
            window.setTimeout(() => callback({} as IdleDeadline), 1500);
    const cancelIdle =
      typeof window.cancelIdleCallback === "function"
        ? window.cancelIdleCallback.bind(window)
        : window.clearTimeout.bind(window);
    const id = scheduleIdle(() => {
      setIsReady(true);
    });

    return () => {
      cancelIdle(id);
    };
  }, []);

  return isReady ? (
    <Toaster
      closeButton
      position={position}
      richColors
      toastOptions={{
        closeButtonAriaLabel: "알림 닫기",
        classNames: {
          toast:
            "!rounded-xl !border-(--cs-border-strong) !bg-(--cs-surface-raised) !pr-12 !text-(--cs-text-strong) !shadow-(--cs-shadow-lg)",
          description: "!text-(--cs-text-muted)",
          closeButton:
            "cs-toast-close !flex !size-7 !items-center !justify-center !rounded-lg !border-0 !bg-(--cs-surface-base) !text-(--cs-text-muted) hover:!bg-(--cs-brand-100) hover:!text-(--cs-text-strong)",
        },
      }}
    />
  ) : null;
}

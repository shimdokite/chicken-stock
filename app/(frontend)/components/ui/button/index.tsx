"use client";

import type { MouseEventHandler, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type ButtonVariant =
  | "buy"
  | "sell"
  | "buy-wide"
  | "sell-wide"
  | "cancel-wide"
  | "portfolio-wide"
  | "buy-subtle"
  | "sell-subtle"
  | "stock-count"
  | "quantity-left"
  | "quantity-right"
  | "percentage"
  | "step-controls"
  | "custom";

type ButtonProps = {
  className?: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: ButtonVariant;
};

const buttonVariants: Record<ButtonVariant, string> = {
  buy: "bg-(--cs-color-red-600) text-white max-w-30 h-[45px] flex items-center justify-center rounded-[10px] text-xl w-full flex-1",
  sell: "bg-(--cs-color-blue-300) text-white max-w-30 h-[45px] flex items-center justify-center rounded-[10px] text-xl w-full flex-1",
  "buy-wide":
    "bg-(--cs-color-red-600) text-white max-w-[268px] h-9 flex items-center justify-center rounded-[10px] text-lg w-full flex-1",
  "sell-wide":
    "bg-(--cs-color-blue-300) text-white max-w-[268px] h-9 flex items-center justify-center rounded-[10px] text-lg w-full flex-1",
  "cancel-wide":
    "bg-(--cs-color-gray-200) text-(--cs-color-gray-800) disabled:text-white max-w-[268px] h-9 flex items-center justify-center rounded-[10px] text-lg w-full flex-1",
  "portfolio-wide":
    "bg-(--cs-color-green-100) text-white max-w-[268px] h-9 flex items-center justify-center rounded-[10px] text-lg w-full flex-1",
  "buy-subtle":
    "bg-(--cs-color-red-800)/50 text-(--cs-color-red-700) disabled:text-(--cs-color-red-700)/30 max-w-[128px] h-[50px] flex items-center justify-center rounded-[10px] w-full flex-1",
  "sell-subtle":
    "bg-(--cs-color-blue-400)/50 text-(--cs-color-blue-600) disabled:text-(--cs-color-blue-600)/30 max-w-[128px] h-[50px] flex items-center justify-center rounded-[10px] w-full flex-1",
  "stock-count":
    "bg-(--cs-color-gray-200) text-(--cs-color-gray-900) max-w-15 h-[35px] flex items-center justify-center rounded-[10px] w-full flex-1",
  "quantity-left":
    "bg-(--cs-color-gray-200) text-(--cs-color-gray-500) w-[29px] h-[29px] border-r-[0.5px] border-(--cs-color-gray-500) flex items-center justify-center rounded-l-[10px]",
  "quantity-right":
    "bg-(--cs-color-gray-200) text-(--cs-color-gray-500) w-[29px] h-[29px] border-l-[0.5px] border-(--cs-color-gray-500) flex items-center justify-center rounded-r-[10px]",
  percentage:
    "bg-(--cs-color-gray-200) text-(--cs-color-gray-800) max-w-[35px] h-[30px] flex items-center justify-center rounded-[10px] w-full flex-1 text-sm",
  "step-controls":
    "bg-(--cs-color-gray-200)/40 text-black max-w-[90px] h-[45px] flex items-center justify-center rounded-[10px] w-full flex-1 text-xl",
  custom: "",
};

export default function Button({
  className,
  children,
  disabled = false,
  onClick,
  variant = "buy",
}: ButtonProps) {
  return (
    <button
      type="button"
      className={twMerge(
        "cursor-pointer font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50",
        buttonVariants[variant],
        className,
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

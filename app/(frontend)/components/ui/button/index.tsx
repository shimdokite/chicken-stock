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
  buy: "bg-[#FF0000] text-white max-w-30 h-[45px] flex items-center justify-center rounded-[10px] text-xl w-full flex-1",
  sell: "bg-[#2B9DD1] text-white max-w-30 h-[45px] flex items-center justify-center rounded-[10px] text-xl w-full flex-1",
  "buy-wide":
    "bg-[#FF0000] text-white max-w-[268px] h-9 flex items-center justify-center rounded-[10px] text-lg w-full flex-1",
  "sell-wide":
    "bg-[#2B9DD1] text-white max-w-[268px] h-9 flex items-center justify-center rounded-[10px] text-lg w-full flex-1",
  "cancel-wide":
    "bg-[#D9D9D9] text-[#615E5E] disabled:text-white max-w-[268px] h-9 flex items-center justify-center rounded-[10px] text-lg w-full flex-1",
  "portfolio-wide":
    "bg-[#75D291] text-white max-w-[268px] h-9 flex items-center justify-center rounded-[10px] text-lg w-full flex-1",
  "buy-subtle":
    "bg-[#DF2B2E]/50 text-[#E91418] disabled:text-[#E91418]/30 max-w-[128px] h-[50px] flex items-center justify-center rounded-[10px] w-full flex-1",
  "sell-subtle":
    "bg-[#3698BC]/50 text-[#0881BA] disabled:text-[#0881BA]/30 max-w-[128px] h-[50px] flex items-center justify-center rounded-[10px] w-full flex-1",
  "stock-count":
    "bg-[#D9D9D9] text-[#454545] max-w-15 h-[35px] flex items-center justify-center rounded-[10px] w-full flex-1",
  "quantity-left":
    "bg-[#D9D9D9] text-[#BABABA] w-[29px] h-[29px] border-r-[0.5px] border-[#BABABA] flex items-center justify-center rounded-l-[10px]",
  "quantity-right":
    "bg-[#D9D9D9] text-[#BABABA] w-[29px] h-[29px] border-l-[0.5px] border-[#BABABA] flex items-center justify-center rounded-r-[10px]",
  percentage:
    "bg-[#D9D9D9] text-[#615E5E] max-w-[35px] h-[30px] flex items-center justify-center rounded-[10px] w-full flex-1 text-sm",
  "step-controls":
    "bg-[#D9D9D9]/40 text-black max-w-[90px] h-[45px] flex items-center justify-center rounded-[10px] w-full flex-1 text-xl",
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
        "cursor-pointer disabled:cursor-not-allowed",
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

import Image from "next/image";
import { twMerge } from "tailwind-merge";

export type AvatarType =
  | "header"
  | "main"
  | "portfolio-mini-circle"
  | "portfolio-mini-square"
  | "stock-detail"
  | "mypage";

export interface AvatarProps {
  src: string;
  alt?: string;
  type: AvatarType;
  className?: string;
}

const avatarClassName: Record<AvatarType, string> = {
  header: "h-[50px] w-[50px] rounded-full",
  main: "h-[30px] w-[30px] rounded-full",
  "portfolio-mini-circle": "h-[40px] w-[40px] rounded-full",
  "portfolio-mini-square": "h-[80px] w-[80px]",
  "stock-detail": "h-[100px] w-[100px]",
  mypage: "h-[100px] w-[100px] rounded-full",
};

const avatarLoading: Record<AvatarType, "lazy" | "eager"> = {
  header: "eager",
  main: "eager",
  "portfolio-mini-circle": "lazy",
  "portfolio-mini-square": "lazy",
  "stock-detail": "eager",
  mypage: "eager",
};

export default function Avatar({ src, type, alt, className }: AvatarProps) {
  return (
    <div
      className={twMerge(
        "relative overflow-hidden",
        avatarClassName[type],
        className,
      )}
      data-testid={`avatar-${type}`}
    >
      <Image
        className="object-cover"
        src={src}
        alt={alt ?? src}
        fill
        loading={avatarLoading[type]}
        unoptimized
      />
    </div>
  );
}

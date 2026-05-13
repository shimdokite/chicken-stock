import { HTMLAttributes, ReactNode } from "react";

type PopoverProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export default function Popover({
  children,
  className = "",
  ...props
}: PopoverProps) {
  return (
    <div
      className={[
        "rounded-md border border-zinc-300 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

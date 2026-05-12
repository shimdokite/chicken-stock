"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

type DropdownItem = {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
};
type DropdownProps = {
  label?: string;
  items: DropdownItem[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

const ChevronDownIcon = ({ open }: { open: boolean }) => (
  // TODO: 추후 tabler 라이브러리로 변경 예정
  <svg
    aria-hidden="true"
    className={["transition", open ? "rotate-180" : ""].join(" ")}
    fill="none"
    height="18"
    viewBox="0 0 24 24"
    width="18"
  >
    <path
      d="m6 9 6 6 6-6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export default function Dropdown({
  label,
  items,
  value,
  defaultValue,
  placeholder = "선택",
  onValueChange,
  className = "",
}: DropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items[0]?.value,
  );
  const selectedValue = value ?? internalValue;
  const selectedItem = items.find((item) => item.value === selectedValue);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const selectItem = (item: DropdownItem) => {
    if (item.disabled) {
      return;
    }

    setInternalValue(item.value);
    onValueChange?.(item.value);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={["relative w-64", className].join(" ")}>
      {label ? (
        <span className="mb-2 block text-sm font-semibold text-zinc-700">
          {label}
        </span>
      ) : null}
      <button
        aria-expanded={open}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-14 w-full items-center justify-between gap-3 rounded-md bg-white px-4 text-left text-base font-semibold text-zinc-950 shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition hover:bg-zinc-50 focus:ring-2 focus:ring-sky-100 focus:outline-none"
      >
        <span className="flex min-w-0 items-center gap-3">
          {selectedItem?.icon ? (
            <span className="grid size-8 shrink-0 place-items-center">
              {selectedItem.icon}
            </span>
          ) : null}

          <span className="truncate">{selectedItem?.label ?? placeholder}</span>
        </span>

        <ChevronDownIcon open={open} />
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+6px)] left-0 z-20 w-full overflow-hidden rounded-md bg-white py-1 shadow-[0_10px_24px_rgba(0,0,0,0.14)]">
          {items.map((item) => (
            <button
              type="button"
              key={item.value}
              disabled={item.disabled}
              onClick={() => selectItem(item)}
              className={[
                "flex h-11 w-full items-center gap-3 px-4 text-left text-sm font-medium transition",
                item.value === selectedValue ? "bg-zinc-100" : "bg-white",
                item.disabled
                  ? "cursor-not-allowed text-zinc-300"
                  : "text-zinc-900 hover:bg-zinc-50",
              ].join(" ")}
            >
              {item.icon ? (
                <span className="grid size-7 shrink-0 place-items-center">
                  {item.icon}
                </span>
              ) : null}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

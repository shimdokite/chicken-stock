"use client";

import {
  ButtonHTMLAttributes,
  createContext,
  HTMLAttributes,
  MouseEvent,
  ReactNode,
  Ref,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";

type PopoverContextValue = {
  contentId: string;
  open: boolean;
  portalRef: RefObject<HTMLDivElement | null>;
  rootRef: RefObject<HTMLDivElement | null>;
  setOpen: (open: boolean) => void;
};

type PopoverProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  ref?: Ref<HTMLDivElement>;
};

type PopoverTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
};

type PopoverContentAlign = "left" | "center" | "right";

type PopoverContentProps = HTMLAttributes<HTMLDivElement> & {
  align?: PopoverContentAlign;
  forceMount?: boolean;
  ref?: Ref<HTMLDivElement>;
};

type PopoverPortalProps = {
  children: ReactNode;
  container?: Element | DocumentFragment | null;
  forceMount?: boolean;
};

type PopoverComponent = typeof Popover & {
  Trigger: typeof PopoverTrigger;
  Portal: typeof PopoverPortal;
  Content: typeof PopoverContent;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

const popoverContentAlignClassName: Record<PopoverContentAlign, string> = {
  left: "left-0",
  center: "left-1/2 -translate-x-1/2",
  right: "right-0 left-auto",
};

function subscribeToHydrationStore() {
  return () => {};
}

function getHydratedSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function useHydrated() {
  return useSyncExternalStore(
    subscribeToHydrationStore,
    getHydratedSnapshot,
    getServerSnapshot,
  );
}

function usePopoverContext(componentName: string) {
  const context = useContext(PopoverContext);

  if (!context) {
    throw new Error(`${componentName} must be used within Popover.`);
  }

  return context;
}

function setRefs<T>(node: T, refs: Array<Ref<T> | undefined>) {
  refs.forEach((ref) => {
    if (!ref) {
      return;
    }

    if (typeof ref === "function") {
      ref(node);
      return;
    }

    ref.current = node;
  });
}

function Popover({
  children,
  className = "",
  open,
  defaultOpen = false,
  onOpenChange,
  ref,
  ...props
}: PopoverProps) {
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (!currentOpen) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !portalRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [currentOpen, setOpen]);

  return (
    <PopoverContext.Provider
      value={{
        contentId,
        open: currentOpen,
        portalRef,
        rootRef,
        setOpen,
      }}
    >
      <div
        ref={(node) => setRefs(node, [rootRef, ref])}
        className={twMerge("relative inline-block", className)}
        {...props}
      >
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

function PopoverPortal({
  children,
  container,
  forceMount = false,
}: PopoverPortalProps) {
  const { open, portalRef } = usePopoverContext("Popover.Portal");
  const mounted = useHydrated();

  if (!mounted || (!forceMount && !open)) {
    return null;
  }

  return createPortal(
    <div ref={portalRef} style={{ display: "contents" }}>
      {children}
    </div>,
    container ?? document.body,
  );
}

function PopoverTrigger({
  children,
  onClick,
  type = "button",
  ref,
  ...props
}: PopoverTriggerProps) {
  const { contentId, open, setOpen } = usePopoverContext("Popover.Trigger");

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      setOpen(!open);
    }
  };

  return (
    <button
      aria-controls={contentId}
      aria-expanded={open}
      aria-haspopup="dialog"
      data-state={open ? "open" : "closed"}
      ref={ref}
      type={type}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

function PopoverContent({
  align = "left",
  children,
  className = "",
  forceMount = false,
  ref,
  ...props
}: PopoverContentProps) {
  const { contentId, open } = usePopoverContext("Popover.Content");

  if (!forceMount && !open) {
    return null;
  }

  return (
    <div
      aria-hidden={!open}
      data-state={open ? "open" : "closed"}
      id={contentId}
      ref={ref}
      role="dialog"
      className={twMerge(
        "absolute top-full z-10 mt-2 rounded-xl border border-(--cs-border-subtle) bg-(--cs-surface-raised) shadow-(--cs-shadow-lg)",
        popoverContentAlignClassName[align],
        !open ? "hidden" : undefined,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

Object.assign(Popover, {
  Trigger: PopoverTrigger,
  Portal: PopoverPortal,
  Content: PopoverContent,
});

export default Popover as PopoverComponent;

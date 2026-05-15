"use client";

import { IconX } from "@tabler/icons-react";
import {
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type ForwardedRef,
  type MouseEvent,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";

type ModalContextValue = {
  isOpen: boolean;
  isPresent: boolean;
  isVisible: boolean;
  setOpen: (isOpen: boolean) => void;
  closeOnOverlayClick: boolean;
  closeOnEscape: boolean;
  showCloseButton: boolean;
  lockScroll: boolean;
  mounted: boolean;
  contentRef: MutableRefObject<HTMLDivElement | null>;
};

export type ModalProps = {
  children: ReactNode;
  isOpen?: boolean;
  defaultOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  lockScroll?: boolean;
};

export type ModalTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

export type ModalOverlayProps = ComponentPropsWithoutRef<"div"> & {
  portalContainer?: Element | DocumentFragment | null;
  onOverlayClick?: (event: MouseEvent<HTMLDivElement>) => void;
};

export type ModalContentProps = ComponentPropsWithoutRef<"div"> & {
  closeButtonClassName?: string;
  closeButtonLabel?: string;
  showCloseButton?: boolean;
};

export type ModalCloseProps = ButtonHTMLAttributes<HTMLButtonElement>;

const ModalContext = createContext<ModalContextValue | null>(null);

const defaultTriggerClassName =
  "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md border-0 bg-zinc-900 px-4 font-[inherit] text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300";

const defaultOverlayClassName =
  "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-6 transition-opacity motion-reduce:transition-none";

const defaultContentClassName =
  "relative max-h-[min(720px,calc(100dvh-48px))] w-[min(100%,480px)] transform-gpu overflow-auto rounded-lg bg-white p-10 text-zinc-950 shadow-[0_24px_80px_rgb(0_0_0/0.24),0_4px_16px_rgb(0_0_0/0.12)] outline-none transition-[opacity,transform] will-change-[opacity,transform] motion-reduce:transform-none motion-reduce:transition-none";

const defaultCloseButtonClassName =
  "absolute right-3 top-3 inline-flex size-8 cursor-pointer items-center justify-center rounded border-0 bg-transparent font-[inherit] leading-none text-[#C6C6C6] transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 ";

const modalExitAnimationMs = 180;

let bodyLockCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";

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

function useModalContext(componentName: string) {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error(`${componentName} must be used within Modal.`);
  }

  return context;
}

function cn(...classNames: Array<string | false | null | undefined>) {
  return twMerge(classNames.filter(Boolean).join(" "));
}

function assignRef<T>(ref: ForwardedRef<T>, value: T) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "textarea:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
      ].join(","),
    ),
  ).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.offsetParent !== null,
  );
}

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  bodyLockCount += 1;

  return () => {
    bodyLockCount = Math.max(0, bodyLockCount - 1);

    if (bodyLockCount === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
    }
  };
}

function ModalRoot({
  children,
  isOpen,
  defaultOpen = false,
  setIsOpen,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  lockScroll = true,
}: ModalProps) {
  const mounted = useHydrated();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [isPresent, setIsPresent] = useState(defaultOpen);
  const [hasEntered, setHasEntered] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : uncontrolledOpen;
  const isVisible = open && hasEntered;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      setIsOpen?.(nextOpen);
    },
    [isControlled, setIsOpen],
  );

  useEffect(() => {
    let frameId: number | undefined;
    let timeoutId: number | undefined;

    if (open) {
      timeoutId = window.setTimeout(() => {
        setIsPresent(true);

        frameId = window.requestAnimationFrame(() => {
          setHasEntered(true);
        });
      }, 0);
    } else {
      timeoutId = window.setTimeout(() => {
        setIsPresent(false);
        setHasEntered(false);
      }, modalExitAnimationMs);
    }

    return () => {
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!isPresent || !lockScroll) {
      return;
    }

    return lockBodyScroll();
  }, [isPresent, lockScroll]);

  useEffect(() => {
    if (!open || !isPresent || !mounted) {
      return;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    previouslyFocusedElementRef.current = previouslyFocusedElement;

    const frameId = window.requestAnimationFrame(() => {
      const contentElement = contentRef.current;

      if (!contentElement || contentElement.contains(document.activeElement)) {
        return;
      }

      const [firstFocusableElement] = getFocusableElements(contentElement);
      (firstFocusableElement ?? contentElement).focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isPresent, mounted, open]);

  useEffect(() => {
    if (isPresent || !mounted) {
      return;
    }

    const previouslyFocusedElement = previouslyFocusedElementRef.current;
    previouslyFocusedElementRef.current = null;

    if (
      previouslyFocusedElement &&
      document.contains(previouslyFocusedElement)
    ) {
      previouslyFocusedElement.focus({ preventScroll: true });
    }
  }, [isPresent, mounted]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const contentElement = contentRef.current;

      if (!contentElement) {
        return;
      }

      const focusableElements = getFocusableElements(contentElement);

      if (focusableElements.length === 0) {
        event.preventDefault();
        contentElement.focus({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus({ preventScroll: true });
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeOnEscape, open, setOpen]);

  const contextValue = useMemo(
    () => ({
      isOpen: open,
      isPresent,
      isVisible,
      setOpen,
      closeOnOverlayClick,
      closeOnEscape,
      showCloseButton,
      lockScroll,
      mounted,
      contentRef,
    }),
    [
      closeOnEscape,
      closeOnOverlayClick,
      isPresent,
      isVisible,
      lockScroll,
      mounted,
      open,
      setOpen,
      showCloseButton,
    ],
  );

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
}

const ModalTrigger = forwardRef<HTMLButtonElement, ModalTriggerProps>(
  function ModalTrigger(
    { className, onClick, type = "button", ...props },
    ref,
  ) {
    const { setOpen } = useModalContext("Modal.Trigger");

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (!event.defaultPrevented) {
        setOpen(true);
      }
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(defaultTriggerClassName, className)}
        onClick={handleClick}
        {...props}
      />
    );
  },
);

ModalTrigger.displayName = "Modal.Trigger";

const ModalOverlay = forwardRef<HTMLDivElement, ModalOverlayProps>(
  function ModalOverlay(
    { children, className, portalContainer, onOverlayClick, ...props },
    ref,
  ) {
    const {
      isOpen,
      isPresent,
      isVisible,
      setOpen,
      closeOnOverlayClick,
      mounted,
    } = useModalContext("Modal.Overlay");

    if (!mounted || !isPresent) {
      return null;
    }

    const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
      onOverlayClick?.(event);

      if (
        !event.defaultPrevented &&
        closeOnOverlayClick &&
        event.target === event.currentTarget
      ) {
        setOpen(false);
      }
    };

    const target = portalContainer ?? document.body;
    const overlayAnimationClassName = isVisible
      ? "opacity-100 duration-200 ease-out"
      : "opacity-0 duration-150 ease-out";

    return createPortal(
      <div
        ref={ref}
        aria-hidden={!isOpen}
        className={cn(
          defaultOverlayClassName,
          overlayAnimationClassName,
          className,
        )}
        onClick={handleOverlayClick}
        {...props}
      >
        {children}
      </div>,
      target,
    );
  },
);

ModalOverlay.displayName = "Modal.Overlay";

const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  function ModalContent(
    {
      children,
      className,
      closeButtonClassName,
      closeButtonLabel = "Close modal",
      showCloseButton,
      ...props
    },
    ref,
  ) {
    const {
      isOpen,
      isPresent,
      isVisible,
      setOpen,
      showCloseButton: rootShowCloseButton,
      mounted,
      contentRef,
    } = useModalContext("Modal.Content");

    const setContentRef = useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;
        assignRef(ref, node);
      },
      [contentRef, ref],
    );

    if (!mounted || !isPresent) {
      return null;
    }

    const shouldShowCloseButton = showCloseButton ?? rootShowCloseButton;
    const contentAnimationClassName = isVisible
      ? "translate-y-0 opacity-100 duration-200 ease-out"
      : isOpen
        ? "translate-y-1 opacity-0 duration-200 ease-out"
        : "translate-y-0 opacity-0 duration-150 ease-out";

    return (
      <div
        ref={setContentRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          defaultContentClassName,
          contentAnimationClassName,
          className,
        )}
        {...props}
      >
        {shouldShowCloseButton ? (
          <button
            type="button"
            aria-label={closeButtonLabel}
            className={cn(defaultCloseButtonClassName, closeButtonClassName)}
            onClick={() => setOpen(false)}
          >
            <IconX stroke={2} aria-hidden="true" />
          </button>
        ) : null}
        {children}
      </div>
    );
  },
);

ModalContent.displayName = "Modal.Content";

const ModalClose = forwardRef<HTMLButtonElement, ModalCloseProps>(
  function ModalClose(
    {
      children = <IconX stroke={2} aria-hidden="true" />,
      className,
      onClick,
      type = "button",
      ...props
    },
    ref,
  ) {
    const { setOpen } = useModalContext("Modal.Close");

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (!event.defaultPrevented) {
        setOpen(false);
      }
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(defaultCloseButtonClassName, className)}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  },
);

ModalClose.displayName = "Modal.Close";

export const Modal = {
  Root: ModalRoot,
  Trigger: ModalTrigger,
  Overlay: ModalOverlay,
  Content: ModalContent,
  Close: ModalClose,
} as const;

export default Modal;

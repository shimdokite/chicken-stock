import AuthGuard from "@/app/(frontend)/components/auth-guard";
import type { ReactNode } from "react";

type MyLayoutProps = {
  children: ReactNode;
};

export default function MyLayout({ children }: MyLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-[calc(100dvh-72px)] bg-[#f8f8f9]">{children}</div>
    </AuthGuard>
  );
}

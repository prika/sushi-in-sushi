"use client";

import { SessionTimeoutWarning } from "@/presentation/components/auth/SessionTimeoutWarning";

export default function CozinhaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#111] text-white">
      {children}
      <SessionTimeoutWarning />
    </div>
  );
}

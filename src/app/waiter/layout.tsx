"use client";

import { SessionTimeoutWarning } from "@/presentation/components/auth/SessionTimeoutWarning";

export default function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <SessionTimeoutWarning />
    </>
  );
}

"use client";

import { AuthProvider } from "@/contexts/AuthContext";

export default function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}

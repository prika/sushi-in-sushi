"use client";

import { ReactNode } from "react";
import { MesaLocaleProvider } from "@/contexts/MesaLocaleContext";

interface MesaProvidersProps {
  children: ReactNode;
}

export function MesaProviders({ children }: MesaProvidersProps) {
  return <MesaLocaleProvider>{children}</MesaLocaleProvider>;
}

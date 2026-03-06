import type { Metadata } from "next";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSiteMetadata();
  return {
    title: `Login - ${meta.brandName}`,
    description: "Área restrita do restaurante",
    robots: { index: false, follow: false },
  };
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

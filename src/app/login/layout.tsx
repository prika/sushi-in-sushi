import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Sushi in Sushi",
  description: "Área restrita do restaurante",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

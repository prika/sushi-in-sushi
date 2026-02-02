import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cozinha - Sushi in Sushi",
  description: "Dashboard da cozinha",
};

export default function CozinhaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#111] text-white">
      {children}
    </div>
  );
}

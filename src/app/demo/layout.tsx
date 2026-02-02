import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo - Sushi in Sushi",
  description: "Demonstração do sistema de pedidos",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  );
}

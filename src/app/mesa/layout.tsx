import type { Metadata, Viewport } from "next";
import { MesaProviders } from "@/components/mesa/MesaProviders";

export const metadata: Metadata = {
  title: "Sushi in Sushi - Pedido na Mesa",
  description: "Faça o seu pedido diretamente da mesa",
  manifest: "/manifest.json",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sushi in Sushi",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0D0D",
};

export default function MesaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MesaProviders>
      <div className="min-h-screen bg-[#0D0D0D] text-white">
        {children}
      </div>
    </MesaProviders>
  );
}

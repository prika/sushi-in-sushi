import type { Metadata, Viewport } from "next";
import { MesaProviders } from "@/presentation/components/mesa/MesaProviders";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSiteMetadata();
  return {
    title: `${meta.brandName} - Pedido na Mesa`,
    description: "Faça o seu pedido diretamente da mesa",
    manifest: "/manifest.json",
    robots: { index: false, follow: false },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: meta.brandName,
    },
    formatDetection: {
      telephone: false,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

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

import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sushiinsushi.pt"),
  title: "Sushi in Sushi | Fusion Food no Porto",
  description:
    "Restaurante de sushi no Porto. Rodízio, à carta, delivery e takeaway. Duas localizações: Circunvalação e Boavista.",
  keywords: [
    "sushi porto",
    "restaurante japonês porto",
    "rodízio sushi",
    "sushi delivery porto",
  ],
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Sushi in Sushi | Fusion Food no Porto",
    description:
      "A arte do sushi reinventada. Tradição japonesa com criatividade contemporânea.",
    url: "https://sushiinsushi.pt",
    siteName: "Sushi in Sushi",
    locale: "pt_PT",
    type: "website",
    images: [{ url: "/logo.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className="dark">
      <body
        className={`${cormorant.variable} ${inter.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}

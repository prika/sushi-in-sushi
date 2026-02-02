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
  title: "Sushi in Sushi | Fusion Food no Porto",
  description:
    "Restaurante de sushi no Porto. Rodízio, à carta, delivery e takeaway. Duas localizações: Circunvalação e Boavista.",
  keywords: [
    "sushi porto",
    "restaurante japonês porto",
    "rodízio sushi",
    "sushi delivery porto",
  ],
  openGraph: {
    title: "Sushi in Sushi | Fusion Food no Porto",
    description:
      "A arte do sushi reinventada. Tradição japonesa com criatividade contemporânea.",
    url: "https://sushiinsushi.pt",
    siteName: "Sushi in Sushi",
    locale: "pt_PT",
    type: "website",
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

import type { Metadata } from "next";
import { Bricolage_Grotesque, Caveat, Geist, Geist_Mono } from "next/font/google";
import { Paperplane } from "@/components/Paperplane";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-bricolage",
});
const sans = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-geist-mono" });
const hand = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caveat" });

export const metadata: Metadata = {
  metadataBase: new URL("https://paperplane-production.up.railway.app"),
  title: "Paperplane — crash for free",
  description:
    "Fold a paper plane. Other holders board it. Takeoff stamps one live price, and $PLANE fees pay the flights that land.",
  openGraph: {
    title: "Paperplane — crash for free",
    description: "Fold a plane. Others board it. One price at takeoff.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Paperplane — crash for free" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Paperplane — crash for free",
    description: "Fold a plane. Others board it. One price at takeoff.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} ${hand.variable}`}>
      <body>
        {children}
        <Paperplane />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Caveat } from "next/font/google";
import "./globals.css";
const sans = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const ink = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
export const metadata: Metadata = { title: "Punnett Selection | The Humor Project", description: "A comedy genetics lab for The Humor Project at Columbia University." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="night" className={`${sans.variable} ${mono.variable} ${ink.variable}`}><body>{children}</body></html>;
}

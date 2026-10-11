import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Caveat, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
const sans = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const ink = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const display = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], display: "swap" });
export const metadata: Metadata = { title: "Punnett | AI captions & memes", description: "Turn your photos into funny AI captions. Upload an image, choose a tone, compare captions, and revisit your image and caption history." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="night" className={`${sans.variable} ${mono.variable} ${ink.variable} ${display.variable}`}><body>{children}<Toaster theme="dark" position="bottom-center" richColors /></body></html>;
}

import type { Metadata } from "next";
import { Inter, Unbounded, JetBrains_Mono } from "next/font/google";
import { LinguiProvider } from "@/components/LinguiProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-display",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Ataqu – The Calm Predator of Productivity",
  description: "10 essential apps, one unified price. No lock-in, no per‑user fees. Join the waitlist.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${unbounded.variable} ${jetbrainsMono.variable}`}>
      <body>
        <LinguiProvider>{children}</LinguiProvider>
      </body>
    </html>
  );
}

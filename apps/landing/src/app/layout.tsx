import type { Metadata } from "next";
import { Inter, Unbounded, JetBrains_Mono } from "next/font/google";
import { LinguiProvider } from "@/components/lingui-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
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
  description: "10 essential apps, one unified price. No lock‑in, no per‑user fees. Join the waitlist.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Ataqu – The Calm Predator of Productivity",
    description: "10 essential apps, one unified price. No lock‑in, no per‑user fees.",
    type: "website",
    url: "https://ataqu.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ataqu – The Calm Predator of Productivity",
    description: "10 essential apps, one unified price. No lock‑in, no per‑user fees.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${unbounded.variable} ${jetbrainsMono.variable}`} data-scroll-behavior="smooth">
      <body className="min-h-screen flex flex-col">
        <LinguiProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </LinguiProvider>
      </body>
    </html>
  );
}

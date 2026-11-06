import type { Metadata } from "next";
import { Archivo, Fragment_Mono } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LinguiProvider } from "@/components/lingui-provider";
import "./globals.css";

const archivo = Archivo({
	subsets: ["latin"],
	axes: ["wdth"],
	variable: "--font-archivo",
});

const fragmentMono = Fragment_Mono({
	subsets: ["latin"],
	weight: "400",
	variable: "--font-fragment-mono",
});

export const metadata: Metadata = {
	title: "Ataqu – 10 business apps. One binary. One price.",
	description:
		"10 essential apps, one unified price. No lock‑in, no per‑user fees. Join the waitlist.",
	icons: {
		icon: "/favicon.ico",
	},
	openGraph: {
		title: "Ataqu – 10 business apps. One binary. One price.",
		description:
			"10 essential apps, one unified price. No lock‑in, no per‑user fees.",
		type: "website",
		url: "https://ataqu.com",
	},
	twitter: {
		card: "summary_large_image",
		title: "Ataqu – 10 business apps. One binary. One price.",
		description:
			"10 essential apps, one unified price. No lock‑in, no per‑user fees.",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={`${archivo.variable} ${fragmentMono.variable}`}
			data-scroll-behavior="smooth"
		>
			<body className="flex min-h-screen flex-col">
				<LinguiProvider>
					<Header />
					<main className="flex-1">{children}</main>
					<Footer />
				</LinguiProvider>
			</body>
		</html>
	);
}

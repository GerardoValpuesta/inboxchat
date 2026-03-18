import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "InboxChat — Chat en vivo para tu web",
    template: "%s | InboxChat",
  },
  description:
    "Agregá chat en vivo a tu web en 2 minutos. Sin servidores, sin configuración. Conectá con tus visitantes en tiempo real. Trial gratuito de 14 días.",
  keywords: ["chat en vivo", "live chat", "soporte en tiempo real", "widget de chat", "atención al cliente"],
  metadataBase: new URL("https://inboxchat.app"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://inboxchat.app",
    title: "InboxChat — Chat en vivo para tu web",
    description: "Agregá chat en vivo a tu web en 2 minutos. Sin servidores. Trial gratuito de 14 días.",
    siteName: "InboxChat",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "InboxChat" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "InboxChat — Chat en vivo para tu web",
    description: "Agregá chat en vivo a tu web en 2 minutos. Trial gratuito de 14 días.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  themeColor: "#7c3aed",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "InboxChat",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}

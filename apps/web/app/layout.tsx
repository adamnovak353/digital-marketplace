import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ModeProvider } from "@marketplace/ui";
import { getMarketplace } from "@/lib/marketplace";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const svc = await getMarketplace();
  return {
    title: { default: "Digital Marketplace", template: "%s · Digital Marketplace" },
    description: svc.demoMode ? "Demo multi-vendor marketplace for digital goods. Sample listings only." : "Multi-vendor marketplace for digital goods from approved sellers.",
  };
}

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const svc = await getMarketplace();
  return (
    <html lang="en">
      <body className={`${sans.className} antialiased`}>
        <ModeProvider value={{ demo: svc.demoMode, email: Boolean(svc.mailer) }}>{children}</ModeProvider>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}

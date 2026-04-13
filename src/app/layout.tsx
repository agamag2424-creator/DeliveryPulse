import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeliveryPulse",
  description: "AI-powered project status. Built for delivery leaders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full bg-background-primary font-sans text-text-primary">
        <div className="min-h-screen">
          <header className="border-b border-border px-4 py-4 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xl font-semibold text-text-primary">DeliveryPulse</p>
              <p className="text-right text-sm text-text-secondary">
                AI-powered project status. Built for delivery leaders.
              </p>
            </div>
          </header>
          <AppProviders>
            <main>{children}</main>
          </AppProviders>
        </div>
      </body>
    </html>
  );
}

// Design Alignment: tokens + app chrome unfrozen to match ChisokuLabs.
// Report slide components remain Phase 1 frozen until explicit unfreeze.

import type { Metadata } from "next";
import { IBM_Plex_Mono, Libre_Franklin, Source_Sans_3 } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { ProjectReportBridge } from "@/components/providers/ProjectReportBridge";
import { ProjectUrlSync } from "@/components/projects/ProjectUrlSync";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import { AuthNav } from "@/components/auth/AuthNav";
import { ProjectProvider } from "@/context/ProjectContext";
import { ReportSaveProvider } from "@/context/ReportSaveContext";
import { auth } from "@/auth";
import "./globals.css";
import "./print.css";

const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DeliveryPulse",
  description: "AI-powered project status. Built for delivery leaders.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${libreFranklin.variable} ${sourceSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full font-sans text-text-primary">
        <AuthSessionProvider session={session}>
          <div className="min-h-screen">
            <header className="no-print sticky top-0 z-40 border-b border-[rgba(17,24,32,0.1)] bg-[rgba(247,244,238,0.9)] px-4 py-3 backdrop-blur-xl md:px-6">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-xl font-bold tracking-[-0.03em] text-ink">DeliveryPulse</p>
                  <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-strong sm:inline">
                    by ChisokuLabs
                  </span>
                </div>
                <AuthNav />
              </div>
            </header>
            <ProjectProvider>
              <ReportSaveProvider>
                <AppProviders>
                  <ProjectReportBridge />
                  <ProjectUrlSync />
                  <main>{children}</main>
                </AppProviders>
              </ReportSaveProvider>
            </ProjectProvider>
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}

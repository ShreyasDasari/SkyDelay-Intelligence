import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Sidebar } from "@/components/dashboard/sidebar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SkyDelay Intelligence | Flight Delay Economics Dashboard",
  description:
    "Cascading cost analysis across 347 US airports. Quantifying the $1.1B economic impact of flight delays using FAA/NEXTOR methodology.",
};

export const viewport: Viewport = {
  themeColor: "#F8FAFC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-[240px] flex-1 bg-background">
            <div className="mx-auto max-w-[1280px] px-6 py-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

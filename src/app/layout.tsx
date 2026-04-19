import "./globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { usingMock } from "@/lib/store";

export const metadata: Metadata = {
  title: "Community Radar — Layer8Culture",
  description: "Track signals. Engage authentically. Built for Donville.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text-primary antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            {usingMock && (
              <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs px-6 py-1.5">
                Running on in-memory mock data. Set <code className="font-mono">DATABASE_URL</code> and follow README to connect Supabase.
              </div>
            )}
            <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

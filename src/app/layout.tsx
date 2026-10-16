import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Healthy Garden",
  description: "Healthy habits grow a living garden.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3f7d4e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {/* Phone-first: the whole app lives in a 480px column (plan §3 success metric). */}
        <div className="mx-auto min-h-dvh max-w-[480px] px-4 pb-28 pt-6">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}

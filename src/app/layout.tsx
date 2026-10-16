import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rooted",
  description: "Healthy habits grow a living garden.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {/* Phone-first: the whole app lives in a 480px column (plan §3 success metric). */}
        <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
          <main className="flex-1 px-4 pb-24 pt-6">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}

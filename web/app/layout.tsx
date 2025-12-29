import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // 追加
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner"; // Toastは既存のままでOK

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flola v2",
  description: "Financial OS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-background text-foreground`}>
        <Providers>
          <div className="pb-20">
            {children}
          </div>
          <BottomNav />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
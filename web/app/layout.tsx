import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flola v2",
  description: "Financial OS",
};

const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        fw: 500,
      },
    },
    Card: {
      defaultProps: {
        withBorder: true,
        shadow: 'sm',
      }
    }
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body className={`${inter.className} bg-[#f1f3f5]`}>
        <MantineProvider theme={theme}>
          <Notifications position="top-center" zIndex={2077} />
          <div className="pb-32 max-w-md mx-auto min-h-screen bg-white shadow-2xl relative border-x border-gray-200">
            {children}
            <BottomNav />
          </div>
        </MantineProvider>
      </body>
    </html>
  );
}
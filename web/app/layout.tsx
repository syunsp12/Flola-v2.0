import type { Metadata } from "next";
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BottomNav } from "@/components/bottom-nav";
import SpeedInsights from "@/components/speed-insights";
import "./globals.css";

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
        fw: 700,
      },
    },
    Card: {
      defaultProps: {
        withBorder: true,
        shadow: 'sm',
        radius: 'lg',
      },
    },
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
      <body className="bg-[#f1f3f5]" style={{ fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
        <MantineProvider theme={theme}>
          <Notifications position="top-center" zIndex={2077} />
          <div className="pb-32 max-w-md mx-auto min-h-screen bg-white shadow-2xl relative border-x border-gray-200">
            {children}
            <BottomNav />
          </div>
          <SpeedInsights />
        </MantineProvider>
      </body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";

const fontFamily = DM_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vibe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <TRPCReactProvider>
        <html lang="en" suppressHydrationWarning>
          <body className={`${fontFamily.className} antialiased`}>
            <ThemeProvider
              attribute={"class"}
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Toaster />
              {children}
            </ThemeProvider>
          </body>
        </html>
      </TRPCReactProvider>
    </ClerkProvider>
  );
}

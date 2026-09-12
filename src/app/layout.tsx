import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/contexts/AuthContext";
import { Providers } from "@/providers/ReactQueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { ReminderEngine } from "@/components/ReminderEngine";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedTrail",
  description: "Your digital health companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-center" />
            <ReminderEngine />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}

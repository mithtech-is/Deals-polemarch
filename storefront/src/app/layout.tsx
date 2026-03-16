import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deals | Polemarch - Unlisted Shares Marketplace",
  description: "Browse and buy unlisted shares with Polemarch. Modern fintech platform for unlisted share deals.",
};

import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import { ToastProvider } from "@/context/ToastContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} font-sans antialiased`}>
        <UserProvider>
          <ToastProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deals | Polemarch - Unlisted Shares Marketplace",
  description: "Browse and buy unlisted shares with Polemarch. Modern fintech platform for unlisted share deals.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import { ToastProvider } from "@/context/ToastContext";
import { CurrencyProvider } from "@/components/CurrencyContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <UserProvider>
          <ToastProvider>
            <CartProvider>
              <CurrencyProvider>{children}</CurrencyProvider>
            </CartProvider>
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}

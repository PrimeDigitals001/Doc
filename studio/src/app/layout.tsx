import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const farkey = localFont({
  src: "./fonts/Farkey.otf",
  variable: "--font-farkey",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prime Digitals — Document Studio",
  description: "Quotations, Invoices, Agreements, T&C — all in one brand-consistent studio.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${farkey.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

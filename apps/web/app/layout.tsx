import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Bevel | تصميم · تنفيذ",
  description: "شركة تصميم وتنفيذ متكاملة في المملكة العربية السعودية — من الفكرة إلى الواقع المبني.",
  icons: {
    icon: "/assets/bevel_red_white_png_fit.png",
    apple: "/assets/bevel_red_white_png_fit.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}

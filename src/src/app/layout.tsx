import type { Metadata } from "next";
import { Noto_Sans_Khmer, Inter } from "next/font/google";
import "./globals.css";

const notoSansKhmer = Noto_Sans_Khmer({
  variable: "--font-khmer",
  subsets: ["khmer"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VST Assistant — Facebook Page Automation Platform",
  description: "ប្រព័ន្ធស្វ័យប្រវត្តិតប Comment & Chat Facebook Page សម្រាប់អាជីវកម្មអនឡាញ",
  icons: {
    icon: "/vst-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km">
      <body
        className={`${notoSansKhmer.variable} ${inter.variable} font-sans antialiased bg-[#080D17] text-[#F8FAFC] min-h-screen selection:bg-[#38BDF8] selection:text-[#080D17]`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Noto_Sans_Thai, Nunito_Sans } from "next/font/google";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
});

export const metadata: Metadata = {
  title: {
    default: "QE Tracking System",
    template: "%s | QE Tracking System",
  },
  description: "QE Tracking System – Demo V.1",
  icons: {
    icon: [
      { url: "/logo-icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    shortcut: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${nunitoSans.variable} ${notoSansThai.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/logo-icon.png" type="image/png" />
        <link rel="shortcut icon" href="/logo-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-icon.png" />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}

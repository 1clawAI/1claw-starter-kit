import type { Metadata } from "next";
import { Bakbak_One, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Bakbak One is reserved for the "1Claw" wordmark only (brand kit rule).
const bakbak = Bakbak_One({ variable: "--font-bakbak", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "1Claw Agent",
  description: "A secure AI agent starter built on 1Claw",
  icons: { icon: "/brand/1claw-icon-red.svg" },
};

// Runs before paint so there's no light/dark flash.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bakbak.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="glow min-h-full flex flex-col">{children}</body>
    </html>
  );
}

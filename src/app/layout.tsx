import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Montserrat } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["800"],
});

export const metadata: Metadata = {
  title: "Мой Профсоюз — профсоюзная платформа",
  description: "Платформа для взаимодействия участников профсоюза",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${montserrat.variable} antialiased font-extrabold`} style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('profsoyz-theme');if(t==='light'){document.documentElement.classList.remove('dark')};}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}

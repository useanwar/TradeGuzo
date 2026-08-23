import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Outfit } from "next/font/google";
import "./globals.css";

// Inter: UI text, labels, navigation — a workhorse face that stays
// out of the way so the data itself carries attention.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// IBM Plex Mono: every number on this dashboard — P&L, prices, lot
// sizes. Monospace gives tabular alignment so digits line up in
// columns, which matters for scanning a trades table quickly —
// this is a functional choice for financial data, not decoration.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

// Outfit: used ONLY for the "TradeGuzo" wordmark in the header —
// geometric, tight letterforms with flat terminals, closest free
// Google Font match to the tight geometric branding style referenced.
// Not used anywhere else; body text stays on Inter.
const outfit = Outfit({
  variable: "--font-outfit",
  weight: ["600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeGuzo",
  description: "Personal trade journal and performance dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const shouldBeDark = stored === 'dark' || (!stored && prefersDark);
                  
                  if (shouldBeDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  // localStorage might not be available in some environments
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${plexMono.variable} ${outfit.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Spline_Sans } from "next/font/google";
import Link from "next/link";
import { BuyerNavLink } from "@/components/buyer-nav-link";
import { SellerNavLink } from "@/components/seller-nav-link";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";
import "./globals.css";

const lrSans = Spline_Sans({
  variable: "--font-lr-sans",
  subsets: ["latin"],
});

const lrSerif = Fraunces({
  variable: "--font-lr-serif",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "LocalRoots",
    template: "%s — LocalRoots",
  },
  description: "Local pickup marketplace for produce and food",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lrSans.variable} ${lrSerif.variable} ${geistMono.variable} lr-body antialiased`}
      >
        <Providers>
          <div className="mx-auto max-w-5xl px-6 py-10">
            <header className="flex flex-wrap items-end justify-between gap-4">
              <Link href="/" className="group grid gap-1">
                <div className="text-xl font-semibold tracking-tight">
                  <span className="font-[family-name:var(--font-lr-serif)]">
                    LocalRoots
                  </span>
                </div>
                <div className="text-sm text-[color:var(--lr-muted)] group-hover:text-[color:var(--lr-ink)]">
                  Seasonal food, sold by neighbors.
                </div>
              </Link>

              <nav className="flex flex-wrap items-center gap-2 text-sm">
                <Link className="lr-btn px-4 py-2 text-[color:var(--lr-ink)]" href="/stores">
                  Browse
                </Link>
                <BuyerNavLink />
                <SellerNavLink />
              </nav>
            </header>

            <main className="mt-10">{children}</main>
          </div>

          <div className="mt-16">
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}

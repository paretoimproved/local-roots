import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LocalRoots",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 text-zinc-950`}
      >
        <div className="mx-auto max-w-5xl px-6 py-10">
          <header className="flex items-baseline justify-between">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              LocalRoots
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-600">
              <Link className="hover:text-zinc-950" href="/stores">
                Stores
              </Link>
              <a
                className="hover:text-zinc-950"
                href="https://github.com/paretoimproved/local-roots"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </nav>
          </header>
          <main className="mt-10">{children}</main>
        </div>
      </body>
    </html>
  );
}

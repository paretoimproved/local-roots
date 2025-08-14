import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "@/components/layout/header";
import Image from "next/image";

const quicksand = Quicksand({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  title: "LocalRoots - CSA Marketplace",
  description: "Find and subscribe to local farm CSA shares near you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider 
      appearance={{
        baseTheme: undefined, // Use light theme
        variables: {
          colorPrimary: '#4F7942', // Farm green
          colorText: '#1F2937', // Gray-800
          colorTextSecondary: '#6B7280', // Gray-500
        },
        elements: {
          formButtonPrimary: 'bg-farm-green hover:bg-farm-green-dark text-white',
          footerActionLink: 'text-farm-green hover:text-farm-green-dark'
        }
      }}
    >
      <html lang="en">
        <body className={`${quicksand.variable} font-sans bg-farm-earth-light`}>
          <Header />
          <main>{children}</main>
          <footer className="border-t py-8 mt-24 bg-white">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <Image
                    src="/images/local-roots-logo.png"
                    width={120}
                    height={120}
                    alt="LocalRoots Logo"
                    className="h-10 w-auto rounded-full"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} LocalRoots. All rights reserved.
                </div>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
} 
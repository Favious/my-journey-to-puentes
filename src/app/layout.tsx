import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "My journey to Puentes",
  description: "My journey to Puentes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* Logo in bottom left corner - clickable to redirect to Antigravity Capital */}
        <div className="fixed bottom-5 left-5 z-50">
          <a
            href="https://antigravity.capital/"
            target="_blank"
            rel="noopener noreferrer"
            className="block cursor-pointer hover:opacity-80 transition-opacity duration-200"
          >
            <div className="text-center">
              <p className="text-xs text-white-500 mb-1">Powered by</p>
              <Image
                src="/antigravityLogo.avif"
                alt="Antigravity Logo"
                width={80}
                height={80}
                className="object-contain"
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </div>
          </a>
        </div>
        {children}
      </body>
    </html>
  );
}

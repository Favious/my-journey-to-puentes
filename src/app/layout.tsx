import type { Metadata } from "next";
import "./globals.css";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Journeys to Puentes",
  description: "A showcase of successful stories",
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
        <div className="fixed bottom-5 left-5 z-50 mix-blend-difference">
          <a
            href="https://antigravity.capital/"
            target="_blank"
            rel="noopener noreferrer"
            className="block cursor-pointer hover:opacity-80 transition-opacity duration-200"
          >
            <div className="text-center ">
              <p className="text-xs text-white mb-1">Powered by</p>
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

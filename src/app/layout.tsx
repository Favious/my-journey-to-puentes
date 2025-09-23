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
        {/* Logo in top left corner */}
        <div className="fixed bottom-5 left-5 z-50">
          <Image
            src="/antigravityLogo.avif"
            alt="Antigravity Logo"
            width={80}
            height={80}
            className="object-contain"
            priority
          />
        </div>
        {children}
      </body>
    </html>
  );
}

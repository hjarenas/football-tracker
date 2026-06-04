import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dienstagskicken",
  description: "Fußball-Tracker für den Dienstagskicken-Verein Weißkirchen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}

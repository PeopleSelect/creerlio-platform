import "./globals.css";
import { ReactNode } from "react";
import { Providers } from "@/components/providers";

export const metadata = {
  title: "Creerlio Platform",
  description: "AI Powered Talent and Business Platform",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

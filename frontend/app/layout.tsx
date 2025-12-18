import "./globals.css";
import { ReactNode } from "react";
import Script from "next/script";
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
        <Script id="password-truncate" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined') {
              document.addEventListener('submit', (e) => {
                const inputs = e.target.querySelectorAll('input[type="password"]');
                inputs.forEach(input => {
                  if (input.value) {
                    const passwordBytes = new TextEncoder().encode(input.value);
                    if (passwordBytes.length > 72) {
                      const truncated = new TextDecoder().decode(passwordBytes.slice(0, 72));
                      input.value = truncated;
                    }
                  }
                });
              }, true);
            }
          `}
        </Script>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { ClerkProviderThemed } from "@/components/clerk-provider-themed";
import { SwrProvider } from "@/components/swr-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CarrerAdemy",
  description: "Trilha personalizada de carreira com onboarding e IA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <SwrProvider>
            <ClerkProviderThemed>
              {children}
            </ClerkProviderThemed>
          </SwrProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

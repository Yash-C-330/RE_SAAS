import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const clerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("...") &&
  !!process.env.CLERK_SECRET_KEY &&
  !process.env.CLERK_SECRET_KEY.includes("...");

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "AI Property Manager Autopilot",
  description: "Automated rent reminders, maintenance, lease renewals, and owner reports for independent landlords.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en">
      <body className={`${sora.variable} ${jetbrains.variable} antialiased`}>
        {children}
      </body>
    </html>
  );

  return (
    clerkConfigured ? <ClerkProvider>{content}</ClerkProvider> : content
  );
}


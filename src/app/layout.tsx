import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Test",
  description: "A 54-question career-orientation and activity test with AI interpretation.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children as React.ReactElement;
}

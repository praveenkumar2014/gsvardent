import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verdent — AI Engineering Workspace",
  description: "Plan, build, review and deliver software with controlled AI workflows.",
  applicationName: "Verdent"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

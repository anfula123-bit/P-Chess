import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChessMaster — Professional Chess Game",
  description: "Play chess against AI or friends with full rule implementation, multiple game modes, timers, and beautiful responsive design.",
  keywords: ["chess", "game", "AI", "strategy", "board game"],
  authors: [{ name: "ChessMaster" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" data-board-theme="classic" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

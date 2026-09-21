import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthStatus } from "@/components/auth-status";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const THEME_INIT_SCRIPT = `
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.dataset.theme = "dark";
    }
  } catch (e) {}
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project Planner",
  description: "Pick a tech stack and track your project against it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Project Planner
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AuthStatus />
          </div>
        </header>
        {children}
        <footer className="border-t border-border px-6 py-3 text-center text-xs text-gray-400">
          UI components from{" "}
          <a href="https://skiper-ui.com" className="underline" target="_blank" rel="noreferrer">
            Skiper UI
          </a>{" "}
          &amp;{" "}
          <a href="https://www.vengenceui.com" className="underline" target="_blank" rel="noreferrer">
            Vengeance UI
          </a>
        </footer>
      </body>
    </html>
  );
}

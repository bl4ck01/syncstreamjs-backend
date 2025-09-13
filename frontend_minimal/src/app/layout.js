import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import Header from "@/components/ui/header.jsx";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "STREAMFLIX - Watch TV Shows & Movies Online",
  description: "Stream unlimited TV shows, movies, and live TV. Watch anywhere, anytime.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

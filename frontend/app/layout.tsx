import type React from "react"
import type { Metadata, Viewport } from "next"
import '@/app/globals.css';
import { Sidebar } from "@/components/sidebar"
import { SeasonStatusBanner } from "@/components/season-status-banner"
import { Inter, JetBrains_Mono } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "FPL Analyst - Your Strategic Advantage",
  description: "Comprehensive Fantasy Premier League analytics and insights",
}

export const viewport: Viewport = {
  themeColor: "#112024",
  colorScheme: "dark",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
      <body className="font-sans overflow-x-hidden">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <SeasonStatusBanner />
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

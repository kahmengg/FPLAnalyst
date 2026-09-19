import type React from "react"
import type { Metadata, Viewport } from "next"
import '@/app/globals.css';
import { Sidebar } from "@/components/sidebar"
import { SeasonStatusBanner } from "@/components/season-status-banner"
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
})

export const metadata: Metadata = {
  title: "FPL Analyst - Your Strategic Advantage",
  description: "Comprehensive Fantasy Premier League analytics and insights",
}

export const viewport: Viewport = {
  themeColor: "#F6F3EC",
  colorScheme: "light",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${newsreader.variable} antialiased`}>
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

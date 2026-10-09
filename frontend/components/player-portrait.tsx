"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

import { getPlayerPortraitUrl } from "@/lib/player-media"
import { getTeamBrand } from "@/lib/team-branding"
import { cn } from "@/lib/utils"

type PlayerPortraitProps = {
  name: string
  photoCode?: number | null
  teamCode?: string
  size?: "sm" | "md" | "lg"
  priority?: boolean
  className?: string
}

const sizeClasses = {
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-sm",
  lg: "h-24 w-24 text-xl",
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : parts[0]?.slice(0, 2) || "FP").toUpperCase()
}

export function PlayerPortrait({
  name,
  photoCode = null,
  teamCode = "FPL",
  size = "md",
  priority = false,
  className,
}: PlayerPortraitProps) {
  const source = getPlayerPortraitUrl(photoCode, size === "lg" ? 250 : 110)
  const [failed, setFailed] = useState(false)
  const brand = getTeamBrand(teamCode)

  useEffect(() => setFailed(false), [source])

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-2xl border bg-surface-tint",
        sizeClasses[size],
        className,
      )}
      style={{ borderColor: brand.border }}
    >
      {source && !failed ? (
        <Image
          src={source}
          alt={`${name} portrait`}
          fill
          sizes={size === "lg" ? "96px" : size === "md" ? "56px" : "40px"}
          className="object-cover object-top"
          priority={priority}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          aria-label={`${name} initials portrait`}
          className="grid h-full w-full place-items-center font-mono font-bold tracking-wide"
          style={{ backgroundColor: brand.background, color: brand.foreground }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  )
}

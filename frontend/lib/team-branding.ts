export type TeamBrand = {
  background: string
  foreground: string
  border: string
}

// Club identity is deliberately isolated from the neutral application shell.
const TEAM_BRANDS: Record<string, TeamBrand> = {
  ARS: { background: "#C8102E", foreground: "#FFFFFF", border: "#A00D24" },
  AVL: { background: "#7A003C", foreground: "#B8D8F0", border: "#5A002A" },
  BOU: { background: "#DA291C", foreground: "#FFFFFF", border: "#9F1E16" },
  BRE: { background: "#E30613", foreground: "#FFFFFF", border: "#B3000B" },
  BHA: { background: "#0057B8", foreground: "#FFFFFF", border: "#003F87" },
  BUR: { background: "#6C1D45", foreground: "#B9D6F2", border: "#4A1230" },
  CHE: { background: "#034694", foreground: "#FFFFFF", border: "#003087" },
  COV: { background: "#69B3E7", foreground: "#132738", border: "#4C93C2" },
  CRY: { background: "#1B458F", foreground: "#FFFFFF", border: "#143A6F" },
  EVE: { background: "#003399", foreground: "#FFFFFF", border: "#002875" },
  FUL: { background: "#F8F7F2", foreground: "#171816", border: "#65665F" },
  HUL: { background: "#F5A12D", foreground: "#171816", border: "#D88916" },
  IPS: { background: "#0044AA", foreground: "#FFFFFF", border: "#003580" },
  LEE: { background: "#F8F7F2", foreground: "#1D3D7B", border: "#D2AD00" },
  LIV: { background: "#C8102E", foreground: "#FFFFFF", border: "#A00D24" },
  MCI: { background: "#6CABDD", foreground: "#142A38", border: "#4A90C0" },
  MUN: { background: "#DA291C", foreground: "#FFFFFF", border: "#B3000B" },
  NEW: { background: "#242522", foreground: "#FFFFFF", border: "#10110F" },
  NFO: { background: "#DD0000", foreground: "#FFFFFF", border: "#B30000" },
  SUN: { background: "#E00016", foreground: "#FFFFFF", border: "#B90012" },
  TOT: { background: "#F8F7F2", foreground: "#132257", border: "#98A0AE" },
  WHU: { background: "#7A263A", foreground: "#F4D9C4", border: "#591C2A" },
  WOL: { background: "#FDB913", foreground: "#171816", border: "#D9A00E" },
}

const FALLBACK_BRAND: TeamBrand = {
  background: "#E5E0D6",
  foreground: "#20221F",
  border: "#BFB8AC",
}

const TEAM_ALIASES: Record<string, string> = {
  arsenal: "ARS",
  "aston villa": "AVL",
  bournemouth: "BOU",
  brentford: "BRE",
  brighton: "BHA",
  burnley: "BUR",
  chelsea: "CHE",
  coventry: "COV",
  "crystal palace": "CRY",
  everton: "EVE",
  fulham: "FUL",
  hull: "HUL",
  ipswich: "IPS",
  leeds: "LEE",
  liverpool: "LIV",
  "man city": "MCI",
  "manchester city": "MCI",
  "man utd": "MUN",
  "man united": "MUN",
  "manchester united": "MUN",
  newcastle: "NEW",
  "newcastle united": "NEW",
  "nott'm forest": "NFO",
  "nottingham forest": "NFO",
  sunderland: "SUN",
  spurs: "TOT",
  tottenham: "TOT",
  "tottenham hotspur": "TOT",
  "west ham": "WHU",
  wolves: "WOL",
  wolverhampton: "WOL",
}

export function getTeamCode(teamNameOrCode: string): string {
  const normalized = teamNameOrCode.trim()
  if (!normalized) return "FPL"
  if (normalized.length <= 3) return normalized.toUpperCase()
  return TEAM_ALIASES[normalized.toLowerCase()] ?? normalized.slice(0, 3).toUpperCase()
}

export function getTeamBrand(teamCode: string): TeamBrand {
  return TEAM_BRANDS[getTeamCode(teamCode)] ?? FALLBACK_BRAND
}

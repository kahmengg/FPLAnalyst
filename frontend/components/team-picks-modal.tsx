"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Target, Shield, TrendingUp, Users } from "lucide-react"

const PositionBadge = ({ position }: { position: string }) => {
  const positionMap = {
    Goalkeeper: "GK",
    Defender: "DEF",
    Midfielder: "MID",
    Forward: "FWD",
  }

  const normalizedPosition = positionMap[position as keyof typeof positionMap] || position

  const colors = {
    GK: "bg-purple-100 text-purple-800 border-purple-200",
    DEF: "bg-blue-100 text-blue-800 border-blue-200",
    MID: "bg-green-100 text-green-800 border-green-200",
    FWD: "bg-red-100 text-red-800 border-red-200",
  }

  return (
    <Badge
      variant="outline"
      className={`text-xs font-mono font-bold rounded-full border ${colors[normalizedPosition as keyof typeof colors] || "bg-teal-50 text-teal-700 border-teal-500"}`}
    >
      {normalizedPosition}
    </Badge>
  )
}

const getRecommendation = (player: any) => {
  const { points_per_game, form, position_name, attacker_score = 0, defender_score = 0, selected_by_percent } = player

  const isAttacker = position_name === 'Midfielder' || position_name === 'Forward'
  const score = isAttacker ? attacker_score : defender_score

  const categories = [
    {
      condition: (isAttacker && score >= 2.2) || (!isAttacker && score >= 3.0) || (points_per_game >= 6.0 && form >= 5.0),
      label: "⭐ Top Pick",
      className: "text-green-800 dark:text-green-200 font-medium",
    },
    {
      condition: ((isAttacker && score >= 1.6) || (!isAttacker && score >= 2.3)) && selected_by_percent < 15,
      label: "🎯 Differential",
      className: "text-purple-800 dark:text-purple-200 font-medium",
    },
    {
      condition: (isAttacker && score >= 1.5) || (!isAttacker && score >= 2.0),
      label: "📊 Solid Choice",
      className: "text-blue-800 dark:text-blue-200 font-medium",
    },
    {
      condition: (isAttacker && score >= 1.0) || (!isAttacker && score >= 1.5),
      label: "🔍 Monitor",
      className: "text-orange-800 dark:text-orange-200 font-medium",
    },
    {
      condition: true,
      label: "⚠️ Risky",
      className: "text-yellow-800 dark:text-yellow-200 font-medium",
    },
  ]

  return categories.find(cat => cat.condition) || categories[categories.length - 1]
}

const getOwnershipCategory = (ownership: number) => {
  const categories = [
    {
      condition: ownership < 10,
      label: "🎯 Differential",
      className: "text-purple-800 dark:text-purple-200",
    },
    {
      condition: ownership >= 10 && ownership < 30,
      label: "🔹 Low Owned",
      className: "text-blue-800 dark:text-blue-200",
    },
    {
      condition: ownership >= 30 && ownership < 60,
      label: "⚖️ Moderate",
      className: "text-gray-800 dark:text-gray-200",
    },
    {
      condition: ownership >= 60 && ownership < 80,
      label: "📈 Popular",
      className: "text-orange-800 dark:text-orange-200",
    },
    {
      condition: ownership >= 80,
      label: "🏆 Template",
      className: "text-green-800 dark:text-green-200",
    },
  ]
  return categories.find(cat => cat.condition) || categories[categories.length - 1]
}

interface TeamPicksModalProps {
  isOpen: boolean
  onClose: () => void
  teamName: string
  teamCode: string
  attackingPlayers: any[]
  defensivePlayers: any[]
  attackRank?: number
  defenseRank?: number
}

export default function TeamPicksModal({
  isOpen,
  onClose,
  teamName,
  teamCode,
  attackingPlayers,
  defensivePlayers,
  attackRank,
  defenseRank,
}: TeamPicksModalProps) {
  const [activeTab, setActiveTab] = useState<"attacking" | "defensive">("attacking")

  if (!isOpen) return null

  const hasAttackingPicks = attackingPlayers && attackingPlayers.length > 0
  const hasDefensivePicks = defensivePlayers && defensivePlayers.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background rounded-xl shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-2xl font-bold">
                {teamCode}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{teamName}</h2>
                <p className="text-sm text-muted-foreground">Quick Picks & Player Recommendations</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Rank Badges */}
          <div className="flex gap-3 mt-4">
            {attackRank && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <Target className="h-3 w-3 mr-1" />
                Attack Rank: #{attackRank}
              </Badge>
            )}
            {defenseRank && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Shield className="h-3 w-3 mr-1" />
                Defense Rank: #{defenseRank}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!hasAttackingPicks && !hasDefensivePicks ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Quick Picks Available</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                This team doesn't appear in the top attacking or defensive rankings for Quick Picks.
              </p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "attacking" | "defensive")}>
              <TabsList className="w-full grid grid-cols-2 mb-6">
                <TabsTrigger
                  value="attacking"
                  disabled={!hasAttackingPicks}
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white"
                >
                  <Target className="h-4 w-4" />
                  Attacking Picks {hasAttackingPicks && `(${attackingPlayers.length})`}
                </TabsTrigger>
                <TabsTrigger
                  value="defensive"
                  disabled={!hasDefensivePicks}
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                >
                  <Shield className="h-4 w-4" />
                  Defensive Picks {hasDefensivePicks && `(${defensivePlayers.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="attacking" className="mt-0">
                {hasAttackingPicks ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {attackingPlayers.map((player, index) => {
                      const ownershipCat = getOwnershipCategory(player.ownership)
                      const recommendation = getRecommendation(player)
                      const isTopPick = recommendation.label.includes("Top Pick")

                      return (
                        <Card
                          key={`${player.name}-${index}`}
                          className={`relative border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                            isTopPick
                              ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 via-card to-card'
                              : 'border-border/50 hover:border-red-400/50 bg-gradient-to-br from-card to-secondary/10'
                          }`}
                        >
                          {isTopPick && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-500" />
                          )}

                          <CardContent className="p-4">
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-foreground">{player.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  £{player.price}m
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <PositionBadge position={player.position} />
                              </div>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Points/Game:</span>
                                <span className="font-semibold">{player.points_pg?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Goals/Game:</span>
                                <span className="font-semibold">{player.goals_pg?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Assists/Game:</span>
                                <span className="font-semibold">{player.assists_pg?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Form:</span>
                                <span className="font-semibold">{player.form?.toFixed(1) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Ownership:</span>
                                <span className={`text-xs font-medium ${ownershipCat.className}`}>
                                  {player.ownership?.toFixed(1)}% {ownershipCat.label}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="flex items-center justify-between text-xs">
                                <span className={recommendation.className}>{recommendation.label}</span>
                                <Badge variant="secondary" className="text-xs">
                                  Score: {player.attacker_score?.toFixed(2) || 'N/A'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No attacking picks available for this team
                  </div>
                )}
              </TabsContent>

              <TabsContent value="defensive" className="mt-0">
                {hasDefensivePicks ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {defensivePlayers.map((player, index) => {
                      const ownershipCat = getOwnershipCategory(player.ownership)
                      const recommendation = getRecommendation(player)
                      const isTopPick = recommendation.label.includes("Top Pick")

                      return (
                        <Card
                          key={`${player.name}-${index}`}
                          className={`relative border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                            isTopPick
                              ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 via-card to-card'
                              : 'border-border/50 hover:border-blue-400/50 bg-gradient-to-br from-card to-secondary/10'
                          }`}
                        >
                          {isTopPick && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-500" />
                          )}

                          <CardContent className="p-4">
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-foreground">{player.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  £{player.price}m
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <PositionBadge position={player.position} />
                              </div>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Points/Game:</span>
                                <span className="font-semibold">{player.points_pg?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Clean Sheet %:</span>
                                <span className="font-semibold">{player.cs_rate ? `${(player.cs_rate * 100).toFixed(1)}%` : 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Form:</span>
                                <span className="font-semibold">{player.form?.toFixed(1) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Ownership:</span>
                                <span className={`text-xs font-medium ${ownershipCat.className}`}>
                                  {player.ownership?.toFixed(1)}% {ownershipCat.label}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="flex items-center justify-between text-xs">
                                <span className={recommendation.className}>{recommendation.label}</span>
                                <Badge variant="secondary" className="text-xs">
                                  Score: {player.defender_score?.toFixed(2) || 'N/A'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No defensive picks available for this team
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, AlertCircle, RepeatIcon } from "lucide-react"

const transfersIn = [
  {
    player: "Mohamed Salah",
    team: "LIV",
    position: "MID",
    price: 13.2,
    reason: "Easy fixtures",
    expectedPoints: 42,
    fixtures: [1, 2, 1, 2, 1],
  },
  {
    player: "Alexander Isak",
    team: "NEW",
    position: "FWD",
    price: 8.9,
    reason: "Form + Fixtures",
    expectedPoints: 38,
    fixtures: [2, 1, 2, 1, 2],
  },
  {
    player: "Gabriel Martinelli",
    team: "ARS",
    position: "MID",
    price: 7.0,
    reason: "Value pick",
    expectedPoints: 32,
    fixtures: [2, 2, 1, 2, 1],
  },
  {
    player: "Chris Wood",
    team: "NFO",
    position: "FWD",
    price: 6.4,
    reason: "Budget option",
    expectedPoints: 28,
    fixtures: [2, 3, 2, 1, 2],
  },
]

const transfersOut = [
  {
    player: "Bukayo Saka",
    team: "ARS",
    position: "MID",
    price: 10.3,
    reason: "Injury risk",
    fixtures: [4, 4, 5, 4, 5],
  },
  {
    player: "Son Heung-min",
    team: "TOT",
    position: "MID",
    price: 9.9,
    reason: "Hard fixtures",
    fixtures: [4, 5, 4, 5, 4],
  },
  {
    player: "Dominic Solanke",
    team: "TOT",
    position: "FWD",
    price: 7.8,
    reason: "Poor form",
    fixtures: [4, 5, 4, 5, 4],
  },
]

const difficultyColors = {
  1: "bg-accent",
  2: "bg-chart-3",
  3: "bg-chart-4",
  4: "bg-chart-2",
  5: "bg-destructive",
}

export default function TransferStrategyPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold text-foreground flex items-center gap-3">
        <RepeatIcon className="h-8 w-8 text-red-500" />
        Transfer Strategy
        </h1>
        <p className="text-lg text-muted-foreground">Multi-gameweek planning and transfer recommendations</p>
      </div>

      {/* Strategy Overview */}
      <Card className="mb-8 border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Next 5 Gameweeks Overview</CardTitle>
          <CardDescription>Strategic planning for GW 15-19</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-accent/10 p-4">
              <p className="mb-1 text-sm text-muted-foreground">Best Period</p>
              <p className="text-2xl font-bold text-accent">GW 15-17</p>
              <p className="text-xs text-muted-foreground">Target: LIV, NEW, NFO assets</p>
            </div>
            <div className="rounded-lg bg-chart-4/10 p-4">
              <p className="mb-1 text-sm text-muted-foreground">Moderate Period</p>
              <p className="text-2xl font-bold text-chart-4">GW 18</p>
              <p className="text-xs text-muted-foreground">Hold transfers if possible</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-4">
              <p className="mb-1 text-sm text-muted-foreground">Difficult Period</p>
              <p className="text-2xl font-bold text-destructive">GW 19</p>
              <p className="text-xs text-muted-foreground">Avoid: TOT, MUN, WHU assets</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfers In */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-accent" />
          <h2 className="text-2xl font-bold text-foreground">Recommended Transfers IN</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {transfersIn.map((player) => (
            <Card key={player.player} className="border-accent/50 bg-card">
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="mb-1 text-lg font-bold text-foreground">{player.player}</h3>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {player.team}
                      </Badge>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {player.position}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xl font-bold text-accent">£{player.price}m</p>
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reason</span>
                    <span className="font-medium text-accent">{player.reason}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expected Points (5 GWs)</span>
                    <span className="font-mono font-bold text-foreground">{player.expectedPoints}</span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Next 5 Fixtures</p>
                  <div className="flex gap-1">
                    {player.fixtures.map((diff, i) => (
                      <div
                        key={i}
                        className={`flex h-8 flex-1 items-center justify-center rounded ${difficultyColors[diff]} font-mono text-xs font-bold text-background`}
                      >
                        {diff}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Transfers Out */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <TrendingDown className="h-6 w-6 text-destructive" />
          <h2 className="text-2xl font-bold text-foreground">Consider Transferring OUT</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {transfersOut.map((player) => (
            <Card key={player.player} className="border-destructive/50 bg-card">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="mb-1 text-lg font-bold text-foreground">{player.player}</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {player.team}
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {player.position}
                    </Badge>
                  </div>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">£{player.price}m</p>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">{player.reason}</span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Next 5 Fixtures</p>
                  <div className="flex gap-1">
                    {player.fixtures.map((diff, i) => (
                      <div
                        key={i}
                        className={`flex h-8 flex-1 items-center justify-center rounded ${difficultyColors[diff]} font-mono text-xs font-bold text-background`}
                      >
                        {diff}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Strategic Tips */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Strategic Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-3 rounded-lg bg-secondary p-4">
              <div className="text-accent">💡</div>
              <div>
                <p className="font-medium text-foreground">Bank a transfer this week</p>
                <p className="text-sm text-muted-foreground">
                  Save your free transfer to have 2 available for GW 16 when fixture swings occur
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg bg-secondary p-4">
              <div className="text-chart-3">⚡</div>
              <div>
                <p className="font-medium text-foreground">Target Liverpool assets</p>
                <p className="text-sm text-muted-foreground">
                  Liverpool have the best fixture run from GW 15-19 with 4 green fixtures
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg bg-secondary p-4">
              <div className="text-chart-2">🎯</div>
              <div>
                <p className="font-medium text-foreground">Captain rotation strategy</p>
                <p className="text-sm text-muted-foreground">
                  Consider Salah (GW15), Haaland (GW16), Isak (GW17) for captaincy based on fixtures
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

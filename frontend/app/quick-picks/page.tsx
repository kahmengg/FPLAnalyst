import { redirect } from "next/navigation"

export default function QuickPicksRedirect() {
  // Keep old bookmarks working while the Transfer Planner absorbs recommendations.
  redirect("/transfer-targets")
}

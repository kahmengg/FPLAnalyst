const positionNames = ["", "Goalkeeper", "Defender", "Midfielder", "Forward"];
export function researchHref(destination: string, context: URLSearchParams) {
  const [path, search = ""] = destination.split("?");
  const target = new URLSearchParams(search);
  for (const key of ["gw", "horizon", "position", "players", "window", "out"]) {
    if (!target.has(key) && context.has(key))
      target.set(key, context.get(key)!);
  }
  const position = target.get("position");
  if (position && positionNames[Number(position)])
    target.set("position", positionNames[Number(position)]);
  const clubKey = path === "/transfer-targets" ? "team" : "club";
  const club = context.get("club") || context.get("team");
  if (club && !target.has(clubKey)) target.set(clubKey, club);
  return `${path}${target.size ? `?${target}` : ""}`;
}

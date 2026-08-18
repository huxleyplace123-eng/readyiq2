#!/usr/bin/env bash
# scripts/shots.sh — screenshot every surface of the v11-look build with local headless Chrome.
# Usage: node serve.mjs &  then  bash scripts/shots.sh [outdir]   (default docs/shots)
set -euo pipefail
OUT="${1:-docs/shots}"; mkdir -p "$OUT"; OUT="$(cd "$OUT" && { pwd -W 2>/dev/null || pwd; })"   # Chrome wants a Windows path on Windows
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
BASE="${BASE:-http://localhost:4620}"
shot() { # name url [width height]
  local w="${3:-1440}" h="${4:-1000}"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size="${w},${h}" --virtual-time-budget=4000 \
    --screenshot="$OUT/$1.png" "$BASE/$2" >/dev/null 2>&1 && echo "  $1"
}
echo "→ $OUT"
shot 01-website            "?mode=marketing"                       1440 3600
shot 02-lo-start           "?mode=lender&lpage=start"
shot 03-lo-link            "?mode=lender&lpage=link"
shot 04-lo-feed            "?mode=lender&lpage=borrowers"
shot 05-lo-partners        "?mode=lender&lpage=partners"
shot 06-lo-overview        "?mode=lender&lpage=overview"
shot 07-lo-journeys        "?mode=lender&lpage=campaigns"
shot 08-lo-organization    "?mode=lender&lpage=organization"
shot 09-door-invite        "?mode=consumer"
shot 10-door-lo-link       "?c=summit-jlee"
shot 11-door-partner       "?c=summit-dkim"
shot 12-door-public        "?mode=consumer&c=public"
shot 13-consumer-consent   "?mode=consumer&cpage=consent"
shot 14-consumer-result    "?mode=consumer&cpage=result"          1440 1600
shot 15-consumer-plan      "?mode=consumer&cpage=plan"            1440 1400
shot 16-consumer-disputes  "?mode=consumer&cpage=disputes"        1440 1400
shot 17-consumer-reporting "?mode=consumer&cpage=reporting"       1440 1400
shot 18-consumer-progress  "?mode=consumer&cpage=progress"        1440 1400
shot 19-consumer-guardian  "?mode=consumer&cpage=guardian"
shot 20-integrations       "?mode=integrations"                   1440 2200
shot 21-passport           "?mode=consumer&cpage=passport"        1440 1250
shot 22-passport-public    "?passport=RIQ-7F2A-MC"                1440 1100
shot 23-guide              "?guide=1"                             1440 1000
shot 24-lo-journeys-revival "?mode=lender&lpage=campaigns"        1440 1100
shot 25-door-building-es   "?c=summit-palms&lang=es"              1440 1000
shot m1-website-mobile     "?mode=marketing"                       390 1600
shot m2-result-mobile      "?mode=consumer&cpage=result"          390 1600
shot m3-lo-link-mobile     "?mode=lender&lpage=link"              390 1400
echo "done"

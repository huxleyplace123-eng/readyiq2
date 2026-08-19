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
shot 01-website            "demo/?mode=marketing"                       1440 3600
shot 02-lo-start           "demo/?mode=lender&lpage=start"
shot 03-lo-link            "demo/?mode=lender&lpage=link"
shot 04-lo-feed            "demo/?mode=lender&lpage=borrowers"
shot 05-lo-partners        "demo/?mode=lender&lpage=partners"
shot 06-lo-overview        "demo/?mode=lender&lpage=overview"
shot 07-lo-journeys        "demo/?mode=lender&lpage=campaigns"
shot 08-lo-organization    "demo/?mode=lender&lpage=organization"
shot 09-door-invite        "demo/?mode=consumer"
shot 10-door-lo-link       "demo/?c=summit-jlee"
shot 11-door-partner       "demo/?c=summit-dkim"
shot 12-door-public        "demo/?mode=consumer&c=public"
shot 13-consumer-consent   "demo/?mode=consumer&cpage=consent"
shot 14-consumer-result    "demo/?mode=consumer&cpage=result"          1440 1600
shot 15-consumer-plan      "demo/?mode=consumer&cpage=plan"            1440 1400
shot 16-consumer-disputes  "demo/?mode=consumer&cpage=disputes"        1440 1400
shot 17-consumer-reporting "demo/?mode=consumer&cpage=reporting"       1440 1400
shot 18-consumer-progress  "demo/?mode=consumer&cpage=progress"        1440 1400
shot 19-consumer-guardian  "demo/?mode=consumer&cpage=guardian"
shot 20-integrations       "demo/?mode=integrations"                   1440 2200
shot 21-passport           "demo/?mode=consumer&cpage=passport"        1440 1250
shot 22-passport-public    "demo/?passport=RIQ-7F2A-MC"                1440 1100
shot 23-guide              "demo/?guide=1"                             1440 1000
shot 24-lo-journeys-revival "demo/?mode=lender&lpage=campaigns"        1440 1100
shot 25-door-building-es   "demo/?c=summit-palms&lang=es"              1440 1000
shot m1-website-mobile     "demo/?mode=marketing"                       390 1600
shot m2-result-mobile      "demo/?mode=consumer&cpage=result"          390 1600
shot m3-lo-link-mobile     "demo/?mode=lender&lpage=link"              390 1400
shot site-home             ""                                     1440 2400
shot site-platform         "platform/"                            1440 2400
shot site-loan-officers    "loan-officers/"                       1440 2000
shot site-consumers        "consumers/"                           1440 2000
shot site-partners         "partners/"                            1440 1600
shot site-dispute          "products/dispute-hub/"                1440 1600
shot site-passport         "products/passport/"                   1440 1600
shot site-trust            "trust/"                               1440 2000
shot site-resources        "resources/"                           1440 1600
shot site-guide            "resources/guide/"                     1440 1600
shot site-book             "book-a-demo/"                         1440 900
shot site-signin           "sign-in/"                             1440 900
echo "done"

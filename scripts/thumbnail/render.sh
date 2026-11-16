#!/bin/bash
# Renders the CrazyGames thumbnails into dist/thumbnails/ with Chrome. Run: bash scripts/thumbnail/render.sh
cd "$(dirname "$0")"
OUT="$PWD/../../dist/thumbnails"; mkdir -p "$OUT"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for spec in "landscape 1920 1080" "portrait 800 1200" "square 800 800"; do
  read name w h <<< "$spec"
  for t in 1 0; do
    suffix=""; [ $t = 0 ] && suffix="-notext"
    TMP=$(mktemp -d); rm -f "$OUT/$name$suffix.png"
    "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TMP" --force-device-scale-factor=1 --no-first-run \
      --virtual-time-budget=2000 --window-size=$w,$h --screenshot="$OUT/$name$suffix.png" "file://$PWD/thumb.html?title=$t" >/dev/null 2>&1 &
    pid=$!
    for i in $(seq 1 40); do [ -s "$OUT/$name$suffix.png" ] && sleep 1 && break; sleep 0.5; done
    kill $pid 2>/dev/null; wait $pid 2>/dev/null; rm -rf "$TMP"
  done
done

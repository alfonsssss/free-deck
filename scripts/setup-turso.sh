#!/bin/bash
# Puts the Turso database address + token into the Render service (never in the code) and restarts it.
# Run: bash scripts/setup-turso.sh   (needs ~/.render-key from setup-keys.sh)
K="$(cat ~/.render-key 2>/dev/null)"; [ -z "$K" ] && { echo "Kör scripts/setup-keys.sh först."; exit 1; }
echo ""
echo "=== Turso ==="
echo "1. Logga in på https://app.turso.tech (med GitHub) och skapa en databas som heter free-deck."
echo "2. Öppna databasen. Kopiera adressen som börjar med libsql://"
open "https://app.turso.tech" 2>/dev/null
printf "Klistra in adressen (libsql://...) och tryck Enter: "
read -r URL; URL="$(echo "$URL" | tr -d '[:space:]')"
case "$URL" in libsql://*|https://*) ;; *) echo "Det ser inte ut som en Turso-adress – kör skriptet igen."; exit 1;; esac
echo "3. Klicka 'Create Token' på databasen och kopiera den."
printf "Klistra in token och tryck Enter (den syns inte): "
read -rs TOKEN; echo ""; TOKEN="$(echo "$TOKEN" | tr -d '[:space:]')"
[ -z "$TOKEN" ] && { echo "Ingen token – kör skriptet igen."; exit 1; }
# check the database answers
HTTPS="${URL/libsql:\/\//https://}"
if curl -sf -X POST "$HTTPS/v2/pipeline" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"requests":[{"type":"execute","stmt":{"sql":"SELECT 1"}},{"type":"close"}]}' >/dev/null; then echo "✔ Databasen svarar."
else echo "✖ Databasen svarade inte – kontrollera adress och token."; exit 1; fi
SID=$(curl -s -H "Authorization: Bearer $K" "https://api.render.com/v1/services?name=free-deck" | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['service']['id'])")
for kv in "TURSO_URL=$URL" "TURSO_TOKEN=$TOKEN"; do
  key="${kv%%=*}"; val="${kv#*=}"
  curl -sf -X PUT "https://api.render.com/v1/services/$SID/env-vars/$key" -H "Authorization: Bearer $K" -H "Content-Type: application/json" \
    -d "$(python3 -c 'import json,sys;print(json.dumps({"value":sys.argv[1]}))' "$val")" >/dev/null || { echo "✖ Kunde inte spara $key i Render."; exit 1; }
done
curl -sf -X POST "https://api.render.com/v1/services/$SID/deploys" -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{}' >/dev/null
echo "✔ Sparat i Render – servern startar om med databasen (tar några minuter)."
echo ""
echo "Klart! Skriv 'klart' till Claude i chatten."

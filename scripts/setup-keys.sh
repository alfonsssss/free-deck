#!/bin/bash
# Saves the Render API key on this Mac (never in the code) and logs in to Turso.
# Run: bash scripts/setup-keys.sh
echo ""
echo "=== 1/2  Render ==="
echo "Skapa en nyckel på https://dashboard.render.com/u/settings#api-keys (Create API Key)."
open "https://dashboard.render.com/u/settings#api-keys" 2>/dev/null
printf "Klistra in nyckeln här och tryck Enter (den syns inte när du klistrar): "
read -rs KEY; echo ""
KEY="$(echo "$KEY" | tr -d '[:space:]')"
if [ -z "$KEY" ]; then echo "Ingen nyckel – kör skriptet igen."; exit 1; fi
umask 077; printf "%s" "$KEY" > ~/.render-key
if curl -sf -H "Authorization: Bearer $KEY" https://api.render.com/v1/owners?limit=1 >/dev/null; then echo "✔ Render-nyckeln fungerar och är sparad."; else echo "✖ Render svarade inte på nyckeln – kontrollera att du kopierade hela."; exit 1; fi

echo ""
echo "=== 2/2  Turso ==="
if ! command -v turso >/dev/null; then echo "Installerar Turso..."; brew install tursodatabase/tap/turso || exit 1; fi
turso auth login && echo "✔ Inloggad på Turso."
echo ""
echo "Klart! Skriv 'klart' till Claude i chatten."

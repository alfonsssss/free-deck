# Free Deck (Kortbord)

Spela kort med vänner i webbläsaren – eller mot datorn. Inga konton.

## Starta

```bash
npm install
npm start          # http://localhost:5178
```

Kräver Node 22.5 eller senare (databasen använder Nodes inbyggda SQLite).

## Inställningar (valfria miljövariabler)

| Variabel | Standard | Vad |
|---|---|---|
| `PORT` | `5178` | Port för webbservern |
| `KORTBORD_DB` | `data/kortbord.db` | Databasfil för community-spel, spelningar och rapporter |
| `KORTBORD_SERVER` | – | Bara vid bygget för CrazyGames: serverns adress (`wss://…`) |

Databasen skapas automatiskt första gången. Spel från den gamla `data/templates.json` importeras då.

## Struktur

- `engines/` – reglerna för de 8 spelen (en fil per spel) + datorspelare
- `engine-room.js` – rum med platser, lobby, datorspelare och tappad uppkoppling
- `server.js` – webbserver, WebSocket, fritt bord / egna spel, community
- `db.js` – SQLite: community-spel, spelningar (en per rum och runda), rapporter
- `public/` – webbsidan (`index.html` startsida + fritt bord, `engine.js/.css` spelbordet, `i18n.js` texter, `platform.js` CrazyGames/webb)
- `engines/i18n.js` – spelens texter på svenska och engelska
- `scripts/build-crazygames.js` – bygger zip-filen för CrazyGames
- `scripts/build-rules.js` – packar `engines/` + `engine-room.js` till `public/rules.js` (körs av `npm start` och CrazyGames-bygget, redigera aldrig rules.js för hand)
- `public/local.js` – spel mot datorn körs i webbläsaren med samma regler, utan server. Servern behövs bara för att spela med vänner

## Publicera på CrazyGames

Spel mot datorn fungerar helt utan server. Utan `KORTBORD_SERVER` döljs Bjud in och rumskoder. För multiplayer måste servern ligga på en egen webbtjänst med `wss://`.

1. **Lägg ut servern.** Den kör i Docker (`Dockerfile`), och för Render finns `render.yaml` med en disk för databasen.
   Kontrollera att `https://<din-server>/health` svarar `ok`.
2. **Bygg CrazyGames-versionen:**
   ```bash
   KORTBORD_SERVER=wss://<din-server> npm run build:crazygames
   ```
   Resultatet blir `dist/free-deck-crazygames.zip`.
3. **Ladda upp zip-filen** i CrazyGames Developer Portal (Basic Launch). Välj liggande läge, lobbystorlek 1–6 och ange
   att spelet har engelska och svenska.

CrazyGames-versionen har deras SDK (laddning, spel/paus, inbjudningslänkar, rum, användarnamn, språk) men saknar
Community och "Skapa eget spel". Användarskapat innehåll kräver moderering där.

## Tester

```bash
npm test             # spelar alla spel dator-mot-dator till vinnare
npm run test:rooms   # kräver att servern kör (URL=ws://localhost:5178): rum, lobby, datorer, språk, community
```

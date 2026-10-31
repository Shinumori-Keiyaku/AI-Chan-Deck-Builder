# Ai-Chan Deck Building

A dark-fantasy deck builder for a card game, synced from Google Sheets. The app checks the sheet's `P1` update date on load, reuses a browser-local cache when it has not changed, and only downloads the full `N:P` range when the date changes.

## Run locally

```bash
npm install
copy .env.example .env   # Windows (PowerShell/CMD); use cp on macOS/Linux
# Put your Google Sheets API key in .env, then:
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

### Environment

```env
VITE_GOOGLE_SHEETS_API_KEY=your_key_here
VITE_SHEET_ID=1TDHBWj79saP6by70vFLPOMoUwoLMxdX19eYfD6eJXSY
VITE_SHEET_TAB=NewDataBase
```

- `VITE_GOOGLE_SHEETS_API_KEY` — Google Sheets API key. Enable the **Google Sheets API** in Google Cloud and create an API key. If this is blank, the app falls back to Google's public `gviz` viewer endpoint, which works when the sheet is shared publicly.
- `VITE_SHEET_ID` and `VITE_SHEET_TAB` are optional overrides. The defaults are the supplied sheet.

> A Vite API key is visible to the browser. Restrict the key to your site's HTTP referrers in Google Cloud. If the key must stay secret, put a small server-side proxy in front of the Sheets API and point the client at it instead.

## Sheet contract

The app reads `NewDataBase!N:P`.

| Cell / column | Contents |
| --- | --- |
| `N1:N` | Deckable cards, pipe-separated: `Name|Effect|Normal Cost|Gold Cost|ATK|HP|Group|Card Type|Image URL` |
| `O1:O` | Token cards in the same pipe-separated format. Tokens are shown as effect destinations but cannot be added to a deck. |
| `P1` | Sheet update date. Used as the cache version. |
| `P2` | Lua-style card groups, e.g. `doll={"Knight Doll","Suicide Doll"}`. |
| `P3:P` | Lua-style card effect tables, one card per table. |

Example effect:

```lua
{name="Rabina the Attacker",effects={{name="Add Mecha Enigma",effect={create={cards={"Mecha Enigma"},amount=1,hand=true}}}}}
```

Supported structured effects are `create`, `transform`, and `add`. Group references such as `cards=cardGroup.doll` are expanded using `P2`.

### IDs and codes

Deckable cards receive a 1-based sequence ID from their row in `N` (`N1` = `1`). The deck code uses the 2-digit base-35 representation of that ID with the alphabet `0-9A-Y`. Tokens are display-only and use a `T`-prefixed internal code.

## Caching and update flow

1. Read the cached snapshot from `localStorage` (`deckforge.sheet.v1`) and render it immediately when present.
2. Fetch **only `P1`**.
3. If the normalized date matches the cached version, stop. No `N:P` request is made.
4. If it differs, fetch `N:P`, parse cards, tokens, groups, and effects, save the snapshot locally, and replace the UI data.
5. If Google Sheets cannot be reached, the saved snapshot remains usable and the app shows an offline-copy notice.

The refresh button repeats this check on demand.

## Deck building

- Up to 3 copies of a deckable card.
- The standard deck size is 40. The builder allows going over 40 while experimenting and clearly marks the deck as over the limit.
- Deck state is saved in `localStorage` (`deckforge.deck.v1`).
- **Builder** tab: search names/effects/groups/destinations, filter by card type or group, sort by ID/name/group/type, and add cards.
- **Deck** tab: inspect the full deck and add or remove cards with the same controls.

### Destination chains

For cards with `create` or `transform` effects, the detail view follows destinations recursively. A shared seen-set starts with the card itself, so a name that was already displayed is marked as `loop / shown` and is not followed further.

### Deck code format

Copies are grouped by count, then each group is a run of `Z` markers followed by fixed 2-character card codes:

- `Z` = one copy of each following card
- `ZZ` = two copies
- `ZZZ` = three copies

Example: `Z0510A1ZZB2ZZZ42` means one copy of `05`, `10`, and `A1`; two copies of `B2`; and three copies of `42`.

The code dialog can both generate and load codes. Card IDs are positional, so a sheet reorder can change what an old code points to.

## Build

```bash
npm run typecheck
npm run build
npm run preview
```

The production build is written to `dist/`.

## Project structure

```text
src/
  App.tsx                 main layout and deck state wiring
  components/             cards, deck panel, deck view, dialogs, data states
  hooks/
    useSheetData.ts       P1 check, cache, update flow
    useDeck.ts            deck counts, limits, persistence
  lib/
    sheet.ts              Google Sheets fetch, parsing, cache
    lua.ts                Lua table parser and effect extraction
    deckCode.ts           base-35 generation and deck-code parsing
    cardGraph.ts          recursive create/transform destination graph
    format.ts             display helpers
```

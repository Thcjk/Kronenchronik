# Phase 1 – Die Welt zum Leben erwecken

Atmosphäre, Zoom-Stufen, lebendige Karte, emotionaler Einstieg. Keine neuen Kern-Mechaniken.

## Umgesetzt

- Zoom-LOD: weit / mittel / nah (Reichsgrenzen → Straßen/Burgen → Felder & Ambient)
- Organische Provinzen, Flüsse, Seen, Brücken, Straßen zwischen Siedlungen
- Terrain-Variation (Waldmuster, Berge, Sumpf-Optik)
- Ambient: Bauern, Händler, Soldaten, Schafe, Boote, Jäger, Rauch, wehende Fahnen
- Städte/Burgen wachsen optisch mit Level (Weiler → Hauptstadt, Palisade → Zitadelle)
- Pergament-UI, Wappen, stärkeres Charakterfenster
- Intro-Geschichte nach erstem Betreten eines Königreichs
- Registrierung zeigt Wappen + Wahlspruch-Vorschau

## Dateien

- `client/src/map/geometry.ts`
- `client/src/components/WorldMap.tsx`
- `client/src/components/IntroOverlay.tsx`
- `client/src/components/CharacterPanel.tsx`
- `client/src/lore/intro.ts`
- `client/src/pages/GamePage.tsx`, `RegisterPage.tsx`
- `client/src/index.css`

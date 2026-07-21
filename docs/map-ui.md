# Weltkarte – kompletter Neustart

Die alte Hex-/Kachel-Darstellung wurde **entfernt**, nicht verbessert.

## Was neu ist

- **Canvas-Renderer** (`WorldMap.tsx` + `map/worldMesh.ts` + `map/drawWorld.ts`)
- Organische, Voronoi-ähnliche Provinzformen – ungleiche Größen, natürliche Grenzen
- Pergament-Hintergrund, handgezeichnete Berge (Ketten), Baumgruppen, Flüsse, Straßen, Seen
- Siedlungen als gezeichnete Kompositionen (Dorf / Stadt / Metropole / Burg / Hauptstadt)
- Animationen: Rauch, Fahnen, Bäume, Schiffe, Händler, Bauern
- Zoom-LOD ohne sichtbares Raster

## Was unverändert bleibt

- Provinzdaten (`x`/`y` nur intern für Logik)
- Nachbarn, Terrain, Städte, Burgen, Ressourcen, alle Sims

## Stadtansicht

Kein Level-Editor-Raster mehr: Wiesen, Bach, Hügel, Straßennetz als organische Linien.
Gebäude mit Dach/Schatten/Rauch. Klicks nutzen intern weiter das Stadtgitter.

## Entfernt

- `client/src/map/geometry.ts` (alte Polygon-/Hex-Optik)
- SVG-Kachel-Renderer der vorherigen Weltkarte

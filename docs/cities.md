# Städtebau & Provinz-System

## Zwei Ebenen

1. **Weltkarte** – Reiche, Grenzen, Armeen, Eroberung  
2. **Stadtansicht** – Provinz anklicken → „Stadt betreten“ → Gebäude und Straßen platzieren

## Stadtgitter

- 14×10 Felder pro eigener Provinz  
- Freies Platzieren: Häuser, Farmen, Mühlen, Bäckereien, Minen, Schmieden, Märkte, Kirchen, Kasernen, Mauern, Türme, Hafen, Palast, …  
- Straßen erhöhen Produktion benachbarter Gebäude  
- Abreißen möglich (außer Burgfried)

## Produktionsketten

```
Getreide (Farm) → Mühle → Mehl → Bäckerei → Brot → Bevölkerung wächst
Holz (Holzfäller) → Sägewerk → Bretter → Werkstatt → Werkzeuge → Schmiede → Waffen
```

Lager pro Provinz: Getreide, Mehl, Brot, Bretter, Werkzeuge, Waffen, Pferde.

## Provinzwerte

Zufriedenheit, Loyalität, Sicherheit, Kriminalität, Gesundheit, Bildung – beeinflusst durch Brunnen, Kirchen, Kasernen, Märkte, Straßen.

Wald- und Erz-Vorräte sinken bei starker Nutzung und regenerieren langsam.

## Sichtbares Wachstum

Stadt-Look Level 1–5 (Dorf → Hauptstadt) je nach Gebäudenzahl und Stadtstufe – Hintergrund und Titel ändern sich in der Stadtansicht.

## API (Offline / localStorage)

- `placeCityTile` / `demolishCityTile`
- `upgradeVillage`
- Tick integriert Stadtproduktion

## Dateien

- `shared/src/cityGrid.ts`, `shared/src/production.ts`
- `client/src/components/CityView.tsx`
- `client/src/local/localApi.ts`
- `client/src/pages/GamePage.tsx`

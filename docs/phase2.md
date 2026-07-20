# Phase 2 – Städtebau, Wirtschaft und Reichsentwicklung

Schwerpunkt: Hauptstadt, freies Bausystem, Produktionsketten, Bevölkerung und Handel.

## Umgesetzt

### Hauptstadt
- Startprovinz ist Hauptstadt (`capitalProvinceId`)
- Sichtbare Stufen 1–7 (Dorf → Königliche Hauptstadt)
- Kann in der Stadtverwaltung gewechselt werden

### Stadtansicht
- Kategorien-Palette (Wohnen, Landwirtschaft, Rohstoffe, Verarbeitung, Handel, Militär, Religion/Bildung, Straßen)
- Modi: Bauen, Ausbau (Stufen), Abreißen
- Bauphasen (`buildRemaining`) – große Bauten brauchen mehrere Ticks
- Straßenanschluss für viele Gebäude
- Tabs: Stadtplan, Verwaltung, Handel

### Wirtschaft & Ketten
- Erweiterte Lager: Getreide, Mehl, Brot, Fisch, Fleisch, Bretter, Werkzeuge, Wolle, Stoff, Kleidung, Holzkohle, Stahl, Waffen, Rüstung, Bier, Wein, Pferde, Luxus, …
- Ketten: Nahrung, Textilien, Holz/Werkzeuge, Eisen/Stahl/Waffen
- Straßenbonus auf Produktion
- Steuern beeinflussen Zufriedenheit und Gold
- Automatischer Handel zwischen benachbarten eigenen Provinzen

### Bevölkerung
- Berufe aus Gebäuden (Bauern, Schmiede, Händler, …)
- Zufriedenheit: Nahrung, Kleidung, Sicherheit, Steuern, Arbeitsplätze
- Dorfwachstum bei hoher Zufriedenheit

### Performance
- Logik bleibt O(Gebäude pro Stadt) pro Tick; keine schweren Simulationen pro Einwohner

## Dateien

- `shared/src/cityGrid.ts` – Gebäude, Kategorien, Visual-Stufen
- `shared/src/production.ts` – Ketten, Lager, Bau-Ticks
- `shared/src/economy.ts` – Stadtstufen, Berufe, Handel, Steuern
- `client/src/local/localApi.ts` – Tick, Bau, Steuern, Hauptstadt
- `client/src/components/CityView.tsx` – Stadt-UI
- `docs/cities.md` – Übersicht Städtebau

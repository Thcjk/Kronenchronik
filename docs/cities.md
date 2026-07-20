# Städtebau & Provinz-System

## Zwei Ebenen

1. **Weltkarte** – Reiche, Grenzen, Armeen, Eroberung  
2. **Stadtansicht** – Provinz anklicken → „Stadt betreten“ → Gebäude und Straßen platzieren

## Hauptstadt

Die Startprovinz ist die **Hauptstadt** des Reiches. Sie folgt denselben Bauregeln, erreicht aber als einzige die Stufe „Königliche Hauptstadt“ und wird in der UI hervorgehoben. Die Hauptstadt kann in der Verwaltung gewechselt werden.

## Stadtgitter

- 14×10 Felder pro eigener Provinz  
- Freies Platzieren nach Kategorien (Wohnen, Landwirtschaft, Rohstoffe, Verarbeitung, Handel, Militär, Religion/Bildung, Straßen)  
- Straßen erhöhen Produktion benachbarter Gebäude; viele Gebäude brauchen Straßenanschluss  
- Bauzeit / Bauphasen für größere Gebäude  
- Ausbaustufen (bis 4, Burgfried bis 5)  
- Abreißen möglich (außer Burgfried)

## Entwicklungsstufen

Dorf → Siedlung → Marktflecken → Kleinstadt → Großstadt → Herzogssitz → Königliche Hauptstadt  

Freischaltung neuer Gebäude über Stadtlevel (`minCityLevel`).

## Produktionsketten

```
Getreide → Mühle → Mehl → Bäckerei → Brot → Bevölkerung
Schafe → Wolle → Weberei → Stoff → Schneiderei → Kleidung → Zufriedenheit
Holz → Sägewerk → Bretter → Werkstatt → Werkzeuge
Eisen + Holzkohle → Schmelzofen → Stahl → Schmiede / Rüstungsschmiede → Waffen / Rüstung
Getreide → Brauerei → Bier
```

## Bevölkerung & Herrschaft

- Berufe entstehen aus Gebäuden  
- Steuern (0–80 %, Ideal ~30) beeinflussen Gold und Zufriedenheit  
- Nahrungsmangel, Arbeitslosigkeit und hohe Steuern senken die Stimmung  

## Handel

Benachbarte eigene Provinzen tauschen automatisch Überschüsse (Getreide, Werkzeuge, Stoff, Stahl) und erzeugen Gold.

## API (Offline / localStorage)

- `placeCityTile` / `demolishCityTile` / `upgradeCityTile`
- `setProvinceTax` / `setCapital`
- `upgradeVillage`
- Tick: Produktion, Bauzeit, Handel, Steuern

## Dateien

- `shared/src/cityGrid.ts`, `shared/src/production.ts`, `shared/src/economy.ts`
- `client/src/components/CityView.tsx`
- `client/src/local/localApi.ts`
- `docs/phase2.md`

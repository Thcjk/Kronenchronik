# Phase 4 – Charaktere, Dynastien, Rollenspiel & Immersion

Schwerpunkt: echter Herrscher-Charakter, Familie, Hof, Titel, Entscheidungen.

## Umgesetzt

### Charakter
- Vor-/Nachname, Dynastie, Titel, Alter, Geburtsort, Kultur, Religion, Sprache
- Aussehen (Porträt, Bart, Frisur, Kleidung, Krone)
- Prestige, Ruhm, Stress, Energie, Gesundheit, Lebensphase
- Erweiterte Eigenschaften

### Dynastie & Familie
- Heirat mit Kandidaten, Kinderwachstum, Erziehung (6 Fokus-Richtungen)
- Thronfolge mit emotionaler Chronik
- Stammbaum-Daten (Eltern/Kinder/Ehepartner)

### Titel
- Graf → Markgraf → Herzog → Großherzog → König → Kaiser
- Sichtbar im Charakterpanel und am Hof

### Hof
- Berater-Rat (Kanzler, Marschall, Schatzmeister, Spionmeister, Kaplan, Baumeister)
- Hofbesucher (Botschafter, Händler, Ritter, Barden, Pilger, Künstler)
- Turniere

### Rollenspiel-Ereignisse
- Bauer bittet, Vasall beleidigt, General fordert Gold, Duell, Geschwisterneid, …
- Mehrere Entscheidungen mit Folgen für Prestige/Loyalität/Stress

### UI
- Nav: **Hof**
- Erweitertes Charakterpanel
- Chronik speichert Geburten, Hochzeiten, Thronfolgen, Turniere

## Dateien

- `shared/src/dynastyTypes.ts`, `dynastyLifecycle.ts`, `titleSystem.ts`, `courtSystem.ts`, `immersionEvents.ts`
- `client/src/local/dynastySim.ts`
- `client/src/components/CharacterPanel.tsx`, `CourtView.tsx`
- `client/src/pages/CourtPage.tsx`

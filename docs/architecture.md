# Architektur

## Übersicht

```
┌─────────────┐     REST API      ┌─────────────┐     Prisma     ┌────────────┐
│   Client    │ ◄──────────────► │   Server    │ ◄────────────► │ PostgreSQL │
│  (React)    │     JWT Auth      │  (NestJS)   │                │            │
└─────────────┘                   └──────┬──────┘                └────────────┘
                                         │
                                  ┌──────▼──────┐
                                  │   Shared    │
                                  │ Spiellogik  │
                                  └─────────────┘
```

## Module

### shared/

- **types.ts** – Enums und Interfaces
- **units.ts** – Einheiten-Definitionen und Kampfwerte
- **buildings.ts** – Gebäude-Definitionen und Kosten
- **battle.ts** – Schlachtsimulation (5 Runden, Moral, Gelände, Burg)
- **resources.ts** – Ressourcen-Hilfsfunktionen
- **constants.ts** – Weltkarte (17 Provinzen mit Nachbarn)

### server/

- **auth/** – JWT-Authentifizierung, Registrierung mit Königreichs-Setup
- **users/** – Profilverwaltung
- **game/** – Spielzustand, Bau, Rekrutierung, Schlachten
- **prisma/** – Datenbankzugriff

### client/

- **pages/** – Login, Register, Game, Profile
- **components/** – Weltkarte, Provinz-Panel, Ressourcen-Leiste
- **api/** – Typisierter API-Client

## Datenmodell

Kernentitäten: User → Kingdom → Province → (Castle, Village, City, Building, Army → Unit)

Zusätzlich: Dynasty, Character, Alliance, Battle

## Schlachtsystem

Schlachten werden serverseitig mit `resolveBattle()` berechnet:

1. Bis zu 5 Runden
2. Faktoren: Truppenstärke, Gelände-Bonus, Burgstufe, Kommandant (martial), Moral, Zufall
3. Verluste werden proportional auf Einheiten verteilt
4. Bei Sieg: Provinz wechselt den Besitzer, Armee zieht ein

## Erweiterbarkeit

- WebSocket-Gateway als neues NestJS-Modul (`GameGateway`)
- Diplomatie-Modul für Allianzen und Kriegserklärungen
- Tick-System für Ressourcenproduktion (nur bei aktiven Spielern)
- Dynastie-Erbfolge bei Herrscher-Tod

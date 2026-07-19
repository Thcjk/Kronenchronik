# Mittelalterspiel – Browser-Strategiespiel

Ein browserbasiertes Mittelalter-Strategiespiel, inspiriert von Crusader Kings 3, Mount & Blade: Bannerlord und OpenFront. Spieler bauen Burgen, verwalten Ressourcen, rekrutieren Armeen und erobern Nachbarprovinzen.

## Tech-Stack

| Bereich   | Technologie                          |
| --------- | ------------------------------------ |
| Frontend  | React, TypeScript, Vite, TailwindCSS |
| Backend   | Node.js, NestJS, JWT                 |
| Datenbank | PostgreSQL, Prisma                   |
| Monorepo  | npm workspaces                       |

## Projektstruktur

```
client/          React-Frontend
server/          NestJS-Backend (REST-API)
shared/          Gemeinsame Spiellogik (Schlachten, Einheiten, Gebäude)
database/        Prisma-Schema
docs/            Dokumentation
.github/         CI/CD (GitHub Actions)
```

## Voraussetzungen

- Node.js >= 20
- PostgreSQL >= 14
- npm >= 10

## Schnellstart

### 1. Repository klonen und Abhängigkeiten installieren

```bash
git clone <repo-url>
cd mittelalterspiel
npm install
```

### 2. Umgebungsvariablen

```bash
cp .env.example .env
# DATABASE_URL und JWT_SECRET anpassen
```

### 3. Datenbank einrichten

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend-API: http://localhost:3001/api

## MVP-Funktionen

- [x] Registrierung und Login (JWT)
- [x] Profilverwaltung (Benutzername, Passwort)
- [x] Weltkarte mit 17 Provinzen
- [x] Startburg und -dorf bei Registrierung
- [x] Ressourcen (Gold, Nahrung, Holz, Stein, Eisen, Einfluss, Ruhm)
- [x] Gebäude bauen (Bauernhof, Mine, Sägewerk, Kaserne, Palisade)
- [x] Burg ausbauen
- [x] Einheiten rekrutieren (8 Typen)
- [x] Armeen bilden
- [x] Angriff auf Nachbarprovinzen
- [x] Automatische Schlachtberechnung mit Kampfbericht
- [x] PostgreSQL-Persistenz

## API-Endpunkte

### Auth

- `POST /api/auth/register` – Registrierung + Königreich gründen
- `POST /api/auth/login` – Anmeldung
- `GET /api/auth/me` – Aktueller Benutzer

### Benutzer

- `GET /api/users/profile` – Profil mit Königreich
- `PATCH /api/users/profile` – Benutzername ändern
- `PATCH /api/users/password` – Passwort ändern

### Spiel

- `GET /api/game/state` – Kompletter Spielstand
- `POST /api/game/build` – Gebäude bauen/upgraden
- `POST /api/game/recruit` – Einheiten rekrutieren
- `POST /api/game/army` – Armee aus Garnison bilden
- `POST /api/game/castle/upgrade` – Burg ausbauen
- `POST /api/game/attack` – Provinz angreifen

## Architektur

Die Spiellogik (Schlachtberechnung, Einheiten- und Gebäudedefinitionen) liegt im `shared/`-Paket und wird sowohl vom Server als auch potenziell vom Client genutzt. Alle Spielzustandsänderungen laufen serverseitig – der Client ist rein darstellend.

Die REST-API ist so strukturiert, dass später WebSockets für Echtzeit-Updates (Schlachten, Diplomatie) ergänzt werden können.

## Lizenz

MIT – siehe [LICENSE](LICENSE)

#!/usr/bin/env bash
set -euo pipefail

echo "=== Kronenchronik Setup ==="

# PostgreSQL starten und Datenbank anlegen
until pg_isready -h localhost -U postgres -q 2>/dev/null; do
  echo "Warte auf PostgreSQL..."
  sleep 2
done

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'kronenchronik'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE kronenchronik;"

# URLs für GitHub Codespaces oder lokal
if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  FRONTEND_URL="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  API_URL="/api"
  WS_URL=""
  echo "Codespace erkannt: ${FRONTEND_URL}"
else
  FRONTEND_URL="http://localhost:5173"
  API_URL="/api"
  WS_URL=""
fi

# Umgebungsvariablen schreiben
cat > .env <<EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kronenchronik?schema=public"
JWT_SECRET="codespace-dev-secret-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
CORS_ORIGIN="${FRONTEND_URL}"
VITE_API_URL="${API_URL}"
VITE_WS_URL="${WS_URL}"
EOF

cp .env client/.env

echo "=== Abhängigkeiten installieren ==="
npm install

echo "=== Datenbank einrichten ==="
npm run db:generate
npm run db:push
npm run db:seed

echo "=== Shared-Paket bauen ==="
npm run build -w shared

echo ""
echo "✅ Setup abgeschlossen!"
echo "   Spiel-URL: ${FRONTEND_URL}"
echo "   Starte mit: npm run dev"

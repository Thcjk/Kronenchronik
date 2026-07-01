"""SQLite persistence for the scouting platform."""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

import pandas as pd

from models.leagues import EUROPEAN_LEAGUES, league_country

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "scouting.db"
CSV_PATH = ROOT / "data" / "players.csv"
EUROPE_CSV = ROOT / "data" / "europe_players.csv"
LEGACY_CSV = ROOT / "players.csv"

SCHEMA = """
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birth_date TEXT,
    age INTEGER,
    nationality TEXT,
    height_cm REAL,
    weight_kg REAL,
    throwing_hand TEXT,
    position TEXT,
    role TEXT DEFAULT 'Feld',
    team TEXT,
    league TEXT,
    country TEXT,
    contract_until TEXT,
    market_value_eur INTEGER DEFAULT 0,
    games INTEGER DEFAULT 0,
    minutes REAL DEFAULT 0,
    goals INTEGER DEFAULT 0,
    shots INTEGER DEFAULT 0,
    shot_pct REAL DEFAULT 0,
    assists INTEGER DEFAULT 0,
    technical_fouls INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    steals INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    suspensions INTEGER DEFAULT 0,
    fastbreak_goals INTEGER DEFAULT 0,
    seven_meter_goals INTEGER DEFAULT 0,
    seven_meter_attempts INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    save_pct REAL DEFAULT 0,
    goals_conceded INTEGER DEFAULT 0,
    development_index REAL DEFAULT 50,
    import_date TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS shortlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS shortlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shortlist_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    priority INTEGER DEFAULT 3,
    status TEXT DEFAULT 'Beobachten',
    rating REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    added_at TEXT,
    FOREIGN KEY (shortlist_id) REFERENCES shortlists(id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    UNIQUE(shortlist_id, player_id)
);

CREATE TABLE IF NOT EXISTS import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    rows_imported INTEGER,
    imported_at TEXT
);
"""

DEFAULT_SHORTLISTS = [
    "Sommertransfers",
    "Junge Talente",
    "Beobachtung",
    "Verpflichten",
    "Vertrag läuft aus",
    "Internationale Spieler",
]

LEAGUE_COUNTRY = {code: info.country for code, info in EUROPEAN_LEAGUES.items()}


def _load_all_csvs() -> pd.DataFrame:
    frames = []
    if CSV_PATH.exists():
        frames.append(pd.read_csv(CSV_PATH))
    elif LEGACY_CSV.exists():
        frames.append(pd.read_csv(LEGACY_CSV))
    if EUROPE_CSV.exists():
        frames.append(pd.read_csv(EUROPE_CSV))
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_database(force_reseed: bool = False) -> None:
    conn = get_connection()
    conn.executescript(SCHEMA)
    _migrate_schema(conn)
    conn.commit()

    count = conn.execute("SELECT COUNT(*) FROM players").fetchone()[0]
    if count == 0 or force_reseed:
        _seed_players(conn)

    for name in DEFAULT_SHORTLISTS:
        conn.execute(
            "INSERT OR IGNORE INTO shortlists (name, created_at) VALUES (?, ?)",
            (name, datetime.now().isoformat()),
        )
    conn.commit()
    conn.close()


def _migrate_schema(conn: sqlite3.Connection) -> None:
    """Add columns to existing databases without breaking old data."""
    cols = {row[1] for row in conn.execute("PRAGMA table_info(shortlist_items)").fetchall()}
    if "status" not in cols:
        conn.execute("ALTER TABLE shortlist_items ADD COLUMN status TEXT DEFAULT 'Beobachten'")
    conn.commit()



def _estimate_games(minutes: float) -> int:
    return max(1, int(round(minutes / 48)))


def _seed_players(conn: sqlite3.Connection) -> None:
    raw = _load_all_csvs()
    if raw.empty:
        conn.close()
        return

    if "player" in raw.columns and "name" not in raw.columns:
        raw = raw.rename(columns={"player": "name"})
    if "role" not in raw.columns:
        raw["role"] = "Feld"
    for col in ("saves", "save_pct", "goals_conceded"):
        if col not in raw.columns:
            raw[col] = 0

    now = datetime.now().isoformat()
    nat_map = {
        "Grgic": "Kroatien",
        "Gidsel": "Dänemark",
        "Jakobsen": "Dänemark",
        "Madsen": "Dänemark",
        "Uscins": "Lettland",
        "Wolff": "Deutschland",
        "Møller": "Dänemark",
        "Fischer": "Deutschland",
        "Morante": "Spanien",
        "Beneke": "Deutschland",
        "Karabatic": "Frankreich",
        "Mem": "Frankreich",
        "Minne": "Frankreich",
        "Cindric": "Kroatien",
        "Karacic": "Kroatien",
        "Landin": "Dänemark",
        "Lauge": "Dänemark",
        "Wanne": "Schweden",
        "Gottfridsson": "Schweden",
        "Palicka": "Schweden",
        "Syprzak": "Polen",
        "Weinhold": "Deutschland",
        "Sego": "Kroatien",
        "Gudmundsson": "Island",
    }

    rows = []
    for _, r in raw.iterrows():
        name = str(r["name"])
        league = str(r.get("league", "HBL"))
        country = league_country(league)
        nationality = next((v for k, v in nat_map.items() if k in name), country)
        minutes = float(r.get("minutes", 0))
        goals = int(r.get("goals", 0))
        shots = int(r.get("shots", 0)) or max(goals, 1)
        shot_pct = (goals / shots * 100) if shots else 0
        age = int(r.get("age", 25))
        pos = str(r.get("position", "RM"))
        role = str(r.get("role", "Feld"))

        height = 192 + (hash(name) % 15) - 5
        weight = 88 + (hash(name) % 20) - 8
        tier = EUROPEAN_LEAGUES[league].tier if league in EUROPEAN_LEAGUES else 2
        comp = EUROPEAN_LEAGUES[league].competition_type if league in EUROPEAN_LEAGUES else "domestic"
        base_market = 120_000 + goals * 900
        if tier == 1 and comp == "domestic":
            base_market += 80_000
        if comp == "international":
            base_market += 50_000
        market = base_market
        if age <= 23:
            market = int(market * 1.2)
        if age >= 32:
            market = int(market * 0.7)

        fb = max(0, int(goals * 0.12)) if role == "Feld" else 0
        seven_g = max(0, int(goals * 0.25)) if role == "Feld" else 0
        seven_a = max(seven_g, int(seven_g * 1.15))

        dev = min(95, 55 + (25 - age) * 1.5) if age <= 25 else max(35, 70 - (age - 25))

        rows.append(
            {
                "name": name,
                "birth_date": f"{2026 - age}-06-15",
                "age": age,
                "nationality": nationality,
                "height_cm": height,
                "weight_kg": weight,
                "throwing_hand": "Rechts" if pos in {"RR", "RM", "RA", "TW"} else "Links",
                "position": pos,
                "role": role,
                "team": str(r.get("team", "")),
                "league": league,
                "country": country,
                "contract_until": "2027-06-30" if hash(name) % 2 else "2026-06-30",
                "market_value_eur": market,
                "games": _estimate_games(minutes),
                "minutes": minutes,
                "goals": goals,
                "shots": shots,
                "shot_pct": round(shot_pct, 2),
                "assists": int(r.get("assists", 0)),
                "technical_fouls": int(r.get("turnovers", 0) * 0.15),
                "turnovers": int(r.get("turnovers", 0)),
                "steals": int(r.get("steals", 0)),
                "blocks": int(r.get("blocks", 0)),
                "suspensions": int(r.get("turnovers", 0) * 0.1),
                "fastbreak_goals": fb,
                "seven_meter_goals": seven_g,
                "seven_meter_attempts": seven_a,
                "saves": int(r.get("saves", 0)),
                "save_pct": float(r.get("save_pct", 0)),
                "goals_conceded": int(r.get("goals_conceded", 0)),
                "development_index": round(dev, 1),
                "import_date": now,
                "created_at": now,
                "updated_at": now,
            }
        )

    conn.execute("DELETE FROM players")
    pd.DataFrame(rows).to_sql("players", conn, if_exists="append", index=False)
    conn.execute(
        "INSERT INTO import_log (filename, rows_imported, imported_at) VALUES (?, ?, ?)",
        ("multi_csv_seed", len(rows), now),
    )
    conn.commit()


def load_players_dataframe() -> pd.DataFrame:
    init_database()
    conn = get_connection()
    df = pd.read_sql("SELECT * FROM players", conn)
    conn.close()
    return df


def import_players_dataframe(df: pd.DataFrame, filename: str = "upload.csv") -> int:
    """Insert validated player rows and log the import."""
    conn = get_connection()
    now = datetime.now().isoformat()

    db_cols = [
        "name", "birth_date", "age", "nationality", "height_cm", "weight_kg", "throwing_hand",
        "position", "role", "team", "league", "country", "contract_until", "market_value_eur",
        "games", "minutes", "goals", "shots", "shot_pct", "assists", "technical_fouls",
        "turnovers", "steals", "blocks", "suspensions", "fastbreak_goals",
        "seven_meter_goals", "seven_meter_attempts", "saves", "save_pct", "goals_conceded",
        "development_index", "import_date", "created_at", "updated_at",
    ]
    payload = df.copy()
    for col in db_cols:
        if col not in payload.columns:
            payload[col] = 0 if col not in {"name", "team", "league", "position", "role", "nationality", "country", "throwing_hand", "birth_date", "contract_until", "import_date", "created_at", "updated_at"} else ""
    payload["import_date"] = now
    payload["created_at"] = now
    payload["updated_at"] = now
    payload[db_cols].to_sql("players", conn, if_exists="append", index=False)

    rows = len(payload)
    conn.execute(
        "INSERT INTO import_log (filename, rows_imported, imported_at) VALUES (?, ?, ?)",
        (filename, rows, now),
    )
    conn.commit()
    conn.close()
    return rows

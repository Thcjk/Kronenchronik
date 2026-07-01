"""Central page path registry for navigation and st.switch_page."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT / "pages"

# Relative paths (for st.Page / st.switch_page from app root)
PAGE_FILES = {
    "dashboard": "pages/dashboard.py",
    "scouting_search": "pages/scouting_search.py",
    "player_profile": "pages/player_profile.py",
    "player_compare": "pages/player_compare.py",
    "shortlists": "pages/shortlists.py",
    "reports": "pages/reports.py",
    "data_import": "pages/data_import.py",
    "leagues": "pages/leagues.py",
}

# Absolute paths (for existence checks)
PAGES = {key: ROOT / rel for key, rel in PAGE_FILES.items()}


def page_path(key: str) -> str:
    """Return relative path for st.switch_page."""
    return PAGE_FILES[key]

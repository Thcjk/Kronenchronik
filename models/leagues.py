"""European handball league registry."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LeagueInfo:
    code: str
    name: str
    country: str
    region: str
    tier: int  # 1 = top domestic / international
    competition_type: str  # domestic | international


EUROPEAN_LEAGUES: dict[str, LeagueInfo] = {
    # Deutschland
    "HBL": LeagueInfo("HBL", "Handball-Bundesliga", "Deutschland", "Mitteleuropa", 1, "domestic"),
    "2HBL": LeagueInfo("2HBL", "2. Handball-Bundesliga", "Deutschland", "Mitteleuropa", 2, "domestic"),
    # Frankreich
    "LNH": LeagueInfo("LNH", "Liqui Moly Starligue (LNH)", "Frankreich", "Westeuropa", 1, "domestic"),
    "Proligue": LeagueInfo("Proligue", "Proligue (2. Frankreich)", "Frankreich", "Westeuropa", 2, "domestic"),
    # Dänemark
    "HHL": LeagueInfo("HHL", "Herre Håndbold Ligaen", "Dänemark", "Skandinavien", 1, "domestic"),
    "1_division": LeagueInfo("1_division", "1. division herrer", "Dänemark", "Skandinavien", 2, "domestic"),
    # Spanien
    "ASOBAL": LeagueInfo("ASOBAL", "Liga ASOBAL", "Spanien", "Südeuropa", 1, "domestic"),
    # Schweiz
    "NLA": LeagueInfo("NLA", "Swiss Handball League", "Schweiz", "Mitteleuropa", 1, "domestic"),
    # Norwegen
    "Eliteserien_NO": LeagueInfo("Eliteserien_NO", "Eliteserien (Norwegen)", "Norwegen", "Skandinavien", 1, "domestic"),
    # Schweden
    "Handbollsligan": LeagueInfo("Handbollsligan", "Handbollsligan", "Schweden", "Skandinavien", 1, "domestic"),
    # Weitere Top-Ligen
    "Superliga_PL": LeagueInfo("Superliga_PL", "Superliga (Polen)", "Polen", "Osteuropa", 1, "domestic"),
    "NB_I": LeagueInfo("NB_I", "NB I (Ungarn)", "Ungarn", "Mitteleuropa", 1, "domestic"),
    "Premijer_HR": LeagueInfo("Premijer_HR", "Premijer liga (Kroatien)", "Kroatien", "Südeuropa", 1, "domestic"),
    "HLA": LeagueInfo("HLA", "HLA (Österreich)", "Österreich", "Mitteleuropa", 1, "domestic"),
    "Andebol1": LeagueInfo("Andebol1", "Andebol 1 (Portugal)", "Portugal", "Südeuropa", 1, "domestic"),
    "Extraliga_CZ": LeagueInfo("Extraliga_CZ", "Extraliga (Tschechien)", "Tschechien", "Mitteleuropa", 1, "domestic"),
    "Liga_Nationala_RO": LeagueInfo("Liga_Nationala_RO", "Liga Națională (Rumänien)", "Rumänien", "Osteuropa", 1, "domestic"),
    "Olís_IS": LeagueInfo("Olís_IS", "Olís deild karla (Island)", "Island", "Skandinavien", 1, "domestic"),
    "Slovakia_Extraliga": LeagueInfo("Slovakia_Extraliga", "Extraliga (Slowakei)", "Slowakei", "Mitteleuropa", 1, "domestic"),
    "Elitserien_BA": LeagueInfo("Elitserien_BA", "Premijer Liga (Bosnien)", "Bosnien-Herzegowina", "Südeuropa", 1, "domestic"),
    # International (EHF)
    "EHF_CL": LeagueInfo("EHF_CL", "EHF Champions League", "Europa", "Europa", 1, "international"),
    "EHF_EL": LeagueInfo("EHF_EL", "EHF European League", "Europa", "Europa", 1, "international"),
    "EHF_EHF": LeagueInfo("EHF_EHF", "EHF European Cup", "Europa", "Europa", 2, "international"),
}


def league_country(code: str) -> str:
    info = EUROPEAN_LEAGUES.get(code)
    return info.country if info else "Europa"


def league_display_name(code: str) -> str:
    info = EUROPEAN_LEAGUES.get(code)
    return info.name if info else code


def all_league_codes() -> list[str]:
    return sorted(EUROPEAN_LEAGUES.keys())


def domestic_leagues() -> list[LeagueInfo]:
    return [l for l in EUROPEAN_LEAGUES.values() if l.competition_type == "domestic"]


def international_leagues() -> list[LeagueInfo]:
    return [l for l in EUROPEAN_LEAGUES.values() if l.competition_type == "international"]

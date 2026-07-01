import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).parent / "player_profile.py"), run_name="__streamlit__")

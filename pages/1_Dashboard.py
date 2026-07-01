import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).parent / "dashboard.py"), run_name="__streamlit__")

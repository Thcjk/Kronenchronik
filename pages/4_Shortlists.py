import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).parent / "shortlists.py"), run_name="__streamlit__")

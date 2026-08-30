import sys
from pathlib import Path


ENGINE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ENGINE_DIR))
COLLECTOR_DIR = ENGINE_DIR / "collector"
sys.path.insert(0, str(COLLECTOR_DIR))
OPERATIONS_DIR = ENGINE_DIR / "operations"
sys.path.insert(0, str(OPERATIONS_DIR))

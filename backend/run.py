"""
ASCENDIQ Backend Server Launcher
Usage: python -m backend.run  OR  python backend/run.py
Runs FastAPI with Uvicorn on port 8000.
"""

import uvicorn

if __name__ == "__main__":
    print("Starting ASCENDIQ Student Success Intelligence Platform on http://127.0.0.1:8000 ...")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)

#!/usr/bin/env python3
import os
import subprocess
import sys

# Set environment
os.environ.setdefault("PYTHONPATH", "/home/runner/workspace")

# Run FastAPI server
try:
    subprocess.run([
        sys.executable, "-m", "uvicorn", 
        "main:app", 
        "--host", "0.0.0.0", 
        "--port", "3000",
        "--reload"
    ], check=True)
except KeyboardInterrupt:
    print("Server stopped")
except Exception as e:
    print(f"Error starting server: {e}")
#!/usr/bin/env python3
"""Runs the independent audit (_src/audit.py): every number on the page must re-derive from data/raw/. Exit 1 on mismatch.
Run by scripts/ci_check.py."""
import os, subprocess, sys
sys.exit(subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "audit.py")]).returncode)

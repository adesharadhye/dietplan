#!/usr/bin/env python
"""
Simple test-runner wrapper. Run this file to execute Django tests via manage.py.

Usage:
    python test.py
"""
import subprocess
import sys

if __name__ == '__main__':
    cmd = [sys.executable, 'manage.py', 'test']
    rc = subprocess.call(cmd)
    sys.exit(rc)

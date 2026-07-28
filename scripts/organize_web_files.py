#!/usr/bin/env python3
"""
Organizes all repository web visualizer files into `web/` and `docs/` directories.
"""

import os
import shutil

def organize_web_files():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.basename(root_dir) == "scripts":
        root_dir = os.path.dirname(root_dir)

    web_dir = os.path.join(root_dir, "web")
    docs_dir = os.path.join(root_dir, "docs")
    
    os.makedirs(web_dir, exist_ok=True)
    os.makedirs(docs_dir, exist_ok=True)

    web_files = ["index.html", "app.js", "style.css", "visualizer_data.json"]

    for filename in web_files:
        src = os.path.join(root_dir, filename)
        if os.path.exists(src):
            # Copy to web/ and docs/
            shutil.copy2(src, os.path.join(web_dir, filename))
            shutil.copy2(src, os.path.join(docs_dir, filename))
            print(f"[+] Moved {filename} -> web/ and docs/")

if __name__ == "__main__":
    organize_web_files()

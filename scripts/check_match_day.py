#!/usr/bin/env python3
"""
Checks if today is a Premier League match day or if live data requires updating.
Used by GitHub Actions to only run data pulls on match days.
"""

import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

def fetch_json(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[!] Warning: error fetching {url}: {e}")
        return None

def is_match_day():
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print(f"[*] Checking match day status for UTC date: {today_str}")

    # 1. Check all fixtures for today or currently live
    fixtures = fetch_json("https://fantasy.premierleague.com/api/fixtures/")
    if fixtures:
        today_fixtures = [
            f for f in fixtures 
            if f.get("kickoff_time") and f["kickoff_time"].startswith(today_str)
        ]
        live_fixtures = [
            f for f in fixtures 
            if f.get("started") and not f.get("finished")
        ]

        if live_fixtures:
            print(f"[+] Found {len(live_fixtures)} matches currently live!")
            return True, f"{len(live_fixtures)} matches currently in progress"

        if today_fixtures:
            print(f"[+] Found {len(today_fixtures)} fixtures scheduled for today ({today_str})")
            return True, f"{len(today_fixtures)} fixtures scheduled today"

    # 2. Check bootstrap-static to see if current gameweek has pending data checks
    bootstrap = fetch_json("https://fantasy.premierleague.com/api/bootstrap-static/")
    if bootstrap:
        for event in bootstrap.get("events", []):
            if event.get("is_current"):
                # If gameweek matches finished today or bonus/sub calculations are still pending
                if not event.get("data_checked", False):
                    print(f"[+] Gameweek {event['id']} is current and data is not yet fully checked by FPL towers.")
                    return True, f"GW {event['id']} final points/auto-subs pending finalization"

    return False, "No fixtures scheduled today, no matches live, and no pending gameweek finalization"

def main():
    should_run, reason = is_match_day()
    print(f"[*] Match day evaluation: {should_run} ({reason})")

    # Set GitHub Actions output parameter if running in GitHub Actions
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output and os.path.exists(github_output):
        with open(github_output, "a") as f:
            f.write(f"should_run={'true' if should_run else 'false'}\n")
            f.write(f"reason={reason}\n")
    
    if not should_run:
        print("[*] Skipping live FPL update (not a match day).")

if __name__ == "__main__":
    main()

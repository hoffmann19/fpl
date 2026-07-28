#!/usr/bin/env python3
"""
FPL Mini-League Data Collector
Scrapes official Fantasy Premier League (FPL) mini-league data (League ID: 352792 or custom)
supporting pre-season newly joined entries as well as in-season standings, ranks, and points.
"""

import argparse
import csv
import json
import os
import sqlite3
import sys
import urllib.request
from datetime import datetime, timezone

FPL_LEAGUE_URL = "https://fantasy.premierleague.com/api/leagues-classic/{league_id}/standings/"
FPL_ENTRY_URL = "https://fantasy.premierleague.com/api/entry/{entry_id}/"

def get_project_root():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.basename(script_dir) == "scripts":
        return os.path.dirname(script_dir)
    return script_dir

def fetch_json(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"[!] Error fetching {url}: {e}", file=sys.stderr)
        return None

def fetch_mini_league(league_id):
    print(f"[*] Fetching mini-league {league_id} standings from FPL API...")
    page = 1
    all_members = []
    league_info = {}

    while True:
        url = f"https://fantasy.premierleague.com/api/leagues-classic/{league_id}/standings/?page_new_entries={page}&page_standings={page}"
        data = fetch_json(url)
        if not data:
            break

        if not league_info and "league" in data:
            league_info = data["league"]

        new_entries = data.get("new_entries", {}).get("results", [])
        standings_entries = data.get("standings", {}).get("results", [])

        current_page_entries = standings_entries if standings_entries else new_entries

        for item in current_page_entries:
            first_name = item.get("player_first_name", "") or item.get("player_name", "").split(" ")[0]
            last_name = item.get("player_last_name", "") or " ".join(item.get("player_name", "").split(" ")[1:])
            manager_name = f"{first_name} {last_name}".strip()

            entry_record = {
                "league_id": league_id,
                "league_name": league_info.get("name", "Unknown"),
                "entry_id": item.get("entry"),
                "team_name": item.get("entry_name"),
                "manager_name": manager_name,
                "joined_time": item.get("joined_time"),
                "rank": item.get("rank", item.get("rank_sort")),
                "last_rank": item.get("last_rank"),
                "event_total": item.get("event_total", 0),
                "total_points": item.get("total", 0),
            }
            all_members.append(entry_record)

        has_next = (
            data.get("new_entries", {}).get("has_next", False) or 
            data.get("standings", {}).get("has_next", False)
        )
        if not has_next or not current_page_entries:
            break
        page += 1

    return league_info, all_members

def enrich_member_details(members):
    enriched = []
    print(f"[*] Enriching team details for {len(members)} member(s)...")
    for m in members:
        entry_id = m["entry_id"]
        entry_data = fetch_json(FPL_ENTRY_URL.format(entry_id=entry_id))
        rec = dict(m)
        if entry_data:
            rec["summary_overall_points"] = entry_data.get("summary_overall_points", 0)
            rec["summary_overall_rank"] = entry_data.get("summary_overall_rank")
            rec["summary_event_points"] = entry_data.get("summary_event_points", 0)
            rec["summary_event_rank"] = entry_data.get("summary_event_rank")
            rec["fpl_region"] = entry_data.get("player_region_name", "")
            rec["fpl_joined_date"] = entry_data.get("joined_time", "")
        else:
            rec["summary_overall_points"] = 0
            rec["summary_overall_rank"] = None
            rec["summary_event_points"] = 0
            rec["summary_event_rank"] = None
            rec["fpl_region"] = ""
            rec["fpl_joined_date"] = ""
        enriched.append(rec)
    return enriched

def save_csv(members, filepath):
    if not members:
        return
    fieldnames = list(members[0].keys())
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(members)
    print(f"[+] Saved mini-league CSV to {filepath}")

def save_sqlite(league_info, members, db_filepath):
    if not members:
        return
    conn = sqlite3.connect(db_filepath)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mini_leagues (
            league_id INTEGER PRIMARY KEY,
            league_name TEXT,
            admin_entry INTEGER,
            created_at TEXT,
            scraped_at TEXT
        )
    """)
    now_iso = datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')
    cursor.execute("""
        INSERT OR REPLACE INTO mini_leagues (league_id, league_name, admin_entry, created_at, scraped_at)
        VALUES (?, ?, ?, ?, ?)
    """, (
        league_info.get("id"),
        league_info.get("name"),
        league_info.get("admin_entry"),
        league_info.get("created"),
        now_iso
    ))

    sample = members[0]
    col_defs = []
    for k, v in sample.items():
        if isinstance(v, int): col_defs.append(f"`{k}` INTEGER")
        elif isinstance(v, float): col_defs.append(f"`{k}` REAL")
        else: col_defs.append(f"`{k}` TEXT")
            
    cursor.execute(f"DROP TABLE IF EXISTS minileague_members")
    cursor.execute(f"CREATE TABLE minileague_members ({', '.join(col_defs)}, PRIMARY KEY (`league_id`, `entry_id`))")

    cols = ", ".join([f"`{k}`" for k in sample.keys()])
    placeholders = ", ".join(["?"] * len(sample))
    cursor.executemany(f"INSERT INTO minileague_members ({cols}) VALUES ({placeholders})", [tuple(m.values()) for m in members])

    conn.commit()
    conn.close()
    print(f"[+] Saved mini-league to SQLite database {db_filepath}")

def main():
    parser = argparse.ArgumentParser(description="Scrape FPL Mini-League Data")
    parser.add_argument("--league-id", type=int, default=352792, help="FPL Mini-League ID (default: 352792)")
    args = parser.parse_args()

    league_id = args.league_id
    league_info, members = fetch_mini_league(league_id)

    if not league_info:
        print(f"[!] Unable to find mini-league with ID {league_id}", file=sys.stderr)
        sys.exit(1)

    print(f"\n[+] League Found: '{league_info.get('name')}' (ID: {league_id})")
    enriched_members = enrich_member_details(members)

    root_dir = get_project_root()
    data_dir = os.path.join(root_dir, "fpl_data")
    os.makedirs(data_dir, exist_ok=True)
    
    csv_file = os.path.join(data_dir, f"minileague_{league_id}.csv")
    save_csv(enriched_members, csv_file)
    save_sqlite(league_info, enriched_members, os.path.join(data_dir, "fpl_2026_27.db"))

    print("\n--- Mini-League Summary ---")
    print(f"League Name: {league_info.get('name')}")
    print(f"Total Members: {len(enriched_members)}")

if __name__ == "__main__":
    main()

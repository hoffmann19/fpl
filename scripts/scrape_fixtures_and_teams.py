#!/usr/bin/env python3
"""
FPL 2026/27 Fixtures, Fixture Difficulty Ratings (FDR), & Team Strength Scraper
Fetches all 380 season fixtures, team attack/defense ratings, and builds an FDR matrix 
for transfer planning and captain selection.
"""

import json
import os
import sys
import urllib.request
import csv
import sqlite3

FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"
FPL_FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/"

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

def process_fixtures_and_teams():
    print("[*] Fetching bootstrap static team ratings...")
    bootstrap = fetch_json(FPL_BOOTSTRAP_URL)
    if not bootstrap:
        return None, None, None, None

    teams_dict = {t["id"]: t for t in bootstrap.get("teams", [])}
    teams_name = {t["id"]: t["name"] for t in bootstrap.get("teams", [])}
    teams_short = {t["id"]: t["short_name"] for t in bootstrap.get("teams", [])}

    team_records = []
    for t in bootstrap.get("teams", []):
        team_records.append({
            "id": t.get("id"),
            "name": t.get("name"),
            "short_name": t.get("short_name"),
            "strength": t.get("strength"),
            "strength_overall_home": t.get("strength_overall_home"),
            "strength_overall_away": t.get("strength_overall_away"),
            "strength_attack_home": t.get("strength_attack_home"),
            "strength_attack_away": t.get("strength_attack_away"),
            "strength_defence_home": t.get("strength_defence_home"),
            "strength_defence_away": t.get("strength_defence_away"),
        })

    events_records = []
    for ev in bootstrap.get("events", []):
        events_records.append({
            "id": ev.get("id"),
            "name": ev.get("name"),
            "deadline_time": ev.get("deadline_time"),
            "average_entry_score": ev.get("average_entry_score", 0),
            "highest_score": ev.get("highest_score", 0),
            "is_previous": 1 if ev.get("is_previous") else 0,
            "is_current": 1 if ev.get("is_current") else 0,
            "is_next": 1 if ev.get("is_next") else 0,
            "most_selected": ev.get("most_selected"),
            "most_captained": ev.get("most_captained"),
            "most_transferred_in": ev.get("most_transferred_in"),
            "top_element": ev.get("top_element"),
        })

    print("[*] Fetching all 380 Premier League fixtures for 2026/27...")
    raw_fixtures = fetch_json(FPL_FIXTURES_URL)
    fixture_records = []
    
    if raw_fixtures:
        for f in raw_fixtures:
            home_id = f.get("team_h")
            away_id = f.get("team_a")
            fixture_records.append({
                "id": f.get("id"),
                "event": f.get("event"),
                "kickoff_time": f.get("kickoff_time"),
                "finished": 1 if f.get("finished") else 0,
                "home_team_id": home_id,
                "home_team": teams_name.get(home_id, "Unknown"),
                "home_team_short": teams_short.get(home_id, ""),
                "away_team_id": away_id,
                "away_team": teams_name.get(away_id, "Unknown"),
                "away_team_short": teams_short.get(away_id, ""),
                "home_difficulty": f.get("team_h_difficulty"),
                "away_difficulty": f.get("team_a_difficulty"),
                "home_score": f.get("team_h_score"),
                "away_score": f.get("team_a_score"),
            })

    team_fdr_runs = []
    for t_id, t_name in teams_name.items():
        team_next_5 = [
            f for f in fixture_records 
            if (f["home_team_id"] == t_id or f["away_team_id"] == t_id) and f["event"] and f["event"] <= 5
        ]
        team_next_5.sort(key=lambda x: x["event"])
        
        diffs = []
        fixture_strs = []
        for f in team_next_5:
            is_home = (f["home_team_id"] == t_id)
            opp_short = f["away_team_short"] if is_home else f["home_team_short"]
            diff = f["home_difficulty"] if is_home else f["away_difficulty"]
            loc = "(H)" if is_home else "(A)"
            diffs.append(diff)
            fixture_strs.append(f"GW{f['event']}: {opp_short}{loc} [FDR {diff}]")
            
        avg_fdr = round(sum(diffs) / len(diffs), 2) if diffs else 0.0
        team_fdr_runs.append({
            "team_id": t_id,
            "team_name": t_name,
            "avg_fdr_gw1_5": avg_fdr,
            "fixtures_gw1_5": " | ".join(fixture_strs)
        })
        
    team_fdr_runs.sort(key=lambda x: x["avg_fdr_gw1_5"])

    return team_records, events_records, fixture_records, team_fdr_runs

def save_csv(data_list, filepath):
    if not data_list:
        return
    fieldnames = list(data_list[0].keys())
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data_list)
    print(f"[+] Saved CSV to {filepath}")

def save_sqlite(teams, events, fixtures, fdr_runs, db_filepath):
    conn = sqlite3.connect(db_filepath)
    cursor = conn.cursor()

    if teams:
        cols = ", ".join([f"`{k}`" for k in teams[0].keys()])
        placeholders = ", ".join(["?"] * len(teams[0]))
        cursor.execute("DROP TABLE IF EXISTS teams")
        cursor.execute("""
            CREATE TABLE teams (
                id INTEGER PRIMARY KEY, name TEXT, short_name TEXT, strength INTEGER,
                strength_overall_home INTEGER, strength_overall_away INTEGER,
                strength_attack_home INTEGER, strength_attack_away INTEGER,
                strength_defence_home INTEGER, strength_defence_away INTEGER
            )
        """)
        cursor.executemany(f"INSERT INTO teams ({cols}) VALUES ({placeholders})", [tuple(t.values()) for t in teams])

    if events:
        cols = ", ".join([f"`{k}`" for k in events[0].keys()])
        placeholders = ", ".join(["?"] * len(events[0]))
        cursor.execute("DROP TABLE IF EXISTS gameweek_schedule")
        cursor.execute("""
            CREATE TABLE gameweek_schedule (
                id INTEGER PRIMARY KEY, name TEXT, deadline_time TEXT,
                average_entry_score INTEGER, highest_score INTEGER,
                is_previous INTEGER, is_current INTEGER, is_next INTEGER,
                most_selected INTEGER, most_captained INTEGER,
                most_transferred_in INTEGER, top_element INTEGER
            )
        """)
        cursor.executemany(f"INSERT INTO gameweek_schedule ({cols}) VALUES ({placeholders})", [tuple(e.values()) for e in events])

    if fixtures:
        cols = ", ".join([f"`{k}`" for k in fixtures[0].keys()])
        placeholders = ", ".join(["?"] * len(fixtures[0]))
        cursor.execute("DROP TABLE IF EXISTS fixtures")
        cursor.execute("""
            CREATE TABLE fixtures (
                id INTEGER PRIMARY KEY, event INTEGER, kickoff_time TEXT, finished INTEGER,
                home_team_id INTEGER, home_team TEXT, home_team_short TEXT,
                away_team_id INTEGER, away_team TEXT, away_team_short TEXT,
                home_difficulty INTEGER, away_difficulty INTEGER,
                home_score INTEGER, away_score INTEGER
            )
        """)
        cursor.executemany(f"INSERT INTO fixtures ({cols}) VALUES ({placeholders})", [tuple(f.values()) for f in fixtures])

    if fdr_runs:
        cols = ", ".join([f"`{k}`" for k in fdr_runs[0].keys()])
        placeholders = ", ".join(["?"] * len(fdr_runs[0]))
        cursor.execute("DROP TABLE IF EXISTS team_fdr_runs")
        cursor.execute("""
            CREATE TABLE team_fdr_runs (
                team_id INTEGER PRIMARY KEY, team_name TEXT,
                avg_fdr_gw1_5 REAL, fixtures_gw1_5 TEXT
            )
        """)
        cursor.executemany(f"INSERT INTO team_fdr_runs ({cols}) VALUES ({placeholders})", [tuple(r.values()) for r in fdr_runs])

    conn.commit()
    conn.close()
    print(f"[+] Saved fixtures, teams, and FDR matrices to SQLite {db_filepath}")

def main():
    teams, events, fixtures, fdr_runs = process_fixtures_and_teams()
    if not teams:
        sys.exit(1)

    root_dir = get_project_root()
    data_dir = os.path.join(root_dir, "fpl_data")
    os.makedirs(data_dir, exist_ok=True)

    save_csv(fixtures, os.path.join(data_dir, "fpl_fixtures_2026_27.csv"))
    save_csv(teams, os.path.join(data_dir, "fpl_teams_ratings.csv"))
    save_csv(events, os.path.join(data_dir, "fpl_gameweek_schedule.csv"))
    save_csv(fdr_runs, os.path.join(data_dir, "fpl_team_fdr_runs_gw1_5.csv"))

    save_sqlite(teams, events, fixtures, fdr_runs, os.path.join(data_dir, "fpl_2026_27.db"))

if __name__ == "__main__":
    main()

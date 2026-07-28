#!/usr/bin/env python3
"""
FPL 2026/27 Season Player Dataset & Change Tracker
Scrapes the official Fantasy Premier League (FPL) API, tags each record with a 
scraped_at timestamp and is_latest flag, saves snapshot history to SQLite/CSV/JSON, 
and compares against previous runs to report price changes, selection shifts, and status updates.
"""

import json
import os
import sys
import urllib.request
import csv
import sqlite3
from datetime import datetime, timezone

FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"

def get_project_root():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.basename(script_dir) == "scripts":
        return os.path.dirname(script_dir)
    return script_dir

def fetch_fpl_bootstrap():
    print(f"[*] Fetching bootstrap static data from {FPL_BOOTSTRAP_URL}...")
    req = urllib.request.Request(
        FPL_BOOTSTRAP_URL,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"[!] Error fetching FPL data: {e}", file=sys.stderr)
        sys.exit(1)

def process_player_data(data, timestamp):
    teams = {t["id"]: t for t in data.get("teams", [])}
    element_types = {e["id"]: e for e in data.get("element_types", [])}
    
    players = data.get("elements", [])
    print(f"[*] Total players retrieved: {len(players)}")

    processed_players = []

    for p in players:
        team_info = teams.get(p.get("team"), {})
        pos_info = element_types.get(p.get("element_type"), {})

        raw_cost = p.get("now_cost", 0)
        cost_m = round(raw_cost / 10.0, 1) if raw_cost else 0.0

        player_record = {
            "scraped_at": timestamp,
            "is_latest": 1,
            "id": p.get("id"),
            "web_name": p.get("web_name"),
            "first_name": p.get("first_name"),
            "second_name": p.get("second_name"),
            "full_name": f"{p.get('first_name', '')} {p.get('second_name', '')}".strip(),
            "team": team_info.get("name", "Unknown"),
            "team_short": team_info.get("short_name", ""),
            "position": pos_info.get("singular_name_short", "Unknown"),
            "position_full": pos_info.get("singular_name", "Unknown"),
            "cost_m": cost_m,
            "now_cost": raw_cost,
            "selected_by_percent": float(p.get("selected_by_percent", 0.0) or 0.0),
            "status": p.get("status"),
            "news": p.get("news", ""),
            "chance_of_playing_this_round": p.get("chance_of_playing_this_round"),
            "chance_of_playing_next_round": p.get("chance_of_playing_next_round"),
            "total_points": p.get("total_points", 0),
            "points_per_game": float(p.get("points_per_game", 0.0) or 0.0),
            "minutes": p.get("minutes", 0),
            "goals_scored": p.get("goals_scored", 0),
            "assists": p.get("assists", 0),
            "clean_sheets": p.get("clean_sheets", 0),
            "goals_conceded": p.get("goals_conceded", 0),
            "own_goals": p.get("own_goals", 0),
            "penalties_saved": p.get("penalties_saved", 0),
            "penalties_missed": p.get("penalties_missed", 0),
            "yellow_cards": p.get("yellow_cards", 0),
            "red_cards": p.get("red_cards", 0),
            "saves": p.get("saves", 0),
            "bonus": p.get("bonus", 0),
            "bps": p.get("bps", 0),
            "influence": float(p.get("influence", 0.0) or 0.0),
            "creativity": float(p.get("creativity", 0.0) or 0.0),
            "threat": float(p.get("threat", 0.0) or 0.0),
            "ict_index": float(p.get("ict_index", 0.0) or 0.0),
            "starts": p.get("starts", 0),
            "expected_goals": float(p.get("expected_goals", 0.0) or 0.0),
            "expected_assists": float(p.get("expected_assists", 0.0) or 0.0),
            "expected_goal_involvements": float(p.get("expected_goal_involvements", 0.0) or 0.0),
            "expected_goals_conceded": float(p.get("expected_goals_conceded", 0.0) or 0.0),
            "expected_goals_per_90": float(p.get("expected_goals_per_90", 0.0) or 0.0),
            "expected_assists_per_90": float(p.get("expected_assists_per_90", 0.0) or 0.0),
            "expected_goal_involvements_per_90": float(p.get("expected_goal_involvements_per_90", 0.0) or 0.0),
            "expected_goals_conceded_per_90": float(p.get("expected_goals_conceded_per_90", 0.0) or 0.0),
            "goals_conceded_per_90": float(p.get("goals_conceded_per_90", 0.0) or 0.0),
            "saves_per_90": float(p.get("saves_per_90", 0.0) or 0.0),
            "starts_per_90": float(p.get("starts_per_90", 0.0) or 0.0),
            "clean_sheets_per_90": float(p.get("clean_sheets_per_90", 0.0) or 0.0),
        }
        processed_players.append(player_record)

    return processed_players

def save_csv(players, latest_filepath, history_filepath):
    if not players:
        return
    fieldnames = list(players[0].keys())
    
    with open(latest_filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(players)
    print(f"[+] Saved latest CSV to {latest_filepath}")

    if os.path.exists(history_filepath):
        rows = []
        with open(history_filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                row["is_latest"] = 0
                rows.append(row)
        rows.extend(players)
        with open(history_filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
    else:
        with open(history_filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(players)
    print(f"[+] Updated history CSV in {history_filepath}")

def save_json(players, filepath):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(players, f, indent=2, ensure_ascii=False)
    print(f"[+] Saved latest JSON to {filepath}")

def save_sqlite_and_find_changes(players, db_filepath):
    if not players:
        return [], None
    
    conn = sqlite3.connect(db_filepath)
    cursor = conn.cursor()
    
    sample = players[0]
    col_defs = []
    for k, v in sample.items():
        if isinstance(v, int): col_defs.append(f"`{k}` INTEGER")
        elif isinstance(v, float): col_defs.append(f"`{k}` REAL")
        else: col_defs.append(f"`{k}` TEXT")
            
    cursor.execute("PRAGMA table_info(player_snapshots)")
    existing_cols = [info[1] for info in cursor.fetchall()]
    if existing_cols and "is_latest" not in existing_cols:
        cursor.execute("DROP TABLE player_snapshots")

    cursor.execute(f"CREATE TABLE IF NOT EXISTS player_snapshots ({', '.join(col_defs)}, PRIMARY KEY (`id`, `scraped_at`))")
    
    cursor.execute("SELECT MAX(scraped_at) FROM player_snapshots")
    prev_timestamp = cursor.fetchone()[0]

    cursor.execute("UPDATE player_snapshots SET is_latest = 0")

    placeholders = ", ".join(["?"] * len(sample))
    cols = ", ".join([f"`{k}`" for k in sample.keys()])
    insert_sql = f"INSERT OR REPLACE INTO player_snapshots ({cols}) VALUES ({placeholders})"
    rows = [tuple(p.values()) for p in players]
    cursor.executemany(insert_sql, rows)

    cursor.execute(f"DROP TABLE IF EXISTS players")
    cursor.execute(f"CREATE TABLE players ({', '.join(col_defs)}, PRIMARY KEY (`id`))")
    cursor.executemany(f"INSERT INTO players ({cols}) VALUES ({placeholders})", rows)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_snap_id ON player_snapshots(id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_snap_time ON player_snapshots(scraped_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_snap_latest ON player_snapshots(is_latest)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_team ON players(team)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_position ON players(position)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cost ON players(cost_m)")

    changes = []
    if prev_timestamp and prev_timestamp != sample["scraped_at"]:
        query = """
        SELECT 
            curr.id, curr.web_name, curr.team, curr.position,
            prev.cost_m AS old_cost, curr.cost_m AS new_cost,
            ROUND(curr.cost_m - prev.cost_m, 1) AS cost_diff,
            prev.selected_by_percent AS old_selected, curr.selected_by_percent AS new_selected,
            ROUND(curr.selected_by_percent - prev.selected_by_percent, 2) AS selected_diff,
            prev.status AS old_status, curr.status AS new_status, curr.news
        FROM player_snapshots curr
        JOIN player_snapshots prev ON curr.id = prev.id
        WHERE curr.scraped_at = ? AND prev.scraped_at = ?
          AND (curr.cost_m != prev.cost_m OR curr.selected_by_percent != prev.selected_by_percent OR curr.status != prev.status)
        ORDER BY ABS(curr.cost_m - prev.cost_m) DESC
        """
        cursor.execute(query, (sample["scraped_at"], prev_timestamp))
        changes = cursor.fetchall()

    conn.commit()
    conn.close()
    print(f"[+] Saved SQLite database & updated snapshot history in {db_filepath}")
    return changes, prev_timestamp

def main():
    now_iso = datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')
    print(f"[*] Starting FPL Scrape at: {now_iso}")

    data = fetch_fpl_bootstrap()
    players = process_player_data(data, now_iso)

    root_dir = get_project_root()
    data_dir = os.path.join(root_dir, "fpl_data")
    os.makedirs(data_dir, exist_ok=True)
    
    save_csv(players, os.path.join(data_dir, "fpl_players_2026_27.csv"), os.path.join(data_dir, "fpl_players_history.csv"))
    save_json(players, os.path.join(data_dir, "fpl_players_2026_27.json"))
    changes, prev_time = save_sqlite_and_find_changes(players, os.path.join(data_dir, "fpl_2026_27.db"))

    print("\n" + "="*50)
    print(f" SCRAPE COMPLETED | {now_iso}")
    print("="*50)
    print(f"Total Players: {len(players)}")

if __name__ == "__main__":
    main()

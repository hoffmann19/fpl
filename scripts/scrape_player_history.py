#!/usr/bin/env python3
"""
FPL 2025/26 Historical Player Price & Multi-Season Stats Scraper
Fetches element summaries for all players in the 2026/27 FPL dataset, extracting 
their 2025/26 start cost, 2025/26 end cost, YoY price changes, and multi-season history.
"""

import json
import os
import sys
import urllib.request
import csv
import sqlite3
from concurrent.futures import ThreadPoolExecutor, as_completed

FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"
FPL_SUMMARY_URL = "https://fantasy.premierleague.com/api/element-summary/{element_id}/"

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
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        return None

def fetch_player_summary(element_id):
    url = FPL_SUMMARY_URL.format(element_id=element_id)
    data = fetch_json(url)
    if not data:
        return element_id, [], {}
    
    history_past = data.get("history_past", [])
    past_25_26 = next((s for s in history_past if s.get("season_name") == "2025/26"), None)
    
    parsed_25_26 = {}
    if past_25_26:
        start_cost_m = round(past_25_26.get("start_cost", 0) / 10.0, 1)
        end_cost_m = round(past_25_26.get("end_cost", 0) / 10.0, 1)
        parsed_25_26 = {
            "cost_2025_26_start_m": start_cost_m,
            "cost_2025_26_end_m": end_cost_m,
            "cost_2025_26_change_m": round(end_cost_m - start_cost_m, 1),
            "points_2025_26": past_25_26.get("total_points", 0),
            "minutes_2025_26": past_25_26.get("minutes", 0),
            "goals_2025_26": past_25_26.get("goals_scored", 0),
            "assists_2025_26": past_25_26.get("assists", 0),
        }
        
    return element_id, history_past, parsed_25_26

def main():
    print("[*] Fetching 2026/27 bootstrap static player data...")
    bootstrap = fetch_json(FPL_BOOTSTRAP_URL)
    if not bootstrap:
        print("[!] Failed to fetch bootstrap static data", file=sys.stderr)
        sys.exit(1)

    teams = {t["id"]: t["name"] for t in bootstrap.get("teams", [])}
    pos = {e["id"]: e["singular_name_short"] for e in bootstrap.get("element_types", [])}
    elements = bootstrap.get("elements", [])

    print(f"[*] Fetching historical 25/26 prices & summaries for {len(elements)} players...")
    
    results = {}
    all_past_records = []
    
    with ThreadPoolExecutor(max_workers=12) as executor:
        future_to_id = {executor.submit(fetch_player_summary, el["id"]): el for el in elements}
        for future in as_completed(future_to_id):
            el = future_to_id[future]
            try:
                element_id, history_past, parsed_25_26 = future.result()
                results[element_id] = parsed_25_26
                
                for hp in history_past:
                    all_past_records.append({
                        "element_id": element_id,
                        "web_name": el.get("web_name"),
                        "team": teams.get(el.get("team"), "Unknown"),
                        "position": pos.get(el.get("element_type"), "Unknown"),
                        "season_name": hp.get("season_name"),
                        "start_cost_m": round((hp.get("start_cost") or 0) / 10.0, 1),
                        "end_cost_m": round((hp.get("end_cost") or 0) / 10.0, 1),
                        "total_points": hp.get("total_points", 0),
                        "minutes": hp.get("minutes", 0),
                        "goals_scored": hp.get("goals_scored", 0),
                        "assists": hp.get("assists", 0),
                        "clean_sheets": hp.get("clean_sheets", 0),
                        "starts": hp.get("starts", 0),
                        "expected_goals": float(hp.get("expected_goals", 0.0) or 0.0),
                        "expected_assists": float(hp.get("expected_assists", 0.0) or 0.0),
                    })
            except Exception as e:
                pass

    enriched_players = []
    for el in elements:
        eid = el["id"]
        p2526 = results.get(eid, {})
        now_cost_m = round((el.get("now_cost") or 0) / 10.0, 1)
        end_2526_m = p2526.get("cost_2025_26_end_m")
        yoy_change = round(now_cost_m - end_2526_m, 1) if end_2526_m is not None else None

        record = {
            "id": eid,
            "web_name": el.get("web_name"),
            "full_name": f"{el.get('first_name', '')} {el.get('second_name', '')}".strip(),
            "team": teams.get(el.get("team"), "Unknown"),
            "position": pos.get(el.get("element_type"), "Unknown"),
            "cost_26_27_m": now_cost_m,
            "cost_25_26_start_m": p2526.get("cost_2025_26_start_m"),
            "cost_25_26_end_m": end_2526_m,
            "cost_25_26_season_change_m": p2526.get("cost_2025_26_change_m"),
            "price_change_yoy_m": yoy_change,
            "selected_by_percent": float(el.get("selected_by_percent", 0.0) or 0.0),
            "points_25_26": p2526.get("points_2025_26", el.get("total_points", 0)),
            "minutes_25_26": p2526.get("minutes_2025_26", el.get("minutes", 0)),
            "goals_25_26": p2526.get("goals_2025_26", el.get("goals_scored", 0)),
            "assists_25_26": p2526.get("assists_2025_26", el.get("assists", 0)),
        }
        enriched_players.append(record)

    enriched_players.sort(key=lambda x: x["cost_26_27_m"], reverse=True)

    root_dir = get_project_root()
    data_dir = os.path.join(root_dir, "fpl_data")
    os.makedirs(data_dir, exist_ok=True)
    
    csv_path = os.path.join(data_dir, "fpl_players_2025_26_vs_2026_27.csv")
    fieldnames = list(enriched_players[0].keys())
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(enriched_players)
    print(f"[+] Saved comparison CSV to {csv_path}")

    db_path = os.path.join(data_dir, "fpl_2026_27.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("DROP TABLE IF EXISTS player_price_comparison")
    cursor.execute("""
        CREATE TABLE player_price_comparison (
            id INTEGER PRIMARY KEY,
            web_name TEXT, full_name TEXT, team TEXT, position TEXT,
            cost_26_27_m REAL, cost_25_26_start_m REAL, cost_25_26_end_m REAL,
            cost_25_26_season_change_m REAL, price_change_yoy_m REAL,
            selected_by_percent REAL, points_25_26 INTEGER, minutes_25_26 INTEGER,
            goals_25_26 INTEGER, assists_25_26 INTEGER
        )
    """)
    cols = ", ".join([f"`{k}`" for k in enriched_players[0].keys()])
    placeholders = ", ".join(["?"] * len(enriched_players[0]))
    cursor.executemany(f"INSERT INTO player_price_comparison ({cols}) VALUES ({placeholders})", [tuple(p.values()) for p in enriched_players])

    if all_past_records:
        cursor.execute("DROP TABLE IF EXISTS player_past_seasons")
        cursor.execute("""
            CREATE TABLE player_past_seasons (
                element_id INTEGER, web_name TEXT, team TEXT, position TEXT,
                season_name TEXT, start_cost_m REAL, end_cost_m REAL,
                total_points INTEGER, minutes INTEGER, goals_scored INTEGER,
                assists INTEGER, clean_sheets INTEGER, starts INTEGER,
                expected_goals REAL, expected_assists REAL,
                PRIMARY KEY (element_id, season_name)
            )
        """)
        cols_past = ", ".join([f"`{k}`" for k in all_past_records[0].keys()])
        placeholders_past = ", ".join(["?"] * len(all_past_records[0]))
        cursor.executemany(f"INSERT INTO player_past_seasons ({cols_past}) VALUES ({placeholders_past})", [tuple(p.values()) for p in all_past_records])

    conn.commit()
    conn.close()
    print(f"[+] Saved price comparisons & past seasons to SQLite {db_path}")

if __name__ == "__main__":
    main()

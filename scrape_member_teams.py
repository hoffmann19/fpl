#!/usr/bin/env python3
"""
FPL Mini-League Member Team Scraper
Scrapes detailed team profiles, historical season performance, and gameweek-by-gameweek 
squad picks (lineups, captains, chips, transfers, points) for all managers in a mini-league.
"""

import argparse
import csv
import json
import os
import sqlite3
import sys
import urllib.request
from datetime import datetime, timezone

FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"
FPL_LEAGUE_URL = "https://fantasy.premierleague.com/api/leagues-classic/{league_id}/standings/"
FPL_ENTRY_URL = "https://fantasy.premierleague.com/api/entry/{entry_id}/"
FPL_ENTRY_HISTORY_URL = "https://fantasy.premierleague.com/api/entry/{entry_id}/history/"
FPL_ENTRY_PICKS_URL = "https://fantasy.premierleague.com/api/entry/{entry_id}/event/{gw}/picks/"

def fetch_json(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        # Ignore 404s silently for future/unplayed gameweeks
        if hasattr(e, "code") and e.code == 404:
            return None
        print(f"[!] Error fetching {url}: {e}", file=sys.stderr)
        return None

def get_league_member_ids(league_id):
    print(f"[*] Fetching member list for mini-league {league_id}...")
    page = 1
    members = []
    league_name = "Unknown"

    while True:
        url = f"https://fantasy.premierleague.com/api/leagues-classic/{league_id}/standings/?page_new_entries={page}&page_standings={page}"
        data = fetch_json(url)
        if not data:
            break

        if "league" in data and data["league"].get("name"):
            league_name = data["league"]["name"]

        new_entries = data.get("new_entries", {}).get("results", [])
        standings_entries = data.get("standings", {}).get("results", [])
        entries = standings_entries if standings_entries else new_entries

        for item in entries:
            first_name = item.get("player_first_name", "") or item.get("player_name", "").split(" ")[0]
            last_name = item.get("player_last_name", "") or " ".join(item.get("player_name", "").split(" ")[1:])
            manager_name = f"{first_name} {last_name}".strip()

            members.append({
                "entry_id": item.get("entry"),
                "team_name": item.get("entry_name"),
                "manager_name": manager_name
            })

        has_next = (
            data.get("new_entries", {}).get("has_next", False) or 
            data.get("standings", {}).get("has_next", False)
        )
        if not has_next or not entries:
            break
        page += 1

    return league_name, members

def scrape_member_team_data(entry_id, player_lookup):
    print(f"[*] Scraping entry {entry_id} profile, history, and squad picks...")
    
    # 1. Main Entry Details
    entry_info = fetch_json(FPL_ENTRY_URL.format(entry_id=entry_id))
    profile = {}
    if entry_info:
        first_name = entry_info.get("player_first_name", "")
        last_name = entry_info.get("player_last_name", "")
        profile = {
            "entry_id": entry_id,
            "team_name": entry_info.get("name"),
            "manager_name": f"{first_name} {last_name}".strip(),
            "fpl_region": entry_info.get("player_region_name"),
            "joined_time": entry_info.get("joined_time"),
            "summary_overall_points": entry_info.get("summary_overall_points", 0),
            "summary_overall_rank": entry_info.get("summary_overall_rank"),
            "summary_event_points": entry_info.get("summary_event_points", 0),
            "summary_event_rank": entry_info.get("summary_event_rank"),
            "current_event": entry_info.get("current_event"),
            "last_deadline_value": round((entry_info.get("last_deadline_value") or 0) / 10.0, 1),
            "last_deadline_bank": round((entry_info.get("last_deadline_bank") or 0) / 10.0, 1),
            "last_deadline_total_transfers": entry_info.get("last_deadline_total_transfers", 0),
        }

    # 2. Historical Seasons Data
    history_info = fetch_json(FPL_ENTRY_HISTORY_URL.format(entry_id=entry_id))
    past_seasons = []
    gw_summaries = []
    chips_played = []

    if history_info:
        for p in history_info.get("past", []):
            past_seasons.append({
                "entry_id": entry_id,
                "season_name": p.get("season_name"),
                "total_points": p.get("total_points"),
                "rank": p.get("rank"),
                "rank_percentage": p.get("rank_percentage")
            })
            
        for c in history_info.get("chips", []):
            chips_played.append({
                "entry_id": entry_id,
                "chip_name": c.get("name"),
                "event": c.get("event"),
                "time": c.get("time")
            })

        for g in history_info.get("current", []):
            gw_summaries.append({
                "entry_id": entry_id,
                "event": g.get("event"),
                "points": g.get("points"),
                "total_points": g.get("total_points"),
                "rank": g.get("rank"),
                "overall_rank": g.get("overall_rank"),
                "bank_m": round((g.get("bank") or 0) / 10.0, 1),
                "value_m": round((g.get("value") or 0) / 10.0, 1),
                "event_transfers": g.get("event_transfers", 0),
                "event_transfers_cost": g.get("event_transfers_cost", 0),
                "points_on_bench": g.get("points_on_bench", 0)
            })

    # 3. Squad Picks (Lineup / Captains per Gameweek)
    squad_picks = []
    consecutive_missing = 0
    # Check gameweeks 1 to 38
    for gw in range(1, 39):
        picks_info = fetch_json(FPL_ENTRY_PICKS_URL.format(entry_id=entry_id, gw=gw))
        if not picks_info:
            consecutive_missing += 1
            if consecutive_missing >= 2:
                # Stop checking future gameweeks
                break
            continue
        
        consecutive_missing = 0
        active_chip = picks_info.get("active_chip")
        picks = picks_info.get("picks", [])

        
        for p in picks:
            element_id = p.get("element")
            player_data = player_lookup.get(element_id, {})
            
            squad_picks.append({
                "entry_id": entry_id,
                "event": gw,
                "position_number": p.get("position"), # 1-11 starting, 12-15 bench
                "is_starting": 1 if p.get("position", 15) <= 11 else 0,
                "element_id": element_id,
                "player_web_name": player_data.get("web_name", f"Player #{element_id}"),
                "player_full_name": player_data.get("full_name", ""),
                "team": player_data.get("team", ""),
                "position": player_data.get("position", ""),
                "cost_m": player_data.get("cost_m", 0.0),
                "multiplier": p.get("multiplier", 1),
                "is_captain": 1 if p.get("is_captain") else 0,
                "is_vice_captain": 1 if p.get("is_vice_captain") else 0,
                "active_chip": active_chip or ""
            })

    return profile, past_seasons, gw_summaries, chips_played, squad_picks

def save_sqlite_member_data(profiles, past_seasons, gw_summaries, chips_played, squad_picks, db_filepath):
    conn = sqlite3.connect(db_filepath)
    cursor = conn.cursor()

    # 1. Profiles Table
    if profiles:
        sample = profiles[0]
        col_defs = []
        for k, v in sample.items():
            if isinstance(v, int): col_defs.append(f"`{k}` INTEGER")
            elif isinstance(v, float): col_defs.append(f"`{k}` REAL")
            else: col_defs.append(f"`{k}` TEXT")
        
        cursor.execute("DROP TABLE IF EXISTS member_profiles")
        cursor.execute(f"CREATE TABLE member_profiles ({', '.join(col_defs)}, PRIMARY KEY (`entry_id`))")
        cols = ", ".join([f"`{k}`" for k in sample.keys()])
        placeholders = ", ".join(["?"] * len(sample))
        cursor.executemany(f"INSERT INTO member_profiles ({cols}) VALUES ({placeholders})", [tuple(p.values()) for p in profiles])

    # 2. Past Seasons History Table
    if past_seasons:
        sample = past_seasons[0]
        col_defs = []
        for k, v in sample.items():
            if isinstance(v, int): col_defs.append(f"`{k}` INTEGER")
            elif isinstance(v, float): col_defs.append(f"`{k}` REAL")
            else: col_defs.append(f"`{k}` TEXT")
        cursor.execute("DROP TABLE IF EXISTS member_past_history")
        cursor.execute(f"CREATE TABLE member_past_history ({', '.join(col_defs)}, PRIMARY KEY (`entry_id`, `season_name`))")
        cols = ", ".join([f"`{k}`" for k in sample.keys()])
        placeholders = ", ".join(["?"] * len(sample))
        cursor.executemany(f"INSERT INTO member_past_history ({cols}) VALUES ({placeholders})", [tuple(p.values()) for p in past_seasons])

    # 3. Squad Picks Table
    if squad_picks:
        sample = squad_picks[0]
        col_defs = []
        for k, v in sample.items():
            if isinstance(v, int): col_defs.append(f"`{k}` INTEGER")
            elif isinstance(v, float): col_defs.append(f"`{k}` REAL")
            else: col_defs.append(f"`{k}` TEXT")
        cursor.execute("DROP TABLE IF EXISTS member_squad_picks")
        cursor.execute(f"CREATE TABLE member_squad_picks ({', '.join(col_defs)}, PRIMARY KEY (`entry_id`, `event`, `position_number`))")
        cols = ", ".join([f"`{k}`" for k in sample.keys()])
        placeholders = ", ".join(["?"] * len(sample))
        cursor.executemany(f"INSERT INTO member_squad_picks ({cols}) VALUES ({placeholders})", [tuple(p.values()) for p in squad_picks])

    conn.commit()
    conn.close()
    print(f"[+] Successfully saved member profiles, history, and squad picks to {db_filepath}")

def save_csv(data_list, filepath):
    if not data_list:
        return
    fieldnames = list(data_list[0].keys())
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data_list)
    print(f"[+] Saved CSV to {filepath}")

def main():
    parser = argparse.ArgumentParser(description="Scrape FPL Mini-League Member Teams & Picks")
    parser.add_argument("--league-id", type=int, default=352792, help="FPL Mini-League ID (default: 352792)")
    args = parser.parse_args()

    # Load bootstrap player data to resolve player web names & teams
    bootstrap_data = fetch_json(FPL_BOOTSTRAP_URL)
    player_lookup = {}
    if bootstrap_data:
        teams = {t["id"]: t["name"] for t in bootstrap_data.get("teams", [])}
        pos = {e["id"]: e["singular_name_short"] for e in bootstrap_data.get("element_types", [])}
        for el in bootstrap_data.get("elements", []):
            raw_cost = el.get("now_cost", 0)
            cost_m = round(raw_cost / 10.0, 1) if raw_cost else 0.0
            player_lookup[el["id"]] = {
                "web_name": el.get("web_name"),
                "full_name": f"{el.get('first_name', '')} {el.get('second_name', '')}".strip(),
                "team": teams.get(el.get("team"), "Unknown"),
                "position": pos.get(el.get("element_type"), "Unknown"),
                "cost_m": cost_m
            }

    league_name, members = get_league_member_ids(args.league_id)
    if not members:
        print(f"[!] No members found for league ID {args.league_id}", file=sys.stderr)
        sys.exit(1)

    print(f"\n[+] Found {len(members)} member(s) in league '{league_name}'")

    all_profiles = []
    all_past_seasons = []
    all_gw_summaries = []
    all_chips_played = []
    all_squad_picks = []

    for m in members:
        eid = m["entry_id"]
        profile, past, gws, chips, picks = scrape_member_team_data(eid, player_lookup)
        if profile: all_profiles.append(profile)
        if past: all_past_seasons.extend(past)
        if gws: all_gw_summaries.extend(gws)
        if chips: all_chips_played.extend(chips)
        if picks: all_squad_picks.extend(picks)

    # Save to SQLite
    save_sqlite_member_data(all_profiles, all_past_seasons, all_gw_summaries, all_chips_played, all_squad_picks, "fpl_2026_27.db")
    save_sqlite_member_data(all_profiles, all_past_seasons, all_gw_summaries, all_chips_played, all_squad_picks, "fpl_data/fpl_2026_27.db")

    # Save to CSV
    os.makedirs("fpl_data", exist_ok=True)
    save_csv(all_profiles, f"fpl_data/minileague_{args.league_id}_member_profiles.csv")
    save_csv(all_profiles, f"minileague_{args.league_id}_member_profiles.csv")

    save_csv(all_past_seasons, f"fpl_data/minileague_{args.league_id}_member_past_history.csv")
    save_csv(all_past_seasons, f"minileague_{args.league_id}_member_past_history.csv")

    if all_squad_picks:
        save_csv(all_squad_picks, f"fpl_data/minileague_{args.league_id}_squad_picks.csv")

    print("\n" + "="*50)
    print(f" MEMBER TEAM SCRAPE COMPLETED | League: {league_name}")
    print("="*50)
    for p in all_profiles:
        print(f"\n👤 Manager: {p['manager_name']} | Team: {p['team_name']}")
        print(f"   - Region: {p['fpl_region']} | Joined: {p['joined_time']}")

    if all_past_seasons:
        print(f"\n📜 Past History Highlights:")
        for past in all_past_seasons[-5:]: # show recent 5 seasons
            print(f"   - Season {past['season_name']}: Total Points: {past['total_points']} | Rank: {past['rank']:,} (Top {past['rank_percentage']}%)")

    if not all_squad_picks:
        print("\nℹ️  Note on Squad Lineups: Pre-season squad picks are kept locked by the official FPL API until the Gameweek 1 deadline. Once Gameweek 1 starts, squad picks and weekly captain choices will be automatically populated here.")

if __name__ == "__main__":
    main()

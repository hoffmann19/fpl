#!/usr/bin/env python3
"""
FPL Official API Scraper & Visualizer Builder
Scrapes live Fantasy Premier League data for Blue Square League (ID: 352792)
and compiles visualizer_data_2026_27.json and visualizer_data.json.
"""

import json
import os
import sys
import urllib.request
import sqlite3
from datetime import datetime, timezone

LEAGUE_ID = 352792

COLOR_PALETTE = [
    "#ff4757", "#2ed573", "#1e90ff", "#ffa502", "#ff47ff",
    "#00d2d3", "#20bf6b", "#a55eea", "#ff7f50", "#eccc68",
    "#ff9f1a"
]

def fetch_json(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[!] Error fetching {url}: {e}")
        return None

def sync_sqlite(db_path, league_id, bootstrap, results, managers_meta, gameweeks_dict, player_gw_scores, max_gw):
    """
    Sync all live FPL data into SQLite database:
    - minileague_members (current ranks, team names, total points)
    - minileague_standings (gameweek-by-gameweek standings, hits, points, chips, captain)
    - minileague_lineups (squads, starters, bench, captain, points)
    - minileague_transfers (all player transfers, GW points, points since move, PPG)
    - player_gameweek_scores (each player's gameweek score across all played gameweeks)
    - players (updated current season total points, PPG, cost, status)
    """
    print(f"[*] Syncing all live data to SQLite database at {db_path}...")
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. minileague_members
    cur.execute("""
        CREATE TABLE IF NOT EXISTS minileague_members (
            league_id INTEGER,
            league_name TEXT,
            entry_id INTEGER,
            team_name TEXT,
            manager_name TEXT,
            joined_time TEXT,
            rank TEXT,
            last_rank TEXT,
            event_total INTEGER,
            total_points INTEGER,
            summary_overall_points TEXT,
            summary_overall_rank TEXT,
            summary_event_points TEXT,
            summary_event_rank TEXT,
            fpl_region TEXT,
            fpl_joined_date TEXT,
            PRIMARY KEY (league_id, entry_id)
        );
    """)

    for item in results:
        entry_id = item.get("entry")
        cur.execute("""
            INSERT INTO minileague_members (
                league_id, league_name, entry_id, team_name, manager_name,
                rank, last_rank, event_total, total_points
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(league_id, entry_id) DO UPDATE SET
                team_name = excluded.team_name,
                manager_name = excluded.manager_name,
                rank = excluded.rank,
                last_rank = excluded.last_rank,
                event_total = excluded.event_total,
                total_points = excluded.total_points
        """, (
            league_id,
            "Blue Square",
            entry_id,
            item.get("entry_name"),
            item.get("player_name"),
            str(item.get("rank")),
            str(item.get("last_rank")),
            item.get("event_total"),
            item.get("total")
        ))

    # 2. minileague_standings
    cur.execute("""
        CREATE TABLE IF NOT EXISTS minileague_standings (
            league_id INTEGER,
            event INTEGER,
            entry_id INTEGER,
            manager_name TEXT,
            team_name TEXT,
            gw_points INTEGER,
            gw_hits INTEGER,
            gw_net_points INTEGER,
            overall_points INTEGER,
            overall_rank INTEGER,
            rank INTEGER,
            chip TEXT,
            transfers INTEGER,
            team_value REAL,
            bank REAL,
            captain_name TEXT,
            captain_points INTEGER,
            updated_at TEXT,
            PRIMARY KEY (league_id, event, entry_id)
        );
    """)

    # 3. minileague_lineups
    cur.execute("""
        CREATE TABLE IF NOT EXISTS minileague_lineups (
            league_id INTEGER,
            event INTEGER,
            entry_id INTEGER,
            manager_name TEXT,
            player_name TEXT,
            club TEXT,
            position TEXT,
            points INTEGER,
            is_captain INTEGER,
            is_vice_captain INTEGER,
            is_starting INTEGER,
            updated_at TEXT,
            PRIMARY KEY (league_id, event, entry_id, player_name)
        );
    """)

    # 4. minileague_transfers
    cur.execute("""
        CREATE TABLE IF NOT EXISTS minileague_transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            league_id INTEGER,
            event INTEGER,
            entry_id INTEGER,
            manager_name TEXT,
            team_name TEXT,
            in_name TEXT,
            in_club TEXT,
            in_pos TEXT,
            in_cost REAL,
            in_points INTEGER,
            in_season_points INTEGER,
            in_points_since INTEGER,
            in_ppg REAL,
            out_name TEXT,
            out_club TEXT,
            out_pos TEXT,
            out_cost REAL,
            out_points INTEGER,
            out_season_points INTEGER,
            out_points_since INTEGER,
            out_ppg REAL,
            net_points INTEGER,
            net_points_since INTEGER,
            transfer_time TEXT,
            updated_at TEXT
        );
    """)
    cur.execute("DELETE FROM minileague_transfers WHERE league_id = ?", (league_id,))

    for gw in range(1, max_gw + 1):
        gw_key = str(gw)
        gw_data = gameweeks_dict.get(gw_key, {})
        standings = gw_data.get("standings", [])
        lineups = gw_data.get("lineups", {})

        for s in standings:
            mgr_name = s.get("manager")
            entry_id = managers_meta.get(mgr_name, {}).get("entry_id")
            if not entry_id:
                continue

            cur.execute("""
                INSERT INTO minileague_standings (
                    league_id, event, entry_id, manager_name, team_name,
                    gw_points, gw_hits, gw_net_points, overall_points, overall_rank,
                    rank, chip, transfers, team_value, bank,
                    captain_name, captain_points, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(league_id, event, entry_id) DO UPDATE SET
                    gw_points = excluded.gw_points,
                    gw_hits = excluded.gw_hits,
                    gw_net_points = excluded.gw_net_points,
                    overall_points = excluded.overall_points,
                    overall_rank = excluded.overall_rank,
                    rank = excluded.rank,
                    chip = excluded.chip,
                    transfers = excluded.transfers,
                    team_value = excluded.team_value,
                    bank = excluded.bank,
                    captain_name = excluded.captain_name,
                    captain_points = excluded.captain_points,
                    updated_at = excluded.updated_at
            """, (
                league_id, gw, entry_id, mgr_name, s.get("team"),
                s.get("gw_points", 0), s.get("gw_hits", 0), s.get("gw_net_points", 0),
                s.get("overall_points", 0), s.get("overall_rank", 0), s.get("rank", 0),
                s.get("chip", "None"), s.get("transfers", 0), s.get("team_value", 0.0),
                s.get("bank", 0.0), s.get("captain", ""), s.get("captain_points", 0),
                now_iso
            ))

            for t in s.get("transfers_detail", []):
                cur.execute("""
                    INSERT INTO minileague_transfers (
                        league_id, event, entry_id, manager_name, team_name,
                        in_name, in_club, in_pos, in_cost, in_points,
                        in_season_points, in_points_since, in_ppg,
                        out_name, out_club, out_pos, out_cost, out_points,
                        out_season_points, out_points_since, out_ppg,
                        net_points, net_points_since, transfer_time, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    league_id, gw, entry_id, mgr_name, s.get("team"),
                    t.get("in_name"), t.get("in_club"), t.get("in_pos"), t.get("in_cost", 0.0),
                    t.get("in_points", 0), t.get("in_season_points", 0), t.get("in_points_since", 0),
                    t.get("in_ppg", 0.0), t.get("out_name"), t.get("out_club"), t.get("out_pos"),
                    t.get("out_cost", 0.0), t.get("out_points", 0), t.get("out_season_points", 0),
                    t.get("out_points_since", 0), t.get("out_ppg", 0.0), t.get("net_points", 0),
                    t.get("net_points_since", 0), t.get("time"), now_iso
                ))

        for mgr_name, mgr_lineup in lineups.items():
            entry_id = managers_meta.get(mgr_name, {}).get("entry_id")
            if not entry_id:
                continue
            for p in mgr_lineup:
                cur.execute("""
                    INSERT INTO minileague_lineups (
                        league_id, event, entry_id, manager_name, player_name,
                        club, position, points, is_captain, is_vice_captain,
                        is_starting, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(league_id, event, entry_id, player_name) DO UPDATE SET
                        club = excluded.club,
                        position = excluded.position,
                        points = excluded.points,
                        is_captain = excluded.is_captain,
                        is_vice_captain = excluded.is_vice_captain,
                        is_starting = excluded.is_starting,
                        updated_at = excluded.updated_at
                """, (
                    league_id, gw, entry_id, mgr_name, p.get("name"),
                    p.get("club"), p.get("position"), p.get("points", 0),
                    1 if p.get("captain") else 0,
                    1 if p.get("vice_captain") else 0,
                    1 if p.get("starting") else 0,
                    now_iso
                ))

    # 5. player_gameweek_scores
    cur.execute("""
        CREATE TABLE IF NOT EXISTS player_gameweek_scores (
            element_id INTEGER,
            web_name TEXT,
            team TEXT,
            position TEXT,
            event INTEGER,
            points INTEGER,
            updated_at TEXT,
            PRIMARY KEY (element_id, event)
        );
    """)

    elements = {p["id"]: p for p in bootstrap.get("elements", [])}
    teams = {t["id"]: t for t in bootstrap.get("teams", [])}
    element_types = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}

    for pid, scores in player_gw_scores.items():
        el = elements.get(pid, {})
        wname = el.get("web_name", "")
        tname = teams.get(el.get("team"), {}).get("short_name", "")
        pos = element_types.get(el.get("element_type"), "MID")
        for g, pts in scores.items():
            cur.execute("""
                INSERT INTO player_gameweek_scores (
                    element_id, web_name, team, position, event, points, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(element_id, event) DO UPDATE SET
                    web_name = excluded.web_name,
                    team = excluded.team,
                    position = excluded.position,
                    points = excluded.points,
                    updated_at = excluded.updated_at
            """, (pid, wname, tname, pos, g, pts, now_iso))

    # 6. Update players table
    for pid, el in elements.items():
        tname = teams.get(el.get("team"), {}).get("name", "")
        tshort = teams.get(el.get("team"), {}).get("short_name", "")
        pos = element_types.get(el.get("element_type"), "MID")
        cur.execute("""
            INSERT INTO players (
                scraped_at, is_latest, id, web_name, first_name, second_name, full_name,
                team, team_short, position, cost_m, now_cost, selected_by_percent,
                status, news, total_points, points_per_game, minutes, goals_scored,
                assists, clean_sheets, goals_conceded, own_goals, penalties_saved,
                penalties_missed, yellow_cards, red_cards, saves, bonus, bps
            ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                scraped_at = excluded.scraped_at,
                is_latest = 1,
                web_name = excluded.web_name,
                first_name = excluded.first_name,
                second_name = excluded.second_name,
                full_name = excluded.full_name,
                team = excluded.team,
                team_short = excluded.team_short,
                position = excluded.position,
                cost_m = excluded.cost_m,
                now_cost = excluded.now_cost,
                selected_by_percent = excluded.selected_by_percent,
                status = excluded.status,
                news = excluded.news,
                total_points = excluded.total_points,
                points_per_game = excluded.points_per_game,
                minutes = excluded.minutes,
                goals_scored = excluded.goals_scored,
                assists = excluded.assists,
                clean_sheets = excluded.clean_sheets,
                goals_conceded = excluded.goals_conceded,
                own_goals = excluded.own_goals,
                penalties_saved = excluded.penalties_saved,
                penalties_missed = excluded.penalties_missed,
                yellow_cards = excluded.yellow_cards,
                red_cards = excluded.red_cards,
                saves = excluded.saves,
                bonus = excluded.bonus,
                bps = excluded.bps
        """, (
            now_iso, pid, el.get("web_name"), el.get("first_name"), el.get("second_name"),
            f"{el.get('first_name', '')} {el.get('second_name', '')}".strip(),
            tname, tshort, pos,
            round(el.get("now_cost", 0) / 10.0, 1), el.get("now_cost", 0),
            float(el.get("selected_by_percent") or 0.0), el.get("status"), el.get("news"),
            el.get("total_points", 0), float(el.get("points_per_game") or 0.0),
            el.get("minutes", 0), el.get("goals_scored", 0), el.get("assists", 0),
            el.get("clean_sheets", 0), el.get("goals_conceded", 0), el.get("own_goals", 0),
            el.get("penalties_saved", 0), el.get("penalties_missed", 0), el.get("yellow_cards", 0),
            el.get("red_cards", 0), el.get("saves", 0), el.get("bonus", 0), el.get("bps", 0)
        ))

    conn.commit()
    conn.close()
    print(f"[+] SQLite database successfully synced at {db_path}!")

def main():
    print("[*] Fetching FPL bootstrap static data...")
    bootstrap = fetch_json("https://fantasy.premierleague.com/api/bootstrap-static/")
    if not bootstrap:
        print("[!] Failed to fetch bootstrap static")
        return

    elements = {p["id"]: p for p in bootstrap["elements"]}
    teams = {t["id"]: t for t in bootstrap["teams"]}
    element_types = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}
    events = bootstrap["events"]

    # Determine current and finished GWs
    current_gw = 1
    finished_gws = []
    for e in events:
        if e.get("is_current"):
            current_gw = e["id"]
        if e.get("finished"):
            finished_gws.append(e["id"])

    # Max GW to process (at least 1)
    max_gw = max(current_gw, max(finished_gws, default=1))
    print(f"[*] Current Gameweek: {current_gw}, Max Gameweek: {max_gw}")

    # Fetch League Standings
    print(f"[*] Fetching standings for Blue Square mini-league (ID: {LEAGUE_ID})...")
    standings_data = fetch_json(f"https://fantasy.premierleague.com/api/leagues-classic/{LEAGUE_ID}/standings/")
    if not standings_data:
        print("[!] Failed to fetch league standings")
        return

    results = standings_data.get("standings", {}).get("results", [])
    print(f"[*] Found {len(results)} managers in Blue Square!")

    managers_meta = {}
    for idx, item in enumerate(results):
        mgr_name = item.get("player_name", "").strip()
        team_name = item.get("entry_name", "").strip()
        managers_meta[mgr_name] = {
            "team": team_name,
            "color": COLOR_PALETTE[idx % len(COLOR_PALETTE)],
            "entry_id": item.get("entry")
        }

    gameweeks_dict = {}

    for gw in range(1, 39):
        gameweeks_dict[str(gw)] = {
            "standings": [],
            "lineups": {}
        }

    # Pre-fetch manager transfer histories for all managers
    manager_transfers = {}
    print("[*] Fetching manager transfer histories...")
    for mgr_name, meta in managers_meta.items():
        entry_id = meta.get("entry_id")
        if entry_id:
            t_data = fetch_json(f"https://fantasy.premierleague.com/api/entry/{entry_id}/transfers/") or []
            manager_transfers[mgr_name] = t_data
        else:
            manager_transfers[mgr_name] = []

    # Pre-fetch live player stats for all gameweeks 1 to max_gw
    gw_live_stats = {}
    player_gw_scores = {}
    print(f"[*] Pre-fetching live player stats for Gameweeks 1 to {max_gw}...")
    for g in range(1, max_gw + 1):
        live_data = fetch_json(f"https://fantasy.premierleague.com/api/event/{g}/live/")
        g_stats = {}
        if live_data and "elements" in live_data:
            for el in live_data["elements"]:
                pid = el["id"]
                pts = el.get("stats", {}).get("total_points", 0)
                g_stats[pid] = el.get("stats", {})
                if pid not in player_gw_scores:
                    player_gw_scores[pid] = {}
                player_gw_scores[pid][g] = pts
        gw_live_stats[g] = g_stats

    # Process played gameweeks (1 to max_gw)
    for gw in range(1, max_gw + 1):
        print(f"[*] Processing Gameweek {gw}...")
        
        # Use pre-fetched live player stats for this GW
        live_stats = gw_live_stats.get(gw, {})

        # Fetch fixtures for this GW to calculate remaining players & remaining squad value
        fixtures_data = fetch_json(f"https://fantasy.premierleague.com/api/fixtures/?event={gw}") or []
        team_fixture_finished = {}
        for f in fixtures_data:
            finished = f.get("finished", False) or f.get("finished_provisional", False)
            team_fixture_finished[f.get("team_h")] = finished
            team_fixture_finished[f.get("team_a")] = finished

        gw_standings_raw = []

        for mgr_name, meta in managers_meta.items():
            entry_id = meta["entry_id"]
            picks_data = fetch_json(f"https://fantasy.premierleague.com/api/entry/{entry_id}/event/{gw}/picks/")
            
            if not picks_data:
                continue

            entry_hist = picks_data.get("entry_history", {})
            active_chip = picks_data.get("active_chip") or "None"
            picks = picks_data.get("picks", [])

            gw_points = entry_hist.get("points", 0)
            gw_hits = entry_hist.get("event_transfers_cost", 0)
            gw_net_points = gw_points - gw_hits
            overall_points = entry_hist.get("total_points", 0)
            overall_rank = entry_hist.get("overall_rank", 0)
            transfers = entry_hist.get("event_transfers", 0)
            team_value = (entry_hist.get("value", 1000) or 1000) / 10.0
            bank = (entry_hist.get("bank", 0) or 0) / 10.0

            captain_name = ""
            captain_pts = 0
            players_left = 0
            value_left = 0.0
            mgr_lineup = []

            for p in picks:
                p_id = p["element"]
                el_info = elements.get(p_id, {})
                t_info = teams.get(el_info.get("team"), {})
                stats = live_stats.get(p_id, {})
                
                pos_code = element_types.get(el_info.get("element_type"), "MID")
                club_code = t_info.get("short_name", "PL")
                web_name = el_info.get("web_name", "")
                
                p_pts = stats.get("total_points", 0)
                is_cap = p.get("is_captain", False)
                is_vc = p.get("is_vice_captain", False)
                is_start = p.get("position", 15) <= 11
                multiplier = p.get("multiplier", 1)

                if is_cap:
                    captain_name = web_name
                    captain_pts = p_pts * multiplier

                if is_start:
                    p_team_id = el_info.get("team")
                    is_match_finished = team_fixture_finished.get(p_team_id, False)
                    if not is_match_finished:
                        players_left += 1
                        value_left += (el_info.get("now_cost", 0) / 10.0)

                mgr_lineup.append({
                    "name": web_name,
                    "club": club_code,
                    "position": pos_code,
                    "points": p_pts * (multiplier if is_start else 1),
                    "captain": is_cap,
                    "vice_captain": is_vc,
                    "starting": is_start,
                    "sub_in": False,
                    "sub_out": False
                })

            # Calculate transfers detail for this manager in this GW
            mgr_gw_transfers = [t for t in manager_transfers.get(mgr_name, []) if t.get("event") == gw]
            transfers_detail = []
            transfers_in_names = []
            transfers_out_names = []

            for t in mgr_gw_transfers:
                in_id = t.get("element_in")
                out_id = t.get("element_out")
                in_el = elements.get(in_id, {})
                out_el = elements.get(out_id, {})
                in_name = in_el.get("web_name", "Unknown")
                out_name = out_el.get("web_name", "Unknown")
                in_club = teams.get(in_el.get("team"), {}).get("short_name", "")
                out_club = teams.get(out_el.get("team"), {}).get("short_name", "")
                in_pos = element_types.get(in_el.get("element_type"), "MID")
                out_pos = element_types.get(out_el.get("element_type"), "MID")

                in_pts = live_stats.get(in_id, {}).get("total_points", 0)
                out_pts = live_stats.get(out_id, {}).get("total_points", 0)

                in_pts_since = sum(player_gw_scores.get(in_id, {}).get(g, 0) for g in range(gw, max_gw + 1))
                out_pts_since = sum(player_gw_scores.get(out_id, {}).get(g, 0) for g in range(gw, max_gw + 1))
                net_pts_since = in_pts_since - out_pts_since

                in_season_pts = in_el.get("total_points", in_pts)
                out_season_pts = out_el.get("total_points", out_pts)
                in_ppg = float(in_el.get("points_per_game") or 0.0)
                out_ppg = float(out_el.get("points_per_game") or 0.0)

                transfers_in_names.append(in_name)
                transfers_out_names.append(out_name)
                transfers_detail.append({
                    "in_name": in_name,
                    "in_club": in_club,
                    "in_pos": in_pos,
                    "in_cost": round(t.get("element_in_cost", 0) / 10.0, 1),
                    "in_points": in_pts,
                    "in_season_points": in_season_pts,
                    "in_points_since": in_pts_since,
                    "in_ppg": in_ppg,
                    "out_name": out_name,
                    "out_club": out_club,
                    "out_pos": out_pos,
                    "out_cost": round(t.get("element_out_cost", 0) / 10.0, 1),
                    "out_points": out_pts,
                    "out_season_points": out_season_pts,
                    "out_points_since": out_pts_since,
                    "out_ppg": out_ppg,
                    "net_points": in_pts - out_pts,
                    "net_points_since": net_pts_since,
                    "transfer_gw": gw,
                    "time": t.get("time")
                })

            # Fallback to squad diffing if transfers were recorded but not in transfers endpoint
            if not transfers_detail and gw > 1:
                prev_lineup = gameweeks_dict.get(str(gw - 1), {}).get("lineups", {}).get(mgr_name, [])
                if prev_lineup:
                    curr_names = {p["name"]: p for p in mgr_lineup}
                    prev_names = {p["name"]: p for p in prev_lineup}
                    ins = [p for name, p in curr_names.items() if name not in prev_names]
                    outs = [p for name, p in prev_names.items() if name not in curr_names]
                    for i in range(max(len(ins), len(outs))):
                        in_p = ins[i] if i < len(ins) else None
                        out_p = outs[i] if i < len(outs) else None
                        in_n = in_p["name"] if in_p else "-"
                        out_n = out_p["name"] if out_p else "-"
                        in_p_pts = in_p["points"] if in_p else 0
                        out_p_pts = 0
                        
                        # Match with element in bootstrap if available
                        in_el_fb = next((e for e in elements.values() if e.get("web_name") == in_n), {}) if in_p else {}
                        out_el_fb = next((e for e in elements.values() if e.get("web_name") == out_n), {}) if out_p else {}

                        in_pid = in_el_fb.get("id")
                        out_pid = out_el_fb.get("id")
                        in_pts_since = sum(player_gw_scores.get(in_pid, {}).get(g, 0) for g in range(gw, max_gw + 1)) if in_pid else in_p_pts
                        out_pts_since = sum(player_gw_scores.get(out_pid, {}).get(g, 0) for g in range(gw, max_gw + 1)) if out_pid else out_p_pts

                        if in_p:
                            transfers_in_names.append(in_n)
                        if out_p:
                            transfers_out_names.append(out_n)
                        transfers_detail.append({
                            "in_name": in_n,
                            "in_club": in_p["club"] if in_p else "",
                            "in_pos": in_p["position"] if in_p else "",
                            "in_cost": 0.0,
                            "in_points": in_p_pts,
                            "in_season_points": in_el_fb.get("total_points", in_p_pts),
                            "in_points_since": in_pts_since,
                            "in_ppg": float(in_el_fb.get("points_per_game") or 0.0),
                            "out_name": out_n,
                            "out_club": out_p["club"] if out_p else "",
                            "out_pos": out_p["position"] if out_p else "",
                            "out_cost": 0.0,
                            "out_points": out_p_pts,
                            "out_season_points": out_el_fb.get("total_points", out_p_pts),
                            "out_points_since": out_pts_since,
                            "out_ppg": float(out_el_fb.get("points_per_game") or 0.0),
                            "net_points": in_p_pts - out_p_pts,
                            "net_points_since": in_pts_since - out_pts_since,
                            "transfer_gw": gw,
                            "time": None
                        })

            gw_standings_raw.append({
                "manager": mgr_name,
                "team": meta["team"],
                "gw_points": gw_points,
                "gw_hits": gw_hits,
                "gw_net_points": gw_net_points,
                "overall_points": overall_points,
                "overall_rank": overall_rank,
                "chip": active_chip,
                "transfers": transfers,
                "team_value": team_value,
                "bank": bank,
                "captain": captain_name,
                "captain_points": captain_pts,
                "players_left": players_left,
                "value_left": round(value_left, 1),
                "transfers_in": transfers_in_names,
                "transfers_out": transfers_out_names,
                "transfers_detail": transfers_detail
            })

            gameweeks_dict[str(gw)]["lineups"][mgr_name] = mgr_lineup

        # Rank managers by overall_points (or gw_points if tie)
        gw_standings_raw.sort(key=lambda x: (x["overall_points"], x["gw_points"]), reverse=True)
        for rank_idx, record in enumerate(gw_standings_raw):
            record["rank"] = rank_idx + 1

        gameweeks_dict[str(gw)]["standings"] = gw_standings_raw

    # For unplayed GWs (max_gw+1 .. 38), populate with pre-season/latest standings
    latest_gw_key = str(max_gw)
    latest_standings = gameweeks_dict[latest_gw_key]["standings"]
    latest_lineups = gameweeks_dict[latest_gw_key]["lineups"]

    for gw in range(max_gw + 1, 39):
        unplayed_standings = [dict(s, gw_points=0, gw_hits=0, gw_net_points=0, transfers=0, chip="None", transfers_in=[], transfers_out=[], transfers_detail=[]) for s in latest_standings]
        unplayed_lineups = {mgr: [dict(p, points=0) for p in lineup] for mgr, lineup in latest_lineups.items()}
        gameweeks_dict[str(gw)]["standings"] = unplayed_standings
        gameweeks_dict[str(gw)]["lineups"] = unplayed_lineups

    # Create compact players catalog with total_points, PPG, cost, etc.
    players_catalog = {}
    for pid, p in elements.items():
        wname = p.get("web_name", "")
        t_info = teams.get(p.get("team"), {})
        pos_code = element_types.get(p.get("element_type"), "MID")
        players_catalog[wname] = {
            "id": pid,
            "web_name": wname,
            "team": t_info.get("short_name", ""),
            "position": pos_code,
            "total_points": p.get("total_points", 0),
            "points_per_game": float(p.get("points_per_game") or 0.0),
            "cost": round(p.get("now_cost", 0) / 10.0, 1),
            "gw_points": {str(g): pts for g, pts in player_gw_scores.get(pid, {}).items()}
        }

    output_data = {
        "season": "2026/27",
        "managers": {m: {"team": meta["team"], "color": meta["color"]} for m, meta in managers_meta.items()},
        "players": players_catalog,
        "gameweeks": gameweeks_dict
    }

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    out_2026_27 = os.path.join(project_root, "visualizer_data_2026_27.json")
    out_master = os.path.join(project_root, "visualizer_data.json")

    with open(out_2026_27, "w") as f:
        json.dump(output_data, f, indent=2)

    with open(out_master, "w") as f:
        json.dump(output_data, f, indent=2)

    print(f"[+] Successfully wrote {out_2026_27} and {out_master}!")

    # Sync to SQLite database
    db_path = os.path.join(project_root, "fpl_data", "fpl_2026_27.db")
    if os.path.exists(os.path.dirname(db_path)):
        sync_sqlite(db_path, LEAGUE_ID, bootstrap, results, managers_meta, gameweeks_dict, player_gw_scores, max_gw)

if __name__ == "__main__":
    main()

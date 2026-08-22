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

    # Process played gameweeks (1 to max_gw)
    for gw in range(1, max_gw + 1):
        print(f"[*] Processing Gameweek {gw}...")
        
        # Fetch live player stats for this GW
        live_data = fetch_json(f"https://fantasy.premierleague.com/api/event/{gw}/live/")
        live_stats = {}
        if live_data and "elements" in live_data:
            for el in live_data["elements"]:
                live_stats[el["id"]] = el.get("stats", {})

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
                "transfers_in": [],
                "transfers_out": []
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
        unplayed_standings = [dict(s, gw_points=0, gw_hits=0, gw_net_points=0, transfers=0, chip="None") for s in latest_standings]
        unplayed_lineups = {mgr: [dict(p, points=0) for p in lineup] for mgr, lineup in latest_lineups.items()}
        gameweeks_dict[str(gw)]["standings"] = unplayed_standings
        gameweeks_dict[str(gw)]["lineups"] = unplayed_lineups

    output_data = {
        "season": "2026/27",
        "managers": {m: {"team": meta["team"], "color": meta["color"]} for m, meta in managers_meta.items()},
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

if __name__ == "__main__":
    main()

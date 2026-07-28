#!/usr/bin/env python3
"""
FPL Gameweek Data Collector
This script collects live or historical gameweek data for an FPL mini-league
using the FPL Gameweek API.
"""

import argparse
import csv
import json
import os
import re
import sys
import requests

API_BASE_URL = "https://fontendfunctionsnortheuropenew.azurewebsites.net/api/LeagueFunction"
FUNCTION_KEY = "db059d47-8b44-476a-9dfc-509bceb87bee"

def parse_url(url):
    pattern = r'#/(?P<gw>\d+)/team/(?P<team>\d+)/league/(?P<league>\d+)'
    match = re.search(pattern, url)
    if not match:
        alt_pattern = r'#/team/(?P<team>\d+)/league/(?P<league>\d+)'
        match = re.search(alt_pattern, url)
        if match:
            return None, match.group('team'), match.group('league')
        return None, None, None
    return match.group('gw'), match.group('team'), match.group('league')

def fetch_league_data(league_id, entry_id, gameweek=None):
    params = {
        'leagueId': league_id,
        'entry': entry_id,
        'includeStats': 1
    }
    if gameweek:
        params['currentweek'] = gameweek

    headers = {
        'FunctionKey': FUNCTION_KEY,
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    }
    try:
        response = requests.get(API_BASE_URL, headers=headers, params=params, timeout=15)
        if response.status_code != 200:
            return None
        data = response.json()
        if not data.get("Succeeded", False):
            return None
        return data
    except Exception as e:
        return None

def save_standings_csv(team_datas, gw, output_dir):
    csv_file = os.path.join(output_dir, f"standings_gw{gw}.csv")
    sorted_teams = sorted(
        team_datas, 
        key=lambda x: (
            x.get('LiveData', {}).get('SeasonTotalPoints') or 0,
            x.get('LiveData', {}).get('LivePointsTotal') or 0
        ), 
        reverse=True
    )
    headers = [
        "Rank", "Team Name", "Manager Name", "GW Points", "GW Hits", 
        "GW Net Points", "Overall Points", "Overall Rank", "Chip Played", "Transfers Made",
        "Team Value", "Bank"
    ]
    with open(csv_file, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for idx, team in enumerate(sorted_teams):
            ld = team.get("LiveData", {})
            gw_pts = ld.get("LivePointsTotal", 0)
            hit = ld.get("TransferCost", 0)
            net_gw_pts = ld.get("LivePointsTotalIncTransferCost", gw_pts)
            writer.writerow([
                idx + 1, team.get("Name"), team.get("PlayerName"), gw_pts, hit, net_gw_pts,
                ld.get("SeasonTotalPoints"), ld.get("OverallRank"), ld.get("ActiveChip") or "None",
                ld.get("Transfers", 0), team.get("TeamValue", 0.0), team.get("BankValue", 0.0)
            ])

def save_lineups_csv(team_datas, gw, output_dir):
    csv_file = os.path.join(output_dir, f"lineups_gw{gw}.csv")
    headers = [
        "Manager Name", "Team Name", "Player Name", "Club", "Position", 
        "Points", "Captain", "Vice Captain", "Is Starting", "Subbed In", "Subbed Out"
    ]
    position_map = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}
    with open(csv_file, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for team in team_datas:
            manager = team.get("PlayerName")
            team_name = team.get("Name")
            players = team.get("LiveData", {}).get("Players", [])
            for p in players:
                pos_id = p.get("PlayerPosition", 0)
                pos = position_map.get(pos_id, f"POS_{pos_id}")
                is_starting = not p.get("OnBenchInPlayerTeam", False) or p.get("IsSubIn", False)
                if p.get("IsSub", False) and not p.get("IsSubIn", False):
                    is_starting = False
                writer.writerow([
                    manager, team_name, p.get("PlayerWebName"), p.get("TeamName"),
                    pos, p.get("Points"), p.get("IsCaptain", False), p.get("IsViceCaptain", False),
                    is_starting, p.get("IsSubIn", False), p.get("IsSubOut", False)
                ])

def main():
    parser = argparse.ArgumentParser(description="Collect FPL mini-league data")
    parser.add_argument("url", help="FPL Gameweek URL")
    parser.add_argument("-o", "--output-dir", default=".", help="Directory to save CSV/JSON outputs")
    parser.add_argument("--json", action="store_true", help="Save raw JSON")
    parser.add_argument("--standings-only", action="store_true", help="Only fetch standings")
    args = parser.parse_args()

    gw, team_id, league_id = parse_url(args.url)
    if not league_id or not team_id:
        sys.exit(1)
        
    data = fetch_league_data(league_id, team_id, gw)
    if not data:
        sys.exit(1)
        
    active_gw = data.get("Gameweek") or gw
    team_datas = data.get("TeamDatas", [])
    
    if not args.standings_only:
        for team in team_datas:
            t_entry = team.get("EntryId")
            ld = team.get("LiveData", {})
            players = ld.get("Players", [])
            if not players and t_entry and t_entry != int(team_id):
                team_data = fetch_league_data(league_id, t_entry, active_gw)
                if team_data:
                    for response_team in team_data.get("TeamDatas", []):
                        if response_team.get("EntryId") == t_entry:
                            team["LiveData"] = response_team.get("LiveData", {})
                            break
                            
    save_standings_csv(team_datas, active_gw, args.output_dir)
    save_lineups_csv(team_datas, active_gw, args.output_dir)

if __name__ == "__main__":
    main()

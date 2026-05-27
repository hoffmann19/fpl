#!/usr/bin/env python3
"""
FPL Bulk Gameweek Data Collector
This script collects standings and team lineups for all gameweeks (1 to 38)
and saves them both as individual gameweek CSVs and combined master CSVs.
"""

import argparse
import csv
import json
import os
import sys
import time
import requests

API_BASE_URL = "https://fontendfunctionsnortheuropenew.azurewebsites.net/api/LeagueFunction"
FUNCTION_KEY = "db059d47-8b44-476a-9dfc-509bceb87bee"

def fetch_league_data(league_id, entry_id, gameweek):
    """
    Fetches league data for a specific entry and gameweek.
    """
    params = {
        'leagueId': league_id,
        'entry': entry_id,
        'includeStats': 1,
        'currentweek': gameweek
    }
    headers = {
        'FunctionKey': FUNCTION_KEY,
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    # Try up to 3 times in case of rate limits or transient errors
    for attempt in range(3):
        try:
            response = requests.get(API_BASE_URL, headers=headers, params=params, timeout=15)
            if response.status_code == 200:
                data = response.json()
                if data.get("Succeeded", False):
                    return data
            elif response.status_code == 401:
                print(f"[!] Unauthorized request for GW {gameweek}, entry {entry_id}.", file=sys.stderr)
                return None
            time.sleep(0.5 * (attempt + 1))
        except Exception as e:
            print(f"[!] Request attempt {attempt+1} failed: {e}", file=sys.stderr)
            time.sleep(1)
    return None

def main():
    parser = argparse.ArgumentParser(description="Collect all gameweeks of FPL mini-league data")
    parser.add_argument("--league", default="496563", help="League ID")
    parser.add_argument("--entry", default="2613587", help="Manager entry/team ID")
    parser.add_argument("--start-gw", type=int, default=1, help="Start gameweek (default: 1)")
    parser.add_argument("--end-gw", type=int, default=38, help="End gameweek (default: 38)")
    parser.add_argument("-o", "--output-dir", default="fpl_data", help="Directory to save output files")
    
    args = parser.parse_args()
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Master file paths
    master_standings_file = os.path.join(args.output_dir, "master_standings.csv")
    master_lineups_file = os.path.join(args.output_dir, "master_lineups.csv")
    
    # Initialize master CSV writers
    standings_headers = [
        "Gameweek", "Rank", "Team Name", "Manager Name", "GW Points", 
        "GW Hits", "GW Net Points", "Overall Points", "Overall Rank", "Chip Played", "Transfers Made"
    ]
    lineups_headers = [
        "Gameweek", "Manager Name", "Team Name", "Player Name", "Club", "Position", 
        "Points", "Captain", "Vice Captain", "Is Starting", "Subbed In", "Subbed Out"
    ]
    
    position_map = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}
    
    # Open master files
    master_standings_f = open(master_standings_file, mode='w', newline='', encoding='utf-8')
    master_lineups_f = open(master_lineups_file, mode='w', newline='', encoding='utf-8')
    
    standings_writer = csv.writer(master_standings_f)
    lineups_writer = csv.writer(master_lineups_f)
    
    standings_writer.writerow(standings_headers)
    lineups_writer.writerow(lineups_headers)
    
    print(f"[*] Starting collection from GW {args.start_gw} to GW {args.end_gw}...")
    print(f"[*] Results will be stored in '{args.output_dir}/'")
    
    try:
        for gw in range(args.start_gw, args.end_gw + 1):
            print(f"\n==================== GAMEWEEK {gw} ====================")
            
            # 1. Fetch standings data using the anchor entry
            gw_data = fetch_league_data(args.league, args.entry, gw)
            if not gw_data:
                print(f"[!] Skipping GW {gw}: Failed to fetch primary standings data.", file=sys.stderr)
                continue
                
            team_datas = gw_data.get("TeamDatas", [])
            if not team_datas:
                print(f"[!] Skipping GW {gw}: No team datas returned.", file=sys.stderr)
                continue
                
            print(f"[*] Found {len(team_datas)} teams. Fetching lineups...")
            
            # Create individual GW directory
            gw_dir = os.path.join(args.output_dir, f"gw{gw}")
            os.makedirs(gw_dir, exist_ok=True)
            
            # Fetch lineups for all teams in the league for this gameweek
            for idx, team in enumerate(team_datas):
                t_entry = team.get("EntryId")
                t_name = team.get("Name")
                ld = team.get("LiveData", {})
                players = ld.get("Players", [])
                
                # If players are empty (which is true for all except the primary anchor entry), fetch them
                if not players and t_entry and t_entry != int(args.entry):
                    print(f"    - [{idx+1}/{len(team_datas)}] Fetching lineup: {t_name}")
                    team_gw_data = fetch_league_data(args.league, t_entry, gw)
                    if team_gw_data:
                        for response_team in team_gw_data.get("TeamDatas", []):
                            if response_team.get("EntryId") == t_entry:
                                team["LiveData"] = response_team.get("LiveData", {})
                                break
                    # Sleep slightly to avoid overwhelming the server
                    time.sleep(0.1)
            
            # Sort teams for the individual standings file
            sorted_teams = sorted(
                team_datas, 
                key=lambda x: (
                    x.get('LiveData', {}).get('SeasonTotalPoints') or 0,
                    x.get('LiveData', {}).get('LivePointsTotal') or 0
                ), 
                reverse=True
            )
            
            # Write individual standings CSV
            gw_standings_file = os.path.join(gw_dir, "standings.csv")
            with open(gw_standings_file, mode='w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(standings_headers[1:]) # Skip "Gameweek" col for individual files
                
                for idx, team in enumerate(sorted_teams):
                    ld = team.get("LiveData", {})
                    gw_pts = ld.get("LivePointsTotal", 0)
                    hit = ld.get("TransferCost", 0)
                    net_gw_pts = ld.get("LivePointsTotalIncTransferCost", gw_pts)
                    
                    # Write to individual CSV
                    writer.writerow([
                        idx + 1,
                        team.get("Name"),
                        team.get("PlayerName"),
                        gw_pts,
                        hit,
                        net_gw_pts,
                        ld.get("SeasonTotalPoints"),
                        ld.get("OverallRank"),
                        ld.get("ActiveChip") or "None",
                        ld.get("Transfers", 0)
                    ])
                    
                    # Write to master CSV
                    standings_writer.writerow([
                        gw,
                        idx + 1,
                        team.get("Name"),
                        team.get("PlayerName"),
                        gw_pts,
                        hit,
                        net_gw_pts,
                        ld.get("SeasonTotalPoints"),
                        ld.get("OverallRank"),
                        ld.get("ActiveChip") or "None",
                        ld.get("Transfers", 0)
                    ])
            
            # Write individual and master lineups CSV
            gw_lineups_file = os.path.join(gw_dir, "lineups.csv")
            with open(gw_lineups_file, mode='w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(lineups_headers[1:]) # Skip "Gameweek" col for individual files
                
                for team in team_datas:
                    manager = team.get("PlayerName")
                    t_name = team.get("Name")
                    players = team.get("LiveData", {}).get("Players", [])
                    
                    for p in players:
                        pos_id = p.get("PlayerPosition", 0)
                        pos = position_map.get(pos_id, f"POS_{pos_id}")
                        
                        is_starting = not p.get("OnBenchInPlayerTeam", False) or p.get("IsSubIn", False)
                        if p.get("IsSub", False) and not p.get("IsSubIn", False):
                            is_starting = False
                            
                        # Write to individual lineups CSV
                        writer.writerow([
                            manager,
                            t_name,
                            p.get("PlayerWebName"),
                            p.get("TeamName"),
                            pos,
                            p.get("Points"),
                            p.get("IsCaptain", False),
                            p.get("IsViceCaptain", False),
                            is_starting,
                            p.get("IsSubIn", False),
                            p.get("IsSubOut", False)
                        ])
                        
                        # Write to master lineups CSV
                        lineups_writer.writerow([
                            gw,
                            manager,
                            t_name,
                            p.get("PlayerWebName"),
                            p.get("TeamName"),
                            pos,
                            p.get("Points"),
                            p.get("IsCaptain", False),
                            p.get("IsViceCaptain", False),
                            is_starting,
                            p.get("IsSubIn", False),
                            p.get("IsSubOut", False)
                        ])
            
            print(f"[+] Gameweek {gw} completed and saved.")
            
            # Flush master file buffers to disk after each GW
            master_standings_f.flush()
            master_lineups_f.flush()
            
    finally:
        # Clean closing of files
        master_standings_f.close()
        master_lineups_f.close()
        
    print("\n" + "="*50)
    print("  BULK COLLECTION COMPLETE")
    print("="*50)
    print(f"[+] Master Standings: {master_standings_file}")
    print(f"[+] Master Lineups: {master_lineups_file}")
    print(f"[+] Individual Gameweek files saved in '{args.output_dir}/gw1/' to '{args.output_dir}/gw{args.end_gw}/'")

if __name__ == "__main__":
    main()

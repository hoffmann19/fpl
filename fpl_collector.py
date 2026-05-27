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

# The API URL and key reverse-engineered from www.fplgameweek.com
API_BASE_URL = "https://fontendfunctionsnortheuropenew.azurewebsites.net/api/LeagueFunction"
FUNCTION_KEY = "db059d47-8b44-476a-9dfc-509bceb87bee"

def parse_url(url):
    """
    Parses an FPL Gameweek URL to extract Gameweek, Team ID (Entry ID), and League ID.
    Example URL: https://www.fplgameweek.com/#/25/team/2613587/league/496563
    """
    # Regex to find patterns like /#/25/team/2613587/league/496563
    pattern = r'#/(?P<gw>\d+)/team/(?P<team>\d+)/league/(?P<league>\d+)'
    match = re.search(pattern, url)
    if not match:
        # Also try match without gw prefix, just in case: #/team/2613587/league/496563
        alt_pattern = r'#/team/(?P<team>\d+)/league/(?P<league>\d+)'
        match = re.search(alt_pattern, url)
        if match:
            return None, match.group('team'), match.group('league')
        return None, None, None
    return match.group('gw'), match.group('team'), match.group('league')

def fetch_league_data(league_id, entry_id, gameweek=None):
    """
    Fetches league data from the FPL Gameweek API.
    """
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    print(f"[*] Fetching FPL Gameweek data from API...")
    print(f"    URL: {API_BASE_URL}")
    print(f"    Parameters: {params}")
    
    try:
        response = requests.get(API_BASE_URL, headers=headers, params=params, timeout=15)
        if response.status_code == 401:
            print("[!] Error: Unauthorized. The API key might have expired or changed.", file=sys.stderr)
            return None
        elif response.status_code != 200:
            print(f"[!] Error: API returned status code {response.status_code}", file=sys.stderr)
            print(response.text[:500], file=sys.stderr)
            return None
        
        data = response.json()
        if not data.get("Succeeded", False):
            err = data.get("ErrorMessage", "Unknown error")
            print(f"[!] API error: {err}", file=sys.stderr)
            return None
            
        return data
    except Exception as e:
        print(f"[!] Request failed: {e}", file=sys.stderr)
        return None

def save_standings_csv(team_datas, gw, output_dir):
    """
    Saves mini-league standings table to a CSV file.
    """
    csv_file = os.path.join(output_dir, f"standings_gw{gw}.csv")
    
    # Sort teams by their total rank/points
    # LivePointsTotal contains the points for this gameweek.
    # SeasonTotalPoints contains the overall points.
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
        "GW Net Points", "Overall Points", "Overall Rank", "Chip Played", "Transfers Made"
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
            
    print(f"[+] Saved Standings to: {csv_file}")

def save_lineups_csv(team_datas, gw, output_dir):
    """
    Saves player selections and lineups for all teams to a single CSV file.
    """
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
                # Determine role (Captain/Vice Captain)
                role = "No"
                if p.get("IsCaptain"):
                    role = "Captain"
                elif p.get("IsViceCaptain"):
                    role = "Vice Captain"
                
                pos_id = p.get("PlayerPosition", 0)
                pos = position_map.get(pos_id, f"POS_{pos_id}")
                
                is_starting = not p.get("OnBenchInPlayerTeam", False) or p.get("IsSubIn", False)
                if p.get("IsSub", False) and not p.get("IsSubIn", False):
                    is_starting = False
                
                writer.writerow([
                    manager,
                    team_name,
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
                
    print(f"[+] Saved Lineups to: {csv_file}")

def main():
    parser = argparse.ArgumentParser(description="Collect FPL mini-league data from fplgameweek.com")
    parser.add_argument("url", help="FPL Gameweek URL (e.g. https://www.fplgameweek.com/#/25/team/2613587/league/496563)")
    parser.add_argument("-o", "--output-dir", default=".", help="Directory to save CSV/JSON outputs (default: current directory)")
    parser.add_argument("--json", action="store_true", help="Save the raw API JSON response")
    parser.add_argument("--standings-only", action="store_true", help="Only fetch standings (do not query lineups for all managers)")
    
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    if args.output_dir != "." and not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir)
        
    # Parse URL parameters
    gw, team_id, league_id = parse_url(args.url)
    if not league_id or not team_id:
        print("[!] Error: Could not parse a valid FPL Gameweek URL.", file=sys.stderr)
        print("    URL format must contain '#/{gameweek}/team/{team_id}/league/{league_id}'", file=sys.stderr)
        sys.exit(1)
        
    print(f"[*] Parsed Details:")
    print(f"    - Gameweek: {gw}")
    print(f"    - Manager Team ID (Entry): {team_id}")
    print(f"    - League ID: {league_id}")
    
    # Fetch primary data
    data = fetch_league_data(league_id, team_id, gw)
    if not data:
        print("[!] Error: Failed to fetch league data.", file=sys.stderr)
        sys.exit(1)
        
    league_name = data.get("LeagueName")
    active_gw = data.get("Gameweek") or gw
    print(f"\n[*] League: {league_name} (Gameweek {active_gw})")
    
    team_datas = data.get("TeamDatas", [])
    if not team_datas:
        print("[!] No team details found in API response.", file=sys.stderr)
        sys.exit(1)
        
    print(f"[*] Found {len(team_datas)} teams in league.")
    
    # If not standings only, fetch lineups for all teams in the league
    if not args.standings_only:
        print("[*] Fetching team lineups for all league members...")
        for idx, team in enumerate(team_datas):
            t_entry = team.get("EntryId")
            t_name = team.get("Name")
            ld = team.get("LiveData", {})
            players = ld.get("Players", [])
            
            # If players array is empty and it's not the primary entry we already fetched
            if not players and t_entry and t_entry != int(team_id):
                print(f"    - Fetching lineup for: {t_name} (Entry: {t_entry}) [{idx+1}/{len(team_datas)}]")
                team_data = fetch_league_data(league_id, t_entry, active_gw)
                if team_data:
                    for response_team in team_data.get("TeamDatas", []):
                        if response_team.get("EntryId") == t_entry:
                            team["LiveData"] = response_team.get("LiveData", {})
                            break
                            
    # Save Standings
    save_standings_csv(team_datas, active_gw, args.output_dir)
    
    # Save Lineups
    save_lineups_csv(team_datas, active_gw, args.output_dir)
    
    # Save JSON if requested
    if args.json:
        json_file = os.path.join(args.output_dir, f"raw_data_gw{active_gw}.json")
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"[+] Saved Raw JSON to: {json_file}")
        
    # Display quick summary in console
    print("\n" + "="*80)
    print(f"  SUMMARY STANDINGS - GW {active_gw} ({league_name})")
    print("="*80)
    
    sorted_teams = sorted(
        team_datas, 
        key=lambda x: (
            x.get('LiveData', {}).get('SeasonTotalPoints') or 0,
            x.get('LiveData', {}).get('LivePointsTotal') or 0
        ), 
        reverse=True
    )
    
    print(f"{'Rank':<5} | {'Team Name':<25} | {'Manager Name':<20} | {'GW Points':<10} | {'Total Points':<12}")
    print("-"*80)
    for idx, team in enumerate(sorted_teams):
        ld = team.get("LiveData", {})
        gw_pts = ld.get("LivePointsTotal", 0)
        tot_pts = ld.get("SeasonTotalPoints", 0)
        print(f"{idx+1:<5} | {team.get('Name')[:25]:<25} | {team.get('PlayerName')[:20]:<20} | {gw_pts:<10} | {tot_pts:<12}")
    print("="*80)

if __name__ == "__main__":
    main()

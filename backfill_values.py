#!/usr/bin/env python3
import os
import sys
import csv
import time
import requests

API_BASE_URL = "https://fontendfunctionsnortheuropenew.azurewebsites.net/api/LeagueFunction"
FUNCTION_KEY = "db059d47-8b44-476a-9dfc-509bceb87bee"
LEAGUE_ID = "496563"
ENTRY_ID = "2613587"

def fetch_league_data(gameweek):
    params = {
        'leagueId': LEAGUE_ID,
        'entry': ENTRY_ID,
        'includeStats': 1,
        'currentweek': gameweek
    }
    headers = {
        'FunctionKey': FUNCTION_KEY,
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0'
    }
    try:
        response = requests.get(API_BASE_URL, headers=headers, params=params, timeout=15)
        if response.status_code == 200:
            data = response.json()
            if data.get("Succeeded"):
                return data
        print(f"[!] Error fetching GW {gameweek}: HTTP {response.status_code}")
    except Exception as e:
        print(f"[!] Request failed for GW {gameweek}: {e}")
    return None

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    fpl_data_dir = os.path.join(script_dir, "fpl_data")
    master_file = os.path.join(fpl_data_dir, "master_standings.csv")

    print("[*] Starting historical backfill of Team Value and Bank data...")
    print(f"[*] Data directory: {fpl_data_dir}")

    # We will build a list of all master standings entries that we will overwrite at the end
    master_rows = []

    # Let's write the header for master standings
    master_headers = [
        "Gameweek", "Rank", "Team Name", "Manager Name", "GW Points", 
        "GW Hits", "GW Net Points", "Overall Points", "Overall Rank", "Chip Played", "Transfers Made",
        "Team Value", "Bank"
    ]

    for gw in range(1, 39):
        print(f"[*] Processing GW {gw}/38...", end="", flush=True)
        data = fetch_league_data(gw)
        if not data:
            print(" FAILED")
            continue

        team_datas = data.get("TeamDatas", [])
        if not team_datas:
            print(" NO DATA")
            continue

        # Map managers to team/bank values
        # We match by manager name (PlayerName in API)
        value_map = {}
        for team in team_datas:
            mgr = team.get("PlayerName", "").strip()
            value_map[mgr] = {
                "TeamValue": team.get("TeamValue", 0.0),
                "BankValue": team.get("BankValue", 0.0)
            }

        # Let's read the current standings.csv for this gameweek
        gw_dir = os.path.join(fpl_data_dir, f"gw{gw}")
        csv_file = os.path.join(gw_dir, "standings.csv")
        if not os.path.exists(csv_file):
            print(" CSV NOT FOUND")
            continue

        # Read rows
        rows = []
        with open(csv_file, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            for r in reader:
                rows.append(r)

        # Update headers and write back to standings.csv
        out_headers = [h for h in headers if h not in ("Team Value", "Bank")] + ["Team Value", "Bank"]

        # Sort teams by their total rank/points to maintain the correct rank
        updated_rows = []
        for r in rows:
            mgr = r.get("Manager Name", "").strip()
            vals = value_map.get(mgr, {"TeamValue": 0.0, "BankValue": 0.0})
            r["Team Value"] = vals["TeamValue"]
            r["Bank"] = vals["BankValue"]
            updated_rows.append(r)

        with open(csv_file, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=out_headers)
            writer.writeheader()
            for r in updated_rows:
                writer.writerow(r)

        # Add to master rows
        for r in updated_rows:
            master_rows.append([
                gw,
                r["Rank"],
                r["Team Name"],
                r["Manager Name"],
                r["GW Points"],
                r["GW Hits"],
                r["GW Net Points"],
                r["Overall Points"],
                r["Overall Rank"],
                r["Chip Played"],
                r["Transfers Made"],
                r["Team Value"],
                r["Bank"]
            ])

        print(" SUCCESS")
        time.sleep(0.1)

    # Write master standings file
    if master_rows:
        with open(master_file, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(master_headers)
            writer.writerows(master_rows)
        print(f"[+] Master standings successfully written to: {master_file}")
    else:
        print("[!] No master standings rows accumulated.")

if __name__ == "__main__":
    main()

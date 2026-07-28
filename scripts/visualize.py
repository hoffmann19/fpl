#!/usr/bin/env python3
import os
import csv
import json
import http.server
import socketserver
import webbrowser
import threading
import time

PORT = 8000

def get_color_palette():
    return [
        "#ff4757", "#2ed573", "#1e90ff", "#ffa502", "#ff47ff",
        "#3742fa", "#20bf6b", "#00d2d3", "#a55eea", "#ff7f50",
        "#eccc68", "#ff9f1a", "#10ac84"
    ]

def compile_data():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir) if os.path.basename(script_dir) == "scripts" else script_dir
    fpl_data_dir = os.path.join(project_dir, "fpl_data")
    
    standings_csv = os.path.join(fpl_data_dir, "master_standings.csv")
    lineups_csv = os.path.join(fpl_data_dir, "master_lineups.csv")
    output_json = os.path.join(project_dir, "visualizer_data.json")

    print("Processing FPL data CSVs...")
    if not os.path.exists(standings_csv) or not os.path.exists(lineups_csv):
        return False

    gameweeks = {}
    managers_meta = {}
    manager_list = set()

    with open(standings_csv, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            gw = int(row['Gameweek'])
            manager = row['Manager Name'].strip()
            team = row['Team Name'].strip()
            manager_list.add(manager)

            if manager not in managers_meta:
                managers_meta[manager] = {"team": team, "color": ""}

            if gw not in gameweeks:
                gameweeks[gw] = {"standings": [], "lineups": {}}

            gameweeks[gw]["standings"].append({
                "manager": manager,
                "team": team,
                "rank": int(row['Rank']),
                "gw_points": int(row['GW Points']),
                "gw_hits": int(row['GW Hits']),
                "gw_net_points": int(row['GW Net Points']),
                "overall_points": int(row['Overall Points']),
                "overall_rank": int(row['Overall Rank']),
                "chip": row['Chip Played'].strip(),
                "transfers": int(row['Transfers Made']),
                "team_value": float(row.get('Team Value')) if row.get('Team Value') else 0.0,
                "bank": float(row.get('Bank')) if row.get('Bank') else 0.0,
                "captain": "",
                "captain_points": 0,
                "transfers_in": [],
                "transfers_out": []
            })

    sorted_managers = sorted(list(manager_list))
    palette = get_color_palette()
    for idx, mgr in enumerate(sorted_managers):
        managers_meta[mgr]["color"] = palette[idx % len(palette)]

    squads = {}
    with open(lineups_csv, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            gw = int(row['Gameweek'])
            manager = row['Manager Name'].strip()
            player_name = row['Player Name'].strip()

            if gw not in gameweeks:
                gameweeks[gw] = {"standings": [], "lineups": {}}

            if manager not in gameweeks[gw]["lineups"]:
                gameweeks[gw]["lineups"][manager] = []

            gameweeks[gw]["lineups"][manager].append({
                "name": player_name,
                "club": row['Club'].strip(),
                "position": row['Position'].strip(),
                "points": int(row['Points']) if row['Points'] else 0,
                "captain": row['Captain'].strip().lower() == 'true',
                "vice_captain": row['Vice Captain'].strip().lower() == 'true',
                "starting": row['Is Starting'].strip().lower() == 'true',
                "sub_in": row['Subbed In'].strip().lower() == 'true',
                "sub_out": row['Subbed Out'].strip().lower() == 'true'
            })

            if manager not in squads:
                squads[manager] = {}
            if gw not in squads[manager]:
                squads[manager][gw] = set()
            squads[manager][gw].add(player_name)

    sorted_gws = sorted(gameweeks.keys())

    for gw in sorted_gws:
        prev_gw = gw - 1
        for standing in gameweeks[gw]["standings"]:
            manager = standing["manager"]
            lineup = gameweeks[gw]["lineups"].get(manager, [])

            captain_rec = next((p for p in lineup if p["captain"]), None)
            standing["captain"] = captain_rec["name"] if captain_rec else ""
            standing["captain_points"] = captain_rec["points"] if captain_rec else 0

            if manager in squads and prev_gw in squads.get(manager, {}):
                curr_squad = squads[manager].get(gw, set())
                prev_squad = squads[manager].get(prev_gw, set())
                standing["transfers_in"] = sorted(list(curr_squad - prev_squad))
                standing["transfers_out"] = sorted(list(prev_squad - curr_squad))
            else:
                standing["transfers_in"] = []
                standing["transfers_out"] = []

    json_data = {
        "managers": managers_meta,
        "gameweeks": {str(k): v for k, v in sorted(gameweeks.items())}
    }

    with open(output_json, 'w', encoding='utf-8') as f_json:
        json.dump(json_data, f_json, indent=2)

    print(f"Data compilation successful! Saved to {output_json}")
    return True

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        pass

def start_server():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir) if os.path.basename(script_dir) == "scripts" else script_dir
    os.chdir(project_dir)
    handler = CustomHTTPRequestHandler

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Server successfully started at http://localhost:{PORT}/")

        def open_browser():
            time.sleep(0.8)
            webbrowser.open(f"http://localhost:{PORT}/")

        threading.Thread(target=open_browser, daemon=True).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    if compile_data():
        start_server()

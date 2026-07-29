import json
import csv
import os

def main():
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    fpl_data_dir = os.path.join(project_dir, "fpl_data")
    json_path = os.path.join(project_dir, "visualizer_data.json")
    
    standings_csv = os.path.join(fpl_data_dir, "master_standings.csv")
    lineups_csv = os.path.join(fpl_data_dir, "master_lineups.csv")
    
    if not os.path.exists(json_path):
        print(f"Error: {json_path} does not exist!")
        return
        
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    gameweeks = data.get("gameweeks", {})
    
    standings_headers = [
        "Gameweek", "Rank", "Team Name", "Manager Name", "GW Points", 
        "GW Hits", "GW Net Points", "Overall Points", "Overall Rank", "Chip Played", "Transfers Made",
        "Team Value", "Bank"
    ]
    lineups_headers = [
        "Gameweek", "Manager Name", "Team Name", "Player Name", "Club", "Position", 
        "Points", "Captain", "Vice Captain", "Is Starting", "Subbed In", "Subbed Out"
    ]
    
    with open(standings_csv, mode='w', newline='', encoding='utf-8') as fs, \
         open(lineups_csv, mode='w', newline='', encoding='utf-8') as fl:
         
         ws = csv.writer(fs)
         wl = csv.writer(fl)
         
         ws.writerow(standings_headers)
         wl.writerow(lineups_headers)
         
         for gw_str in sorted(gameweeks.keys(), key=int):
             gw = int(gw_str)
             gw_data = gameweeks[gw_str]
             
             # Process Standings
             for s in gw_data.get("standings", []):
                 ws.writerow([
                     gw,
                     s.get("rank"),
                     s.get("team"),
                     s.get("manager"),
                     s.get("gw_points"),
                     s.get("gw_hits"),
                     s.get("gw_net_points"),
                     s.get("overall_points"),
                     s.get("overall_rank"),
                     s.get("chip"),
                     s.get("transfers"),
                     s.get("team_value"),
                     s.get("bank")
                 ])
                 
             # Process Lineups
             lineups = gw_data.get("lineups", {})
             for manager, players in lineups.items():
                 # find team name from managers metadata or standings
                 mgr_meta = data.get("managers", {}).get(manager, {})
                 team_name = mgr_meta.get("team", "")
                 
                 for p in players:
                     wl.writerow([
                         gw,
                         manager,
                         team_name,
                         p.get("name"),
                         p.get("club"),
                         p.get("position"),
                         p.get("points"),
                         p.get("captain"),
                         p.get("vice_captain"),
                         p.get("starting"),
                         p.get("sub_in"),
                         p.get("sub_out")
                     ])
                     
    print("CSV files successfully rebuilt from visualizer_data.json!")

if __name__ == "__main__":
    main()

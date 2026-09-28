import json
import os

def backfill_season(filepath):
    if not os.path.exists(filepath):
        print(f"[!] File not found: {filepath}")
        return

    print(f"[*] Backfilling transfers in {filepath}...")
    with open(filepath, "r") as f:
        data = json.load(f)

    gameweeks = data.get("gameweeks", {})
    sorted_gw_nums = sorted([int(k) for k in gameweeks.keys()])

    for gw_num in sorted_gw_nums:
        gw_key = str(gw_num)
        gw_data = gameweeks[gw_key]
        standings = gw_data.get("standings", [])
        lineups = gw_data.get("lineups", {})
        
        # Build player-to-points map for this GW across all lineups
        player_points_map = {}
        player_info_map = {}
        for mgr, l_players in lineups.items():
            for p in l_players:
                p_name = p.get("name")
                if p_name:
                    player_points_map[p_name] = p.get("points", 0)
                    player_info_map[p_name] = {
                        "club": p.get("club", ""),
                        "position": p.get("position", "")
                    }

        prev_gw_key = str(gw_num - 1)
        prev_lineups = gameweeks.get(prev_gw_key, {}).get("lineups", {}) if gw_num > 1 else {}

        for standing in standings:
            mgr_name = standing.get("manager")
            curr_lineup = lineups.get(mgr_name, [])
            prev_lineup = prev_lineups.get(mgr_name, []) if gw_num > 1 else []

            # If standing already has transfers_detail populated, keep it
            if standing.get("transfers_detail"):
                continue

            if gw_num == 1 or not prev_lineup or not curr_lineup:
                standing["transfers_in"] = standing.get("transfers_in", [])
                standing["transfers_out"] = standing.get("transfers_out", [])
                standing["transfers_detail"] = []
                continue

            curr_names = {p["name"]: p for p in curr_lineup}
            prev_names = {p["name"]: p for p in prev_lineup}

            ins = [p for name, p in curr_names.items() if name not in prev_names]
            outs = [p for name, p in prev_names.items() if name not in curr_names]

            standing["transfers_in"] = [p["name"] for p in ins]
            standing["transfers_out"] = [p["name"] for p in outs]
            
            transfers_detail = []
            max_len = max(len(ins), len(outs))
            for i in range(max_len):
                in_p = ins[i] if i < len(ins) else None
                out_p = outs[i] if i < len(outs) else None

                in_name = in_p["name"] if in_p else "-"
                out_name = out_p["name"] if out_p else "-"

                in_pts = in_p.get("points", 0) if in_p else 0
                out_pts = player_points_map.get(out_name, 0) if out_p else 0

                in_info = player_info_map.get(in_name, {})
                out_info = player_info_map.get(out_name, {})

                gws_since = max(1, sorted_gw_nums[-1] - gw_num + 1)
                in_ppg_since = round(in_pts / gws_since, 1)
                out_ppg_since = round(out_pts / gws_since, 1)

                transfers_detail.append({
                    "in_name": in_name,
                    "in_club": in_p.get("club", in_info.get("club", "")),
                    "in_pos": in_p.get("position", in_info.get("position", "")),
                    "in_cost": in_p.get("cost", 0.0),
                    "in_points": in_pts,
                    "in_points_since": in_pts,
                    "in_ppg": in_ppg_since,
                    "in_ppg_since": in_ppg_since,
                    "out_name": out_name,
                    "out_club": out_p.get("club", out_info.get("club", "")),
                    "out_pos": out_p.get("position", out_info.get("position", "")),
                    "out_cost": out_p.get("cost", 0.0),
                    "out_points": out_pts,
                    "out_points_since": out_pts,
                    "out_ppg": out_ppg_since,
                    "out_ppg_since": out_ppg_since,
                    "net_points": in_pts - out_pts,
                    "net_points_since": in_pts - out_pts,
                    "transfer_gw": gw_num,
                    "time": None
                })

            standing["transfers_detail"] = transfers_detail

    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

    print(f"[+] Successfully backfilled transfers in {filepath}!")

if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backfill_season(os.path.join(root, "visualizer_data_2025_26.json"))

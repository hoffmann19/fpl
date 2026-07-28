#!/usr/bin/env python3
import os
import csv
from collections import defaultdict

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir) if os.path.basename(script_dir) == "scripts" else script_dir
    csv_path = os.path.join(project_dir, "fpl_data/master_standings.csv")
    payouts_dir = os.path.join(project_dir, "payouts")
    os.makedirs(payouts_dir, exist_ok=True)
    
    report_lines = []
    def log(msg=""):
        print(msg)
        report_lines.append(msg)
    
    gw_records = defaultdict(list)
    player_keys = set()
    
    if not os.path.exists(csv_path):
        print(f"[!] master_standings.csv not found at {csv_path}")
        return

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            gw = int(row['Gameweek'])
            gw_pts = int(row['GW Points'])
            gw_net = int(row['GW Net Points'])
            overall_pts = int(row['Overall Points'])
            overall_rank = int(row['Overall Rank'])
            manager = row['Manager Name']
            team = row['Team Name']
            
            player_keys.add((manager, team))
            gw_records[gw].append({
                'manager': manager,
                'team': team,
                'gw_points': gw_pts,
                'gw_net_points': gw_net,
                'overall_points': overall_pts,
                'overall_rank': overall_rank
            })

    gw_winners = {}
    manager_gw_wins = defaultdict(float)
    manager_gw_wins_count = defaultdict(int)
    manager_gw_payout = defaultdict(float)
    
    total_gws = sorted(gw_records.keys())
    
    for gw in total_gws:
        players = gw_records[gw]
        max_pts = max(p['gw_points'] for p in players)
        winners = [p for p in players if p['gw_points'] == max_pts]
        num_winners = len(winners)
        payout_per_winner = 15.0 / num_winners
        
        gw_winners[gw] = {
            'points': max_pts,
            'winners': [(w['manager'], w['team']) for w in winners],
            'payout_per_winner': payout_per_winner
        }
        
        for w in winners:
            mgr = w['manager']
            manager_gw_wins[mgr] += 1.0 / num_winners
            manager_gw_wins_count[mgr] += 1
            manager_gw_payout[mgr] += payout_per_winner

    final_gw = max(total_gws)
    final_players = gw_records[final_gw]
    final_players_sorted = sorted(final_players, key=lambda x: x['overall_points'], reverse=True)
    
    season_payout_bracket = [320.0, 220.0, 120.0, 70.0]
    manager_season_payout = defaultdict(float)
    manager_season_rank = {}
    
    for idx, p in enumerate(final_players_sorted):
        mgr = p['manager']
        rank = idx + 1
        manager_season_rank[mgr] = rank
        if idx < len(season_payout_bracket):
            manager_season_payout[mgr] = season_payout_bracket[idx]
        else:
            manager_season_payout[mgr] = 0.0

    all_managers = sorted(list(set(mgr for mgr, _ in player_keys)))
    manager_team_map = {mgr: team for mgr, team in player_keys}
    
    manager_stats = []
    for mgr in all_managers:
        team = manager_team_map[mgr]
        gw_wins = manager_gw_wins[mgr]
        gw_win_count = manager_gw_wins_count[mgr]
        gw_pay = manager_gw_payout[mgr]
        season_pay = manager_season_payout[mgr]
        season_rank = manager_season_rank[mgr]
        final_pts = next(p['overall_points'] for p in final_players if p['manager'] == mgr)
        total_pay = gw_pay + season_pay
        
        manager_stats.append({
            'manager': mgr,
            'team': team,
            'gw_wins': gw_wins,
            'gw_win_count': gw_win_count,
            'gw_payout': gw_pay,
            'season_rank': season_rank,
            'final_points': final_pts,
            'season_payout': season_pay,
            'total_payout': total_pay
        })
        
    manager_stats_sorted = sorted(manager_stats, key=lambda x: (-x['total_payout'], x['season_rank']))

    payout_summary_txt = os.path.join(payouts_dir, "payout_summary.txt")
    with open(payout_summary_txt, mode='w', encoding='utf-8') as f_txt:
        f_txt.write("\n".join(report_lines) + "\n")

if __name__ == "__main__":
    main()

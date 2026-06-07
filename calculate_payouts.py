#!/usr/bin/env python3
import os
import csv
from collections import defaultdict

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, "fpl_data/master_standings.csv")
    payouts_dir = os.path.join(script_dir, "payouts")
    os.makedirs(payouts_dir, exist_ok=True)
    
    report_lines = []
    def log(msg=""):
        print(msg)
        report_lines.append(msg)
    
    # Store records by gameweek: gw_num -> list of player dicts
    gw_records = defaultdict(list)
    
    # Store players by manager name / team name to track totals
    # We will key by (Manager Name, Team Name) to be precise
    player_keys = set()
    
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

    # 1. Analyze gameweek wins (using gw_points)
    gw_winners = {}
    manager_gw_wins = defaultdict(float) # number of gameweeks won (fractional if tied)
    manager_gw_wins_count = defaultdict(int) # count of gameweeks where they got a share of the win
    manager_gw_payout = defaultdict(float) # payout from gameweek wins
    
    total_gws = sorted(gw_records.keys())
    
    for gw in total_gws:
        players = gw_records[gw]
        # Find maximum GW points
        max_pts = max(p['gw_points'] for p in players)
        # Find all players with maximum GW points
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

    # 2. Analyze end of season (GW 38) overall standings
    # Find overall rankings at GW 38
    final_gw = max(total_gws)
    final_players = gw_records[final_gw]
    
    # Sort final players by overall_points descending
    final_players_sorted = sorted(final_players, key=lambda x: x['overall_points'], reverse=True)
    
    # Season end payouts: 1st gets 320, 2nd gets 220, 3rd gets 120, 4th gets 70
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

    # Compile and print report
    log("=" * 80)
    log("FPL LEAGUE SUMMARY & PAYOUT REPORT")
    log("=" * 80)
    log(f"Total Gameweeks: {len(total_gws)}")
    log(f"Number of Managers: {len(player_keys)}")
    log("-" * 80)
    
    log("\n--- Gameweek Winners Breakdown ---")
    log(f"{'GW':<4} | {'Winning Points':<14} | {'Winners (Team - Manager)':<45} | {'Payout/Winner':<12}")
    log("-" * 80)
    for gw in total_gws:
        info = gw_winners[gw]
        winners_str = ", ".join([f"{team} ({mgr})" for mgr, team in info['winners']])
        log(f"{gw:<4} | {info['points']:<14} | {winners_str:<45} | ${info['payout_per_winner']:.2f}")
        
    log("-" * 80)
    
    log("\n--- End of Season Standing (GW 38) Payouts ---")
    log(f"{'Rank':<5} | {'Manager Name':<20} | {'Team Name':<25} | {'Final Points':<12} | {'Season Payout':<13}")
    log("-" * 80)
    for idx, p in enumerate(final_players_sorted):
        payout = manager_season_payout[p['manager']]
        payout_str = f"${payout:.2f}" if payout > 0 else "$0.00"
        log(f"{idx+1:<5} | {p['manager']:<20} | {p['team']:<25} | {p['overall_points']:<12} | {payout_str:<13}")
        
    log("-" * 80)

    # Calculate overall stats for each manager
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
        
    # Sort by total payout descending, then by season rank ascending
    manager_stats_sorted = sorted(manager_stats, key=lambda x: (-x['total_payout'], x['season_rank']))
    
    log("\n--- Final Payout & Stats Summary (Sorted by Total Payout) ---")
    log(f"{'Manager Name':<20} | {'Team Name':<25} | {'GW Wins (Share)':<15} | {'GW Payout':<11} | {'Final Rank':<10} | {'Season Payout':<13} | {'Total Payout':<12}")
    log("-" * 110)
    for s in manager_stats_sorted:
        gw_wins_str = f"{s['gw_wins']:.2f} ({s['gw_win_count']} times)" if s['gw_wins'] > 0 else "0.00"
        log(f"{s['manager']:<20} | {s['team']:<25} | {gw_wins_str:<15} | ${s['gw_payout']:<10.2f} | {s['season_rank']:<10} | ${s['season_payout']:<12.2f} | ${s['total_payout']:<11.2f}")
    log("=" * 110)

    # Save text report
    payout_summary_txt = os.path.join(payouts_dir, "payout_summary.txt")
    with open(payout_summary_txt, mode='w', encoding='utf-8') as f_txt:
        f_txt.write("\n".join(report_lines) + "\n")
        
    # Save Gameweek Winners Breakdown CSV
    gw_winners_csv = os.path.join(payouts_dir, "gameweek_winners.csv")
    with open(gw_winners_csv, mode='w', encoding='utf-8', newline='') as f_csv:
        writer = csv.writer(f_csv)
        writer.writerow(['Gameweek', 'Winning Points', 'Winners (Team - Manager)', 'Payout/Winner'])
        for gw in total_gws:
            info = gw_winners[gw]
            winners_str = ", ".join([f"{team} ({mgr})" for mgr, team in info['winners']])
            writer.writerow([gw, info['points'], winners_str, round(info['payout_per_winner'], 2)])
            
    # Save Season Payouts CSV
    season_payouts_csv = os.path.join(payouts_dir, "season_payouts.csv")
    with open(season_payouts_csv, mode='w', encoding='utf-8', newline='') as f_csv:
        writer = csv.writer(f_csv)
        writer.writerow(['Rank', 'Manager Name', 'Team Name', 'Final Points', 'Season Payout'])
        for idx, p in enumerate(final_players_sorted):
            payout = manager_season_payout[p['manager']]
            writer.writerow([idx + 1, p['manager'], p['team'], p['overall_points'], payout])
            
    # Save Final Payout & Stats Summary CSV
    final_summary_csv = os.path.join(payouts_dir, "final_payouts_summary.csv")
    with open(final_summary_csv, mode='w', encoding='utf-8', newline='') as f_csv:
        writer = csv.writer(f_csv)
        writer.writerow(['Manager Name', 'Team Name', 'GW Wins (Share)', 'GW Payout', 'Final Rank', 'Season Payout', 'Total Payout'])
        for s in manager_stats_sorted:
            gw_wins_str = f"{s['gw_wins']:.2f} ({s['gw_win_count']} times)" if s['gw_wins'] > 0 else "0.00"
            writer.writerow([s['manager'], s['team'], gw_wins_str, s['gw_payout'], s['season_rank'], s['season_payout'], s['total_payout']])
            
    print(f"\nPayout summaries successfully saved to directory: {payouts_dir}")

if __name__ == "__main__":
    main()

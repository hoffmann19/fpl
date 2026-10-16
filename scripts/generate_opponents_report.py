#!/usr/bin/env python3
"""
Generate a clean, comprehensive Markdown report and CSV file for squad fixtures
and opponent defensive / attacking records.
Supports generating for any manager in the mini-league (default: Arsene Wenger).
"""

import json
import csv
import sys
import argparse
from pathlib import Path

def generate_report_for_manager(data, mgr_name, root, write_default_squad=True):
    managers_dict = data.get("managers", {})
    if mgr_name not in managers_dict:
        # Fuzzy match
        for m in managers_dict:
            if mgr_name.lower() in m.lower():
                mgr_name = m
                break

    team_name = managers_dict.get(mgr_name, {}).get("team", mgr_name)

    # Determine active GW
    current_gw = data.get("current_gw") or 6
    start_gw = current_gw + 1
    next_5_gws = [g for g in range(start_gw, start_gw + 5) if g <= 38]

    # Squad lineup
    lineup = data.get("gameweeks", {}).get(str(current_gw), {}).get("lineups", {}).get(mgr_name, [])
    if not lineup:
        # Fallback to latest available played GW
        played_gws = [int(k) for k, v in data.get("gameweeks", {}).items() if v.get("standings")]
        for gw_idx in sorted(played_gws, reverse=True):
            lineup = data.get("gameweeks", {}).get(str(gw_idx), {}).get("lineups", {}).get(mgr_name, [])
            if lineup:
                break

    fixtures_fdr = data.get("team_fixtures_fdr", {})
    pl_data = data.get("premier_league_standings", {})
    team_records = pl_data.get("team_records_by_gw", {}).get(str(current_gw), {})
    if not team_records:
        team_records = pl_data.get("latest_records", {})

    pl_ranks = pl_data.get("ranks_by_gw", {}).get(str(current_gw), {})
    if not pl_ranks:
        pl_ranks = pl_data.get("latest_ranks", {})

    # Sort players: Starters first (GKP, DEF, MID, FWD), then Bench
    pos_order = {"GKP": 1, "DEF": 2, "MID": 3, "FWD": 4}
    lineup_sorted = sorted(
        lineup,
        key=lambda p: (
            0 if p.get("starting") else 1,
            pos_order.get(p.get("position"), 99),
            p.get("name")
        )
    )

    player_summaries = []
    csv_rows = []

    for p in lineup_sorted:
        p_name = p.get("name")
        club = p.get("club")
        pos = p.get("position")
        starting = "Starting XI" if p.get("starting") else "Bench"
        catalog = data.get("players", {}).get(p_name, {})
        cost = catalog.get("cost", p.get("cost", "-"))
        pts = catalog.get("total_points", p.get("points", 0))

        fixes = fixtures_fdr.get(club, {})
        fix_details = []
        sum_ga = 0
        sum_gf = 0
        sum_fdr = 0
        valid_count = 0

        for g in next_5_gws:
            f = fixes.get(str(g))
            if f:
                opp_short = f.get("opponent_short", "")
                venue = f.get("venue", "H")
                fdr = f.get("difficulty", 3)
                opp_rank = pl_ranks.get(opp_short, "-")
                rec = team_records.get(opp_short, {})

                ga = rec.get("goals_against", "-")
                ga_m = rec.get("ga_per_game", 1.0)
                gf = rec.get("goals_for", "-")
                gf_m = rec.get("gf_per_game", 1.0)
                def_r = rec.get("def_rank", "-")
                att_r = rec.get("att_rank", "-")
                def_tier = rec.get("def_tier", "average")
                att_tier = rec.get("att_tier", "average")

                if isinstance(ga_m, (int, float)):
                    sum_ga += ga_m
                    sum_gf += gf_m
                    sum_fdr += fdr
                    valid_count += 1

                fix_details.append({
                    "gw": g,
                    "opp_short": opp_short,
                    "venue": venue,
                    "fdr": fdr,
                    "pl_rank": opp_rank,
                    "ga": ga,
                    "ga_m": ga_m,
                    "gf": gf,
                    "gf_m": gf_m,
                    "def_rank": def_r,
                    "att_rank": att_r,
                    "def_tier": def_tier,
                    "att_tier": att_tier
                })

                csv_rows.append({
                    "Manager": mgr_name,
                    "Team": team_name,
                    "Player": p_name,
                    "Position": pos,
                    "Squad Status": starting,
                    "Club": club,
                    "Cost": cost,
                    "Points": pts,
                    "GW": g,
                    "Opponent": opp_short,
                    "Venue": venue,
                    "Opponent PL Rank": opp_rank,
                    "Opponent GA": ga,
                    "Opponent GA/match": ga_m,
                    "Opponent Def Rank": def_r,
                    "Opponent GF": gf,
                    "Opponent GF/match": gf_m,
                    "Opponent Att Rank": att_r,
                    "FPL Difficulty (FDR)": fdr,
                    "Defensive Matchup Tier": def_tier.capitalize()
                })
            else:
                fix_details.append({
                    "gw": g,
                    "blank": True
                })

        avg_ga = round(sum_ga / valid_count, 2) if valid_count else 0
        avg_gf = round(sum_gf / valid_count, 2) if valid_count else 0
        avg_fdr = round(sum_fdr / valid_count, 2) if valid_count else 0

        # Verdict
        if pos in ["MID", "FWD"]:
            if avg_ga >= 1.5:
                verdict = "🔥 Prime Goalscoring Targets (Leaky Defenses)"
            elif avg_ga <= 1.05:
                verdict = "⛔ Tough Fixtures (Resolute Defenses)"
            else:
                verdict = "⚖️ Moderate Goal Threat"
        else:
            if avg_gf <= 1.15:
                verdict = "🛡️ Excellent Clean Sheet Potential"
            elif avg_gf >= 1.6:
                verdict = "⚠️ High Conceding Risk"
            else:
                verdict = "⚖️ Moderate Clean Sheet Odds"

        player_summaries.append({
            "name": p_name,
            "club": club,
            "pos": pos,
            "status": starting,
            "cost": cost,
            "pts": pts,
            "fixtures": fix_details,
            "avg_ga": avg_ga,
            "avg_gf": avg_gf,
            "avg_fdr": avg_fdr,
            "verdict": verdict
        })

    # Prepare Markdown Report Content
    md_lines = []
    md_lines.append(f"# Squad Next 5 Opponents & Defensive Records Report")
    md_lines.append(f"**Manager**: {mgr_name} ({team_name})  ")
    md_lines.append(f"**Gameweeks Analyzed**: GW {next_5_gws[0]} – GW {next_5_gws[-1]} (Current: GW {current_gw})  ")
    md_lines.append(f"**Generated**: October 2026  \n")

    md_lines.append("---")
    md_lines.append("## 1. Key Tactical Takeaways\n")

    # Best attacker targets
    attackers = [p for p in player_summaries if p["pos"] in ["MID", "FWD"]]
    attackers_sorted = sorted(attackers, key=lambda p: p["avg_ga"], reverse=True)
    best_att = attackers_sorted[0] if attackers_sorted else None

    # Best clean sheet targets
    defenders = [p for p in player_summaries if p["pos"] in ["GKP", "DEF"]]
    defenders_sorted = sorted(defenders, key=lambda p: p["avg_gf"])
    best_def = defenders_sorted[0] if defenders_sorted else None

    if best_att:
        md_lines.append(f"- **Top Attacking Target Run**: **{best_att['name']}** ({best_att['club']}) faces opponents conceding an average of **{best_att['avg_ga']} GA/game** over the next 5 weeks.")
    if best_def:
        md_lines.append(f"- **Top Clean Sheet Potential**: **{best_def['name']}** ({best_def['club']}) faces opponents scoring only **{best_def['avg_gf']} GF/game** over the next 5 weeks.")

    # Manager-specific callouts
    if "Haaland" in [p["name"] for p in player_summaries]:
        haaland_p = next(p for p in player_summaries if p["name"] == "Haaland")
        md_lines.append(f"- **Erling Haaland Capitalization**: Faces **Ipswich (H)** in GW 7 (Def #18, 11 GA conceded), followed by **Aston Villa (A)** (Def #15, 9 GA) and **Fulham (H)** in GW 11. Average opponent GA faced is **{haaland_p['avg_ga']} GA/game** — absolute captaincy priority!")

    if any(p["club"] == "CHE" for p in player_summaries):
        che_players = [p["name"] for p in player_summaries if p["club"] == "CHE"]
        md_lines.append(f"- **Chelsea Assets ({', '.join(che_players)})**: Matchups feature Tottenham (H), Man Utd (H), and Sunderland (A), facing defenses with a solid 1.28 GA/game average.")

    if any(p["club"] == "ARS" for p in player_summaries):
        ars_players = [p["name"] for p in player_summaries if p["club"] == "ARS"]
        md_lines.append(f"- **Arsenal Core ({', '.join(ars_players)})**: Facing tough defensive outfits (Everton #2, Liverpool #5, Hull #6) with an average of 1.0 GA/game. However, clean sheet prospects remain strong with opponents scoring only 1.28 GF/game.")

    md_lines.append(f"- **Chelsea Defensive Leak**: Chelsea has conceded **12 goals in 5 games (2.4/match)**, ranking **#20 (dead last)** defensively in the Premier League. Target any player facing CHE (e.g. Mbeumo in GW 9).")
    md_lines.append(f"- **Weakest Attacks for Clean Sheets**: Coventry (1 GF), Tottenham (2 GF), Aston Villa (4 GF), and Nottingham Forest (4 GF) offer prime clean sheet matchups.\n")

    md_lines.append("---")
    md_lines.append("## 2. Squad Next 5 Fixtures & Opponent Breakdown\n")
    md_lines.append("> Shows opponent defensive ranking (Def # / Goals Conceded) and goals scored ranking (Att # / Goals Scored) for every upcoming match.\n")
    md_lines.append("| Player | Pos | Club | Status | " + " | ".join([f"GW {g}" for g in next_5_gws]) + " | Opp GA/m (Def) | Opp GF/m (Att) | Avg FDR | Matchup Outlook |")
    md_lines.append("|:---|:---:|:---:|:---:| " + " | ".join([":---:" for _ in next_5_gws]) + " |:---:|:---:|:---:|:---|")

    for p in player_summaries:
        fix_cols = []
        for f in p["fixtures"]:
            if f.get("blank"):
                fix_cols.append("BLANK")
            else:
                opp = f["opp_short"]
                ven = f["venue"]
                def_r = f["def_rank"]
                ga = f["ga"]
                att_r = f["att_rank"]
                gf = f["gf"]
                fdr = f["fdr"]
                fix_cols.append(f"**{opp}** ({ven})<br><small>Def #{def_r} ({ga} GA)<br>Att #{att_r} ({gf} GF) · FDR {fdr}</small>")

        md_lines.append(
            f"| **{p['name']}** | {p['pos']} | {p['club']} | {p['status']} | "
            + " | ".join(fix_cols)
            + f" | **{p['avg_ga']}** | **{p['avg_gf']}** | {p['avg_fdr']} | {p['verdict']} |"
        )

    md_lines.append("\n---")
    md_lines.append("## 3. Attackers Ranked by Opponent Defensive Leakiness\n")
    md_lines.append("> Attackers facing high Goals Against (GA) opponents have the highest scoring potential.\n")
    md_lines.append("| Player | Club | Pos | Avg Opp GA/game | Avg Opp FDR | Next 5 Opponents & Def Ranks | Strategy |")
    md_lines.append("|:---|:---:|:---:|:---:|:---:|:---|:---|")

    for p in attackers_sorted:
        opps = []
        for f in p["fixtures"]:
            if not f.get("blank"):
                tier_emoji = "🟢" if f["def_tier"] == "leaky" else ("🔴" if f["def_tier"] == "solid" else "⚪")
                opps.append(f"{tier_emoji} {f['opp_short']} ({f['venue']}, Def #{f['def_rank']}, {f['ga']} GA)")
        opps_str = "<br>".join(opps)
        md_lines.append(
            f"| **{p['name']}** | {p['club']} | {p['pos']} | **{p['avg_ga']}** | {p['avg_fdr']} | {opps_str} | {p['verdict']} |"
        )

    md_lines.append("\n---")
    md_lines.append("## 4. Defenders & Goalkeepers Ranked by Clean Sheet Potential\n")
    md_lines.append("> Defenders facing low Goals For (GF) opponents have the highest clean sheet probability.\n")
    md_lines.append("| Player | Club | Pos | Avg Opp GF/game | Avg Opp FDR | Next 5 Opponents & Att Ranks | Clean Sheet Outlook |")
    md_lines.append("|:---|:---:|:---:|:---:|:---:|:---|:---|")

    for p in defenders_sorted:
        opps = []
        for f in p["fixtures"]:
            if not f.get("blank"):
                tier_emoji = "🟢" if f["att_tier"] == "weak" else ("🔴" if f["att_tier"] == "potent" else "⚪")
                opps.append(f"{tier_emoji} {f['opp_short']} ({f['venue']}, Att #{f['att_rank']}, {f['gf']} GF)")
        opps_str = "<br>".join(opps)
        md_lines.append(
            f"| **{p['name']}** | {p['club']} | {p['pos']} | **{p['avg_gf']}** | {p['avg_fdr']} | {opps_str} | {p['verdict']} |"
        )

    md_lines.append("\n---")
    # Section 5: Suggested Trades & Tactical Move Recommendations
    md_lines.append("## 5. Suggested Trades & Tactical Move Recommendations\n")
    md_lines.append(f"Based on upcoming fixture difficulty (GW {next_5_gws[0]}–{next_5_gws[-1]}), opponent defensive resilience, player form, and squad roles, here are the highest-value trades and lineup adjustments for **{mgr_name}**:\n")

    md_lines.append("### 🎯 Key Trade Priorities\n")
    
    if "Arsene" in mgr_name:
        md_lines.append("1. **Trade Out Martin Ødegaard (£6.8m, MID) ➡️ Trade In Antoine Semenyo (£8.3m, MID) or Rayan Cherki (£7.8m, MID)**")
        md_lines.append("   - **Sell Reason**: Ødegaard has gone cold (1.5 form, 30 total points) and Arsenal faces a gauntlet of top defenses (Everton #2, Liverpool #5, Hull #6). His opponents concede a stingy 1.0 GA/match (worst in the squad).")
        md_lines.append("   - **Buy Reason**: Manchester City has the easiest schedule in the entire Premier League over the next 5 gameweeks (Avg FDR 2.6): **Ipswich (H)**, **Aston Villa (A)**, **Brighton (H)**, **Forest (A)**, and **Fulham (H)**. Semenyo is averaging 7.7 form with 36 points; Cherki has 44 points (6.3 form). Stacking a City midfielder with Erling Haaland doubles down on City's goal hauls against leaky defenses like Ipswich (11 GA).\n")

        md_lines.append("2. **Replace Inactive Cole Palmer (£4.0m, MID) ➡️ Trade In Sandro Tonali (£5.3m, MID) or Alex Iwobi (£5.4m, MID)**")
        md_lines.append("   - **Sell Reason**: Palmer has recorded 0 minutes / 0 points, taking up an inactive spot in the squad.")
        md_lines.append("   - **Buy Reason**: Tottenham has the #1 easiest fixture schedule across the next 5 weeks (Avg FDR 2.6): Coventry (H), Palace (H), and Ipswich (H). Tonali provides guaranteed minutes and 4.5 form. Alternatively, Fulham's Iwobi (4.5 form) faces Hull and Coventry over his next two.\n")

        md_lines.append("3. **Rotate Goalkeepers for GW 8 & 9 (Verbruggen ➡️ Kinsky)**")
        md_lines.append("   - **Tactical Alert**: Brighton's Bart Verbruggen faces consecutive away trips to **Liverpool (A, FDR 4)** in GW 8 and **Man City (A, FDR 5)** in GW 9.")
        md_lines.append("   - **Bench Solution**: Wenger already owns **Kinsky (TOT, £4.5m)**! Start Kinsky in GW 8 & 9 when Spurs play at home against Chelsea and Crystal Palace to avoid Verbruggen's brutal away fixtures.\n")

        md_lines.append("4. **Promote Josko Gvardiol (£5.8m, DEF) into the Starting XI**")
        md_lines.append("   - **Lineup Optimization**: Gvardiol is currently sitting on Wenger's **bench**, yet has 41 points and a stellar 6.3 form. Man City hosts Ipswich in GW 7 (prime clean sheet odds). Gvardiol should start immediately over Konsa or Calafiori when Arsenal plays Liverpool away in GW 9.\n")

        md_lines.append("5. **Forward Upgrade: Barry (£5.7m, FWD) ➡️ Brian Brobbey (£5.7m, FWD)**")
        md_lines.append("   - **Sell Reason**: Barry faces Arsenal (A, FDR 5) and Brentford (A) with an average FDR of 3.4.")
        md_lines.append("   - **Buy Reason**: Brobbey is on a scorching **8.5 form** (24 pts) at the exact same price (£5.7m), facing opponents conceding an average of 1.68 GA/match.\n")

        md_lines.append("### 📋 Recommended Transfer Targets Table\n")
        md_lines.append("| Priority | Transfer Type | Player OUT | Club | Pos | Price | Form | Player IN | Club | Pos | Price | Form | Next 5 Avg FDR | Trade Rationale |")
        md_lines.append("|:---:|:---:|:---|:---:|:---:|:---:|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---|")
        md_lines.append("| 🚨 **High** | Midfield Upgrade | **Ødegaard** | ARS | MID | £6.8m | 1.5 | **Semenyo** / **Cherki** | MCI | MID | £8.3m / £7.8m | 7.7 / 6.3 | **2.6** | Move away from Arsenal's tough defensive run into City's dream schedule (Ipswich H, Villa A, Fulham H). Stack with Haaland. |")
        md_lines.append("| 🚨 **High** | Active Starter | **Palmer** | CHE | MID | £4.0m | 0.0 | **Tonali** / **Iwobi** | TOT / FUL | MID | £5.3m / £5.4m | 4.5 / 4.5 | **2.6 / 3.0** | Replace inactive asset with in-form midfielder facing leaky defenses (Coventry, Palace, Ipswich). |")
        md_lines.append("| ⚡ **Medium** | Goalkeeper Swap | **Verbruggen** | BHA | GKP | £4.5m | 7.7 | **Kinsky** *(Internal)* | TOT | GKP | £4.5m | 2.5 | **2.6** | Bench Verbruggen for GW 8-9 away at Liverpool & Man City; start Kinsky at home for Spurs. |")
        md_lines.append("| ⚡ **Medium** | Lineup Promotion | **Konsa** | ARS | DEF | £4.6m | 2.5 | **Gvardiol** *(Internal)* | MCI | DEF | £5.8m | 6.3 | **2.6** | Promote Gvardiol from bench into Starting XI for Ipswich (H) in GW 7 and Liverpool (A) in GW 9. |")
        md_lines.append("| 💡 **Budget** | Forward Trade | **Barry** | EVE | FWD | £5.7m | 6.0 | **Brobbey** | SUN | FWD | £5.7m | 8.5 | **3.0** | Same price like-for-like swap into one of the hottest forwards in the league (8.5 form). |")
    else:
        toughest_players = sorted(player_summaries, key=lambda p: (p['avg_fdr'], -p['avg_ga']), reverse=True)[:3]
        md_lines.append("1. **Sell High-Difficulty Assets**:")
        for tp in toughest_players:
            md_lines.append(f"   - **{tp['name']}** ({tp['club']}, {tp['pos']}): Facing avg FDR {tp['avg_fdr']} against tough defensive units.")
        md_lines.append("\n2. **Target Easiest Fixture Runs**:")
        md_lines.append("   - Look to target clubs with lowest upcoming FDR (Tottenham 2.6, Man City 2.6, Coventry 2.6).")

    md_lines.append("\n---")
    md_lines.append(f"## 6. Premier League 20-Team Defensive & Attacking Records (Through GW {current_gw})\n")
    md_lines.append("| Def Rank | Team | Played | GA | GA/match | Defensive Tier | Att Rank | GF | GF/match | Attacking Tier | Table Rank | Points |")
    md_lines.append("|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|")

    teams_sorted_def = sorted(team_records.values(), key=lambda t: (t.get("ga_per_game", 99), t.get("goals_against", 99)))
    for t in teams_sorted_def:
        def_tag = "🟢 Solid Defense" if t["def_tier"] == "solid" else ("🔴 Leaky Defense" if t["def_tier"] == "leaky" else "⚪ Average")
        att_tag = "🔥 Strong Attack" if t["att_tier"] == "potent" else ("🧊 Weak Attack" if t["att_tier"] == "weak" else "⚪ Average")
        md_lines.append(
            f"| **#{t['def_rank']}** | **{t['team_name']}** ({t['team_short']}) | {t['played']} | "
            f"**{t['goals_against']}** | **{t['ga_per_game']}** | {def_tag} | "
            f"#{t['att_rank']} | {t['goals_for']} | {t['gf_per_game']} | {att_tag} | "
            f"#{t['table_rank']} | {t['points']} |"
        )

    report_content = "\n".join(md_lines) + "\n"

    # Determine output file paths
    safe_slug = mgr_name.lower().replace(" ", "_")
    named_md_path = root / "reports" / f"{safe_slug}_opponents_analysis.md"
    named_csv_path = root / "reports" / f"{safe_slug}_next_5_opponents.csv"

    # Write named reports
    with open(named_md_path, "w", encoding="utf-8") as f:
        f.write(report_content)

    csv_fieldnames = [
        "Manager", "Team", "Player", "Position", "Squad Status", "Club", "Cost", "Points",
        "GW", "Opponent", "Venue", "Opponent PL Rank", "Opponent GA", "Opponent GA/match",
        "Opponent Def Rank", "Opponent GF", "Opponent GF/match", "Opponent Att Rank",
        "FPL Difficulty (FDR)", "Defensive Matchup Tier"
    ]
    with open(named_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fieldnames)
        writer.writeheader()
        writer.writerows(csv_rows)

    print(f"[+] Generated for {mgr_name}:")
    print(f"    - {named_md_path}")
    print(f"    - {named_csv_path}")

    # Also overwrite the primary squad reports if requested
    if write_default_squad:
        default_md_path = root / "reports" / "squad_opponents_analysis.md"
        default_csv_path = root / "reports" / "squad_next_5_opponents.csv"
        with open(default_md_path, "w", encoding="utf-8") as f:
            f.write(report_content)
        with open(default_csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=csv_fieldnames)
            writer.writeheader()
            writer.writerows(csv_rows)
        print(f"    - Updated primary: {default_md_path}")

def main():
    parser = argparse.ArgumentParser(description="Generate squad next 5 opponents and defensive analysis reports.")
    parser.add_argument("--manager", "-m", type=str, default="Arsene Wenger", help="Manager name to analyze (default: Arsene Wenger)")
    parser.add_argument("--all", action="store_true", help="Generate reports for all managers in the league")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    data_path = root / "visualizer_data.json"
    if not data_path.exists():
        data_path = root / "visualizer_data_2026_27.json"

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if args.all:
        for mgr in data.get("managers", {}):
            generate_report_for_manager(data, mgr, root, write_default_squad=(mgr == args.manager))
    else:
        generate_report_for_manager(data, args.manager, root, write_default_squad=True)

if __name__ == "__main__":
    main()

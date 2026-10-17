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

def build_suggested_lineup_section(data, mgr_name, current_gw, next_gw, lineup, fixtures_fdr, team_records, pl_ranks, player_summaries):
    lines = []
    lines.append(f"## 1. Suggested Starting Lineup & Captaincy (Gameweek {next_gw})\n")

    if "Arsene" in mgr_name:
        cov_rec = team_records.get("COV", {})
        ips_rec = team_records.get("IPS", {})
        cry_rec = team_records.get("CRY", {})
        che_rec = team_records.get("CHE", {})
        avl_rec = team_records.get("AVL", {})
        nfo_rec = team_records.get("NFO", {})
        eve_rec = team_records.get("EVE", {})
        lee_rec = team_records.get("LEE", {})

        lines.append(f"> **Optimal Formation**: **3-4-3**  \n> **Primary Gameplan**: Capitalize on leaky defenses like Ipswich (#{ips_rec.get('def_rank', 15)}, {ips_rec.get('goals_against', 12)} GA) and Chelsea (#{che_rec.get('def_rank', 18)}, {che_rec.get('goals_against', 13)} GA), while targeting weak attacks like Coventry (#{cov_rec.get('att_rank', 18)}, {cov_rec.get('goals_for', 5)} GF) and Forest (#{nfo_rec.get('att_rank', 19)}, {nfo_rec.get('goals_for', 5)} GF) for clean sheets.\n")

        lines.append("### 👑 Captain & Vice-Captain Picks\n")
        lines.append(f"- 👑 **Captain (C)**: **Erling Haaland** (FWD, MCI) vs **IPS** (H)  \n  *Rationale*: Ipswich has conceded {ips_rec.get('goals_against', 12)} goals in 6 matches (Def #{ips_rec.get('def_rank', 15)}). Man City at the Etihad is the highest goal-expectancy fixture of Gameweek 7. Unmatched explosive ceiling.")
        lines.append(f"- 🥈 **Vice-Captain (VC)**: **Pascal Groß** (MID, BHA) vs **CRY** (H)  \n  *Rationale*: Brighton boasts the #1 attack in the league (18 GF) and hosts Crystal Palace's leaky defense (Def #{cry_rec.get('def_rank', 16)}, {cry_rec.get('goals_against', 12)} GA). Groß takes set pieces/penalties and leads the squad in points (53 pts). *(Alternative VC: Cole Palmer)*.\n")

        lines.append(f"### 📋 Suggested Starting XI (GW {next_gw})\n")
        lines.append("| Pos | Player | Club | GW 7 Matchup | Opponent Def Rank | Opponent Att Rank | FDR | Role & Tactical Reason |")
        lines.append("|:---:|:---|:---:|:---|:---:|:---:|:---:|:---|")
        lines.append(f"| **GKP** | **Kinsky** | TOT | **COV** (H) | Def #{cov_rec.get('def_rank', 13)} ({cov_rec.get('goals_against', 11)} GA) | **Att #{cov_rec.get('att_rank', 18)} ({cov_rec.get('goals_for', 5)} GF)** | 2 | 🛡️ **Top Clean Sheet Target**: Coventry averages only {cov_rec.get('gf_per_game', 0.83)} goals/match (Att #{cov_rec.get('att_rank', 18)}, 5 GF in 6 games). Spurs at home have highest clean sheet odds. |")
        lines.append(f"| **DEF** | **Josko Gvardiol** | MCI | **IPS** (H) | Def #{ips_rec.get('def_rank', 15)} ({ips_rec.get('goals_against', 12)} GA) | Att #{ips_rec.get('att_rank', 7)} ({ips_rec.get('goals_for', 9)} GF) | 2 | ⬆️ **Lineup Promotion**: Promoted from bench! City at home against newly promoted Ipswich with immense clean sheet & attacking upside. |")
        lines.append(f"| **DEF** | **Lewis Hall** | NEW | **AVL** (H) | Def #{avl_rec.get('def_rank', 14)} ({avl_rec.get('goals_against', 11)} GA) | **Att #{avl_rec.get('att_rank', 15)} ({avl_rec.get('goals_for', 6)} GF)** | 3 | 🛡️ **Defensive Anchor**: Aston Villa has scored only {avl_rec.get('goals_for', 6)} goals in 6 matches. Strong home defensive fixture at St. James' Park. |")
        lines.append(f"| **DEF** | **Riccardo Calafiori** | ARS | **NFO** (A) | Def #{nfo_rec.get('def_rank', 9)} ({nfo_rec.get('goals_against', 8)} GA) | **Att #{nfo_rec.get('att_rank', 19)} ({nfo_rec.get('goals_for', 5)} GF)** | 3 | 🛡️ **Solid Backline**: Nottingham Forest attack ranks #{nfo_rec.get('att_rank', 19)} with only {nfo_rec.get('goals_for', 5)} GF; Arsenal's defense (#2, 5 GA) is elite. |")
        lines.append(f"| **MID** | **Pascal Groß (VC)** | BHA | **CRY** (H) | **Def #{cry_rec.get('def_rank', 16)} ({cry_rec.get('goals_against', 12)} GA)** | Att #{cry_rec.get('att_rank', 8)} ({cry_rec.get('goals_for', 9)} GF) | 2 | 🔥 **Prime Creator**: Brighton #1 attack (18 GF) hosts leaky Palace backline (#{cry_rec.get('def_rank', 16)}). High assist and bonus point potential. |")
        lines.append(f"| **MID** | **Harvey Barnes** | NEW | **AVL** (H) | **Def #{avl_rec.get('def_rank', 14)} ({avl_rec.get('goals_against', 11)} GA)** | Att #{avl_rec.get('att_rank', 15)} ({avl_rec.get('goals_for', 6)} GF) | 3 | 🎯 **Home Threat**: Villa backline has conceded {avl_rec.get('goals_against', 11)} goals. Barnes provides direct goal threat from wide areas. |")
        lines.append(f"| **MID** | **Cole Palmer** | CHE | **EVE** (A) | Def #{eve_rec.get('def_rank', 4)} ({eve_rec.get('goals_against', 5)} GA) | Att #{eve_rec.get('att_rank', 10)} ({eve_rec.get('goals_for', 8)} GF) | 3 | 🎯 **Talisman / Penalties**: Chelsea's entire offense flows through Palmer; fixture-proof with elite set-piece and penalty upside. |")
        lines.append(f"| **MID** | **Bryan Mbeumo** | MUN | **LEE** (A) | Def #{lee_rec.get('def_rank', 5)} ({lee_rec.get('goals_against', 5)} GA) | Att #{lee_rec.get('att_rank', 11)} ({lee_rec.get('goals_for', 8)} GF) | 3 | 🎯 **Direct Threat**: Primary attacking focal point for Manchester United on counter-attacks and set pieces. |")
        lines.append(f"| **FWD** | **Erling Haaland (C)** | MCI | **IPS** (H) | **Def #{ips_rec.get('def_rank', 15)} ({ips_rec.get('goals_against', 12)} GA)** | Att #{ips_rec.get('att_rank', 7)} ({ips_rec.get('goals_for', 9)} GF) | 2 | 👑 **Captain**: Faces 15th-ranked defense ({ips_rec.get('goals_against', 12)} GA). Maximum goalscoring expectation. |")
        lines.append(f"| **FWD** | **Thierno Barry** | EVE | **CHE** (H) | **Def #{che_rec.get('def_rank', 18)} ({che_rec.get('goals_against', 13)} GA)** | Att #{che_rec.get('att_rank', 3)} ({che_rec.get('goals_for', 15)} GF) | 4 | ⬆️ **Lineup Promotion**: Promoted from bench! Chelsea has conceded {che_rec.get('goals_against', 13)} goals (Def #{che_rec.get('def_rank', 18)}). Prime matchup for a home striker. |")
        lines.append(f"| **FWD** | **João Pedro** | CHE | **EVE** (A) | Def #{eve_rec.get('def_rank', 4)} ({eve_rec.get('goals_against', 5)} GA) | Att #{eve_rec.get('att_rank', 10)} ({eve_rec.get('goals_for', 8)} GF) | 3 | 🎯 **Proven Finisher**: 45 points this season; spearheads Chelsea attack alongside Palmer. |")

        lines.append("\n### 🪑 Substitutes Bench (Priority Order)\n")
        lines.append("| Order | Pos | Player | Club | GW 7 Matchup | FDR | Bench Rationale |")
        lines.append("|:---:|:---:|:---|:---:|:---|:---:|:---|")
        lines.append(f"| **GK Sub** | GKP | **Bart Verbruggen** | BHA | **CRY** (H) | 2 | Excellent backup against Crystal Palace (Att #{cry_rec.get('att_rank', 8)}, {cry_rec.get('goals_for', 9)} GF); Kinsky preferred as Coventry averages only {cov_rec.get('gf_per_game', 0.83)} GF/m. |")
        lines.append(f"| **Sub 1** | MID | **Martin Ødegaard** | ARS | **NFO** (A) | 3 | Cold form (1.5) and facing tight Forest defense; first attacking substitute if any starter is rested. |")
        lines.append(f"| **Sub 2** | DEF | **Ezri Konsa** | ARS | **NFO** (A) | 3 | Defensive cover; benched to avoid Arsenal defensive double-up away from home. |")
        lines.append(f"| **Sub 3** | DEF | **Bobby Thomas** | COV | **TOT** (A) | 3 | Away at Tottenham Hotspur Stadium; lowest clean sheet probability among squad defenders. |")

        lines.append("\n### ⚡ Key Lineup Adjustments vs GW 6\n")
        lines.append(f"1. **Promote Josko Gvardiol into Starting Defense**: Gvardiol was on the bench in GW 6, but Man City hosting Ipswich (H, FDR 2, Def #{ips_rec.get('def_rank', 15)}) is the easiest defender fixture of the week.")
        lines.append(f"2. **Promote Thierno Barry into Starting Attack (Switch to 3-4-3)**: Chelsea’s defense ranks #{che_rec.get('def_rank', 18)} with {che_rec.get('goals_against', 13)} goals conceded. Starting Barry gives Wenger direct exposure to Chelsea's leaky backline.")
        lines.append(f"3. **Start Kinsky over Verbruggen in Goal**: While Verbruggen (CRY H) is a viable option, Kinsky's Spurs host Coventry, who rank #{cov_rec.get('att_rank', 18)} in attack with {cov_rec.get('goals_for', 5)} goals in 6 games ({cov_rec.get('gf_per_game', 0.83)}/match), compared to Palace's #{cry_rec.get('att_rank', 8)} attack ({cry_rec.get('goals_for', 9)} GF).")
        lines.append(f"4. **Bench Martin Ødegaard**: With Ødegaard registering 1.5 form and 0 goals in his last 4 appearances, benching him for in-form Barry (vs Chelsea #{che_rec.get('def_rank', 18)}) maximizes expected points.\n")
    else:
        # Algorithmic evaluator for any manager
        scored = []
        for p in lineup:
            club = p.get('club')
            pos = p.get('position')
            fix = fixtures_fdr.get(club, {}).get(str(next_gw), {})
            opp = fix.get('opponent_short', '')
            ven = fix.get('venue', 'H')
            fdr = fix.get('difficulty', 3)
            rec = team_records.get(opp, {})
            ga = rec.get('goals_against', 8)
            ga_m = rec.get('ga_per_game', 1.33)
            gf = rec.get('goals_for', 8)
            gf_m = rec.get('gf_per_game', 1.33)
            def_r = rec.get('def_rank', 10)
            att_r = rec.get('att_rank', 10)

            venue_bonus = 1.0 if ven == 'H' else 0.0
            fdr_penalty = (fdr - 2) * 1.5

            if pos in ['MID', 'FWD']:
                score = (ga_m * 3.5) + (def_r * 0.2) + venue_bonus - fdr_penalty
            else:
                score = (2.5 - gf_m) * 3.5 + (att_r * 0.2) + venue_bonus - fdr_penalty

            scored.append({
                'name': p.get('name'),
                'pos': pos,
                'club': club,
                'opp': opp,
                'ven': ven,
                'fdr': fdr,
                'ga': ga,
                'gf': gf,
                'def_r': def_r,
                'att_r': att_r,
                'score': round(score, 2),
                'prev_starting': p.get('starting', False)
            })

        gkps = sorted([p for p in scored if p['pos'] == 'GKP'], key=lambda x: x['score'], reverse=True)
        defs = sorted([p for p in scored if p['pos'] == 'DEF'], key=lambda x: x['score'], reverse=True)
        mids = sorted([p for p in scored if p['pos'] == 'MID'], key=lambda x: x['score'], reverse=True)
        fwds = sorted([p for p in scored if p['pos'] == 'FWD'], key=lambda x: x['score'], reverse=True)

        formations = [(3, 5, 2), (3, 4, 3), (4, 4, 2), (4, 3, 3), (4, 5, 1), (5, 3, 2), (5, 4, 1), (5, 2, 3)]
        best_score = -999
        best_form = "3-4-3"
        best_starters = []
        best_bench = []

        for d_cnt, m_cnt, f_cnt in formations:
            if d_cnt <= len(defs) and m_cnt <= len(mids) and f_cnt <= len(fwds):
                starters = [gkps[0]] + defs[:d_cnt] + mids[:m_cnt] + fwds[:f_cnt]
                tot = sum(s['score'] for s in starters)
                if tot > best_score:
                    best_score = tot
                    best_form = f"{d_cnt}-{m_cnt}-{f_cnt}"
                    best_starters = starters
                    outfield_bench = sorted(defs[d_cnt:] + mids[m_cnt:] + fwds[f_cnt:], key=lambda x: x['score'], reverse=True)
                    best_bench = [gkps[1] if len(gkps) > 1 else None] + outfield_bench
                    best_bench = [b for b in best_bench if b]

        c_pick = sorted([s for s in best_starters if s['pos'] in ['MID', 'FWD']], key=lambda x: x['score'], reverse=True)
        cap = c_pick[0] if c_pick else best_starters[0]
        vc = c_pick[1] if len(c_pick) > 1 else best_starters[1]

        lines.append(f"> **Optimal Formation**: **{best_form}**  \n> **Focus**: Aligning squad with lowest opponent difficulty and highest expected return matchups for GW {next_gw}.\n")
        lines.append("### 👑 Captain & Vice-Captain Picks\n")
        lines.append(f"- 👑 **Captain (C)**: **{cap['name']}** ({cap['pos']}, {cap['club']}) vs **{cap['opp']}** ({cap['ven']})  \n  *Rationale*: Highest fixture score against opponent Def #{cap['def_r']} ({cap['ga']} GA conceded).")
        lines.append(f"- 🥈 **Vice-Captain (VC)**: **{vc['name']}** ({vc['pos']}, {vc['club']}) vs **{vc['opp']}** ({vc['ven']})  \n  *Rationale*: Second highest goal expectation matchup for Gameweek {next_gw}.\n")

        lines.append(f"### 📋 Suggested Starting XI (GW {next_gw})\n")
        lines.append("| Pos | Player | Club | Matchup | Opponent Def Rank | Opponent Att Rank | FDR | Role |")
        lines.append("|:---:|:---|:---:|:---|:---:|:---:|:---:|:---|")
        for s in best_starters:
            c_badge = " (C)" if s['name'] == cap['name'] else (" (VC)" if s['name'] == vc['name'] else "")
            lines.append(f"| **{s['pos']}** | **{s['name']}{c_badge}** | {s['club']} | **{s['opp']}** ({s['ven']}) | Def #{s['def_r']} ({s['ga']} GA) | Att #{s['att_r']} ({s['gf']} GF) | {s['fdr']} | Starter |")

        lines.append("\n### 🪑 Substitutes Bench (Priority Order)\n")
        lines.append("| Order | Pos | Player | Club | Matchup | FDR | Bench Status |")
        lines.append("|:---:|:---:|:---|:---:|:---|:---:|:---|")
        for idx, b in enumerate(best_bench):
            role_name = "GK Sub" if b['pos'] == 'GKP' else f"Sub {idx}"
            lines.append(f"| **{role_name}** | {b['pos']} | **{b['name']}** | {b['club']} | **{b['opp']}** ({b['ven']}) | {b['fdr']} | Bench Cover |")

    return lines


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

    # Section 1: Suggested Starting Lineup & Captaincy
    md_lines.append("---")
    lineup_section_lines = build_suggested_lineup_section(
        data, mgr_name, current_gw, start_gw, lineup, fixtures_fdr, team_records, pl_ranks, player_summaries
    )
    md_lines.extend(lineup_section_lines)

    md_lines.append("---")
    md_lines.append("## 2. Key Tactical Takeaways\n")

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
        ips_rec = team_records.get("IPS", {})
        md_lines.append(f"- **Erling Haaland Capitalization**: Faces **Ipswich (H)** in GW 7 (Def #{ips_rec.get('def_rank', 15)}, {ips_rec.get('goals_against', 12)} GA conceded), followed by **Aston Villa (A)** and **Fulham (H)** in GW 11. Average opponent GA faced is **{haaland_p['avg_ga']} GA/game** — absolute captaincy priority!")

    if any(p["club"] == "CHE" for p in player_summaries):
        che_players = [p["name"] for p in player_summaries if p["club"] == "CHE"]
        md_lines.append(f"- **Chelsea Assets ({', '.join(che_players)})**: Matchups feature Tottenham (H), Man Utd (H), and Sunderland (A), facing defenses with a solid average FDR.")

    if any(p["club"] == "ARS" for p in player_summaries):
        ars_players = [p["name"] for p in player_summaries if p["club"] == "ARS"]
        md_lines.append(f"- **Arsenal Core ({', '.join(ars_players)})**: Facing tough defensive outfits with strong clean sheet prospects.")

    # Dynamic leaky defenses and weak attacks
    leakiest = sorted(team_records.values(), key=lambda t: (t.get("ga_per_game", 0), t.get("goals_against", 0)), reverse=True)[:3]
    leakiest_str = ", ".join([f"{t['team_name']} (#{t['def_rank']}, {t['goals_against']} GA)" for t in leakiest])
    md_lines.append(f"- **Leakiest Defenses in the League**: {leakiest_str}. Target attackers with upcoming matches against these backlines.")

    weakest_attacks = sorted(team_records.values(), key=lambda t: (t.get("gf_per_game", 99), t.get("goals_for", 99)))[:4]
    weakest_str = ", ".join([f"{t['team_name']} ({t['goals_for']} GF, Att #{t['att_rank']})" for t in weakest_attacks])
    md_lines.append(f"- **Weakest Attacks for Clean Sheets**: {weakest_str} offer prime clean sheet matchups.\n")

    md_lines.append("---")
    md_lines.append("## 3. Squad Next 5 Fixtures & Opponent Breakdown\n")
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
    md_lines.append("## 4. Attackers Ranked by Opponent Defensive Leakiness\n")
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
    md_lines.append("## 5. Defenders & Goalkeepers Ranked by Clean Sheet Potential\n")
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
    # Section 6: Suggested Trades & Tactical Move Recommendations
    md_lines.append("## 6. Suggested Trades & Tactical Move Recommendations\n")
    md_lines.append(f"Based on upcoming fixture difficulty (GW {next_5_gws[0]}–{next_5_gws[-1]}), opponent defensive resilience, player form, and squad roles, here are the highest-value trades and lineup adjustments for **{mgr_name}**:\n")

    md_lines.append("### 🎯 Key Trade Priorities\n")
    
    if "Arsene" in mgr_name:
        md_lines.append("1. **Trade Out Martin Ødegaard (£6.8m, MID) ➡️ Trade In Antoine Semenyo (£8.3m, MID) or Rayan Cherki (£7.8m, MID)**")
        md_lines.append("   - **Sell Reason**: Ødegaard has gone cold (1.5 form, 30 total points, dropping from 11 -> 3 -> 2 -> 1 pt in recent weeks) and Arsenal faces a gauntlet of resilient defenses (Everton #4, Liverpool #8, Hull #7).")
        md_lines.append("   - **Buy Reason**: Manchester City has the easiest schedule in the entire Premier League over the next 5 gameweeks (Avg FDR 2.6): **Ipswich (H)**, **Aston Villa (A)**, **Brighton (H)**, **Forest (A)**, and **Fulham (H)**. Semenyo is averaging 7.7 form with 36 points; Cherki has 44 points (6.3 form). Stacking a City midfielder with Erling Haaland doubles down on City's goal hauls against leaky defenses like Ipswich (12 GA).\n")

        md_lines.append("2. **Upgrade Bobby Thomas (£5.5m, DEF) ➡️ Trade In Pedro Porro (£5.6m, DEF) or Gabriel (£6.1m, DEF)**")
        md_lines.append("   - **Sell Reason**: Thomas is priced at £5.5m playing for newly-promoted Coventry City, facing away trips to Spurs and Everton with an FDR of 3.0.")
        md_lines.append("   - **Buy Reason**: Tottenham has the #1 easiest fixture schedule across the next 5 weeks (Avg FDR 2.6): **Coventry (H)**, **Palace (H)**, and **Ipswich (H)**. Porro offers immense attacking threat (corners, shots) and clean sheet upside for almost the exact same price (£5.6m).\n")

        md_lines.append("3. **Rotate Goalkeepers for GW 7, 8 & 9 (Verbruggen ➡️ Kinsky)**")
        md_lines.append("   - **Tactical Alert**: Brighton's Bart Verbruggen faces tough upcoming fixtures including **Liverpool (A, FDR 4)** in GW 8 and **Man City (A, FDR 5)** in GW 9.")
        md_lines.append("   - **Bench Solution**: Wenger already owns **Kinsky (TOT, £4.5m)**! Start Kinsky in GW 7 against Coventry (Att #18, 5 GF) and keep him in goal through GW 8 & 9 when Spurs play at home against Chelsea and Crystal Palace.\n")

        md_lines.append("4. **Promote Josko Gvardiol (£5.8m, DEF) into the Starting XI**")
        md_lines.append("   - **Lineup Optimization**: Gvardiol is currently sitting on Wenger's **bench**, yet has 41 points and a stellar 6.3 form. Man City hosts Ipswich in GW 7 (prime clean sheet odds). Gvardiol should start immediately over Konsa or Calafiori when Arsenal plays Liverpool away in GW 9.\n")

        md_lines.append("5. **Forward Upgrade: Barry (£5.7m, FWD) ➡️ Brian Brobbey (£5.7m, FWD) after GW 7**")
        md_lines.append("   - **Hold for GW 7**: Start Barry in GW 7 against Chelsea's leaky defense (#18, 13 GA conceded).")
        md_lines.append("   - **Sell Reason for GW 8+**: Barry immediately faces Arsenal (A, FDR 5) and Brentford (A) with an average FDR of 3.4.")
        md_lines.append("   - **Buy Reason**: Brobbey is on a scorching **8.5 form** (24 pts) at the exact same price (£5.7m), facing opponents conceding an average of 1.68 GA/match.\n")

        md_lines.append("### 📋 Recommended Transfer Targets Table\n")
        md_lines.append("| Priority | Transfer Type | Player OUT | Club | Pos | Price | Form | Player IN | Club | Pos | Price | Form | Next 5 Avg FDR | Trade Rationale |")
        md_lines.append("|:---:|:---:|:---|:---:|:---:|:---:|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---|")
        md_lines.append("| 🚨 **High** | Midfield Upgrade | **Ødegaard** | ARS | MID | £6.8m | 1.5 | **Semenyo** / **Cherki** | MCI | MID | £8.3m / £7.8m | 7.7 / 6.3 | **2.6** | Move away from Arsenal's tough defensive run into City's dream schedule (Ipswich H, Villa A, Fulham H). Stack with Haaland. |")
        md_lines.append("| 🚨 **High** | Premium Defender | **Thomas** | COV | DEF | £5.5m | 4.3 | **Pedro Porro** | TOT | DEF | £5.6m | 5.0 | **2.6** | Swap £5.5m Coventry defender into Spurs' elite fixture run (Coventry H, Palace H, Ipswich H). Massive clean sheet + attacking upside. |")
        md_lines.append("| ⚡ **Medium** | Goalkeeper Swap | **Verbruggen** | BHA | GKP | £4.6m | 7.7 | **Kinsky** *(Internal)* | TOT | GKP | £4.5m | 2.5 | **2.6** | Start Kinsky in GW 7 (Coventry H) and GW 8-9 (Liverpool/City away for Verbruggen). |")
        md_lines.append("| ⚡ **Medium** | Lineup Promotion | **Konsa** | ARS | DEF | £4.6m | 2.5 | **Gvardiol** *(Internal)* | MCI | DEF | £5.8m | 6.3 | **2.6** | Promote Gvardiol from bench into Starting XI for Ipswich (H) in GW 7 and Liverpool (A) in GW 9. |")
        md_lines.append("| 💡 **Budget** | Post-GW7 Forward Pivot | **Barry** | EVE | FWD | £5.7m | 6.0 | **Brobbey** | SUN | FWD | £5.7m | 8.5 | **3.0** | Start Barry vs Chelsea (H) in GW7, then pivot before Everton plays Arsenal (A) into in-form Brobbey (8.5 form). |")
    else:
        toughest_players = sorted(player_summaries, key=lambda p: (p['avg_fdr'], -p['avg_ga']), reverse=True)[:3]
        md_lines.append("1. **Sell High-Difficulty Assets**:")
        for tp in toughest_players:
            md_lines.append(f"   - **{tp['name']}** ({tp['club']}, {tp['pos']}): Facing avg FDR {tp['avg_fdr']} against tough defensive units.")
        md_lines.append("\n2. **Target Easiest Fixture Runs**:")
        md_lines.append("   - Look to target clubs with lowest upcoming FDR (Tottenham 2.6, Man City 2.6, Coventry 2.6).")

    md_lines.append("\n---")
    md_lines.append(f"## 7. Premier League 20-Team Defensive & Attacking Records (Through GW {current_gw})\n")
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

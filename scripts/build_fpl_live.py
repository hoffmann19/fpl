#!/usr/bin/env python3
"""
FPL Official API Scraper & Visualizer Builder
Scrapes live Fantasy Premier League data for Blue Square League (ID: 352792)
and compiles visualizer_data_2026_27.json and visualizer_data.json.
"""

import json
import os
import sys
import urllib.request
import sqlite3
from datetime import datetime, timezone

LEAGUE_ID = 352792

COLOR_PALETTE = [
    "#ff4757", "#2ed573", "#1e90ff", "#ffa502", "#ff47ff",
    "#00d2d3", "#20bf6b", "#a55eea", "#ff7f50", "#eccc68",
    "#ff9f1a"
]

def fetch_json(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[!] Error fetching {url}: {e}")
        return None

def sync_sqlite(db_path, league_id, bootstrap, results, managers_meta, gameweeks_dict, player_gw_scores, max_gw, all_fixtures=None, gw_live_stats=None):
    """
    Sync all live FPL data into SQLite database:
    - minileague_members (current ranks, team names, total points)
    - minileague_standings (gameweek-by-gameweek standings, hits, points, chips, captain)
    - minileague_lineups (squads, starters, bench, captain, points)
    - minileague_transfers (all player transfers, GW points, points since move, PPG)
    - player_gameweek_scores (each player's gameweek score across all played gameweeks)
    - players (updated current season total points, PPG, cost, status)
    - premier_league_gameweek_standings (Premier League table after each gameweek)
    - player_fixture_performances (opponent faced, venue, score, points, both teams' league ranks)
    - premier_league_past_standings (past season final Premier League tables)
    - minileague_past_standings (past season final Blue Square standings)
    """
    print(f"[*] Syncing all live data to SQLite database at {db_path}...")
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. minileague_members
    cur.execute("""
        CREATE TABLE IF NOT EXISTS minileague_members (
            league_id INTEGER,
            league_name TEXT,
            entry_id INTEGER,
            team_name TEXT,
            manager_name TEXT,
            joined_time TEXT,
            rank TEXT,
            last_rank TEXT,
            event_total INTEGER,
            total_points INTEGER,
            summary_overall_points TEXT,
            summary_overall_rank TEXT,
            summary_event_points TEXT,
            summary_event_rank TEXT,
            fpl_region TEXT,
            fpl_joined_date TEXT,
            PRIMARY KEY (league_id, entry_id)
        );
    """)

    for item in results:
        entry_id = item.get("entry")
        cur.execute("""
            INSERT INTO minileague_members (
                league_id, league_name, entry_id, team_name, manager_name,
                rank, last_rank, event_total, total_points
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(league_id, entry_id) DO UPDATE SET
                team_name = excluded.team_name,
                manager_name = excluded.manager_name,
                rank = excluded.rank,
                last_rank = excluded.last_rank,
                event_total = excluded.event_total,
                total_points = excluded.total_points
        """, (
            league_id,
            "Blue Square",
            entry_id,
            item.get("entry_name"),
            item.get("player_name"),
            str(item.get("rank")),
            str(item.get("last_rank")),
            item.get("event_total"),
            item.get("total")
        ))

    # 2. minileague_standings
    cur.execute("""
        CREATE TABLE IF NOT EXISTS minileague_standings (
            league_id INTEGER,
            event INTEGER,
            entry_id INTEGER,
            manager_name TEXT,
            team_name TEXT,
            gw_points INTEGER,
            gw_hits INTEGER,
            gw_net_points INTEGER,
            overall_points INTEGER,
            overall_rank INTEGER,
            rank INTEGER,
            chip TEXT,
            transfers INTEGER,
            team_value REAL,
            bank REAL,
            captain_name TEXT,
            captain_points INTEGER,
            updated_at TEXT,
            PRIMARY KEY (league_id, event, entry_id)
        );
    """)

    # 3. minileague_lineups
    cur.execute("""
        CREATE TABLE IF NOT EXISTS minileague_lineups (
            league_id INTEGER,
            event INTEGER,
            entry_id INTEGER,
            manager_name TEXT,
            player_name TEXT,
            club TEXT,
            position TEXT,
            points INTEGER,
            is_captain INTEGER,
            is_vice_captain INTEGER,
            is_starting INTEGER,
            updated_at TEXT,
            PRIMARY KEY (league_id, event, entry_id, player_name)
        );
    """)

    # 4. minileague_transfers
    cur.execute("""
        CREATE TABLE IF NOT EXISTS minileague_transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            league_id INTEGER,
            event INTEGER,
            entry_id INTEGER,
            manager_name TEXT,
            team_name TEXT,
            in_name TEXT,
            in_club TEXT,
            in_pos TEXT,
            in_cost REAL,
            in_points INTEGER,
            in_season_points INTEGER,
            in_points_since INTEGER,
            in_ppg REAL,
            out_name TEXT,
            out_club TEXT,
            out_pos TEXT,
            out_cost REAL,
            out_points INTEGER,
            out_season_points INTEGER,
            out_points_since INTEGER,
            out_ppg REAL,
            net_points INTEGER,
            net_points_since INTEGER,
            transfer_time TEXT,
            updated_at TEXT
        );
    """)
    cur.execute("DELETE FROM minileague_transfers WHERE league_id = ?", (league_id,))

    for gw in range(1, max_gw + 1):
        gw_key = str(gw)
        gw_data = gameweeks_dict.get(gw_key, {})
        standings = gw_data.get("standings", [])
        lineups = gw_data.get("lineups", {})

        for s in standings:
            mgr_name = s.get("manager")
            entry_id = managers_meta.get(mgr_name, {}).get("entry_id")
            if not entry_id:
                continue

            cur.execute("""
                INSERT INTO minileague_standings (
                    league_id, event, entry_id, manager_name, team_name,
                    gw_points, gw_hits, gw_net_points, overall_points, overall_rank,
                    rank, chip, transfers, team_value, bank,
                    captain_name, captain_points, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(league_id, event, entry_id) DO UPDATE SET
                    gw_points = excluded.gw_points,
                    gw_hits = excluded.gw_hits,
                    gw_net_points = excluded.gw_net_points,
                    overall_points = excluded.overall_points,
                    overall_rank = excluded.overall_rank,
                    rank = excluded.rank,
                    chip = excluded.chip,
                    transfers = excluded.transfers,
                    team_value = excluded.team_value,
                    bank = excluded.bank,
                    captain_name = excluded.captain_name,
                    captain_points = excluded.captain_points,
                    updated_at = excluded.updated_at
            """, (
                league_id, gw, entry_id, mgr_name, s.get("team"),
                s.get("gw_points", 0), s.get("gw_hits", 0), s.get("gw_net_points", 0),
                s.get("overall_points", 0), s.get("overall_rank", 0), s.get("rank", 0),
                s.get("chip", "None"), s.get("transfers", 0), s.get("team_value", 0.0),
                s.get("bank", 0.0), s.get("captain", ""), s.get("captain_points", 0),
                now_iso
            ))

            for t in s.get("transfers_detail", []):
                cur.execute("""
                    INSERT INTO minileague_transfers (
                        league_id, event, entry_id, manager_name, team_name,
                        in_name, in_club, in_pos, in_cost, in_points,
                        in_season_points, in_points_since, in_ppg,
                        out_name, out_club, out_pos, out_cost, out_points,
                        out_season_points, out_points_since, out_ppg,
                        net_points, net_points_since, transfer_time, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    league_id, gw, entry_id, mgr_name, s.get("team"),
                    t.get("in_name"), t.get("in_club"), t.get("in_pos"), t.get("in_cost", 0.0),
                    t.get("in_points", 0), t.get("in_season_points", 0), t.get("in_points_since", 0),
                    t.get("in_ppg", 0.0), t.get("out_name"), t.get("out_club"), t.get("out_pos"),
                    t.get("out_cost", 0.0), t.get("out_points", 0), t.get("out_season_points", 0),
                    t.get("out_points_since", 0), t.get("out_ppg", 0.0), t.get("net_points", 0),
                    t.get("net_points_since", 0), t.get("time"), now_iso
                ))

        for mgr_name, mgr_lineup in lineups.items():
            entry_id = managers_meta.get(mgr_name, {}).get("entry_id")
            if not entry_id:
                continue
            for p in mgr_lineup:
                cur.execute("""
                    INSERT INTO minileague_lineups (
                        league_id, event, entry_id, manager_name, player_name,
                        club, position, points, is_captain, is_vice_captain,
                        is_starting, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(league_id, event, entry_id, player_name) DO UPDATE SET
                        club = excluded.club,
                        position = excluded.position,
                        points = excluded.points,
                        is_captain = excluded.is_captain,
                        is_vice_captain = excluded.is_vice_captain,
                        is_starting = excluded.is_starting,
                        updated_at = excluded.updated_at
                """, (
                    league_id, gw, entry_id, mgr_name, p.get("name"),
                    p.get("club"), p.get("position"), p.get("points", 0),
                    1 if p.get("captain") else 0,
                    1 if p.get("vice_captain") else 0,
                    1 if p.get("starting") else 0,
                    now_iso
                ))

    # 5. player_gameweek_scores
    cur.execute("""
        CREATE TABLE IF NOT EXISTS player_gameweek_scores (
            element_id INTEGER,
            web_name TEXT,
            team TEXT,
            position TEXT,
            event INTEGER,
            points INTEGER,
            updated_at TEXT,
            PRIMARY KEY (element_id, event)
        );
    """)

    elements = {p["id"]: p for p in bootstrap.get("elements", [])}
    teams = {t["id"]: t for t in bootstrap.get("teams", [])}
    element_types = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}

    for pid, scores in player_gw_scores.items():
        el = elements.get(pid, {})
        wname = el.get("web_name", "")
        tname = teams.get(el.get("team"), {}).get("short_name", "")
        pos = element_types.get(el.get("element_type"), "MID")
        for g, pts in scores.items():
            cur.execute("""
                INSERT INTO player_gameweek_scores (
                    element_id, web_name, team, position, event, points, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(element_id, event) DO UPDATE SET
                    web_name = excluded.web_name,
                    team = excluded.team,
                    position = excluded.position,
                    points = excluded.points,
                    updated_at = excluded.updated_at
            """, (pid, wname, tname, pos, g, pts, now_iso))

    # 6. Update players table
    for pid, el in elements.items():
        tname = teams.get(el.get("team"), {}).get("name", "")
        tshort = teams.get(el.get("team"), {}).get("short_name", "")
        pos = element_types.get(el.get("element_type"), "MID")
        cur.execute("""
            INSERT INTO players (
                scraped_at, is_latest, id, web_name, first_name, second_name, full_name,
                team, team_short, position, cost_m, now_cost, selected_by_percent,
                status, news, total_points, points_per_game, minutes, goals_scored,
                assists, clean_sheets, goals_conceded, own_goals, penalties_saved,
                penalties_missed, yellow_cards, red_cards, saves, bonus, bps
            ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                scraped_at = excluded.scraped_at,
                is_latest = 1,
                web_name = excluded.web_name,
                first_name = excluded.first_name,
                second_name = excluded.second_name,
                full_name = excluded.full_name,
                team = excluded.team,
                team_short = excluded.team_short,
                position = excluded.position,
                cost_m = excluded.cost_m,
                now_cost = excluded.now_cost,
                selected_by_percent = excluded.selected_by_percent,
                status = excluded.status,
                news = excluded.news,
                total_points = excluded.total_points,
                points_per_game = excluded.points_per_game,
                minutes = excluded.minutes,
                goals_scored = excluded.goals_scored,
                assists = excluded.assists,
                clean_sheets = excluded.clean_sheets,
                goals_conceded = excluded.goals_conceded,
                own_goals = excluded.own_goals,
                penalties_saved = excluded.penalties_saved,
                penalties_missed = excluded.penalties_missed,
                yellow_cards = excluded.yellow_cards,
                red_cards = excluded.red_cards,
                saves = excluded.saves,
                bonus = excluded.bonus,
                bps = excluded.bps
        """, (
            now_iso, pid, el.get("web_name"), el.get("first_name"), el.get("second_name"),
            f"{el.get('first_name', '')} {el.get('second_name', '')}".strip(),
            tname, tshort, pos,
            round(el.get("now_cost", 0) / 10.0, 1), el.get("now_cost", 0),
            float(el.get("selected_by_percent") or 0.0), el.get("status"), el.get("news"),
            el.get("total_points", 0), float(el.get("points_per_game") or 0.0),
            el.get("minutes", 0), el.get("goals_scored", 0), el.get("assists", 0),
            el.get("clean_sheets", 0), el.get("goals_conceded", 0), el.get("own_goals", 0),
            el.get("penalties_saved", 0), el.get("penalties_missed", 0), el.get("yellow_cards", 0),
            el.get("red_cards", 0), el.get("saves", 0), el.get("bonus", 0), el.get("bps", 0)
        ))

    # 7. premier_league_gameweek_standings
    cur.execute("""
        CREATE TABLE IF NOT EXISTS premier_league_gameweek_standings (
            event INTEGER,
            position INTEGER,
            team_id INTEGER,
            team_name TEXT,
            team_short TEXT,
            played INTEGER,
            won INTEGER,
            drawn INTEGER,
            lost INTEGER,
            goals_for INTEGER,
            goals_against INTEGER,
            goal_difference INTEGER,
            points INTEGER,
            updated_at TEXT,
            PRIMARY KEY (event, position)
        );
    """)

    pl_gw_ranks = {}
    if all_fixtures:
        for g in range(1, max_gw + 1):
            tbl = {tid: {'id': tid, 'name': t['name'], 'short_name': t['short_name'], 'p': 0, 'w': 0, 'd': 0, 'l': 0, 'gf': 0, 'ga': 0, 'gd': 0, 'pts': 0} for tid, t in teams.items()}
            for f in all_fixtures:
                if f.get('finished') and f.get('event') and f['event'] <= g:
                    h, a = f.get('team_h'), f.get('team_a')
                    hs, as_ = f.get('team_h_score'), f.get('team_a_score')
                    if h in tbl and a in tbl and hs is not None and as_ is not None:
                        tbl[h]['p'] += 1
                        tbl[a]['p'] += 1
                        tbl[h]['gf'] += hs
                        tbl[h]['ga'] += as_
                        tbl[a]['gf'] += as_
                        tbl[a]['ga'] += hs
                        tbl[h]['gd'] = tbl[h]['gf'] - tbl[h]['ga']
                        tbl[a]['gd'] = tbl[a]['gf'] - tbl[a]['ga']
                        if hs > as_:
                            tbl[h]['w'] += 1
                            tbl[h]['pts'] += 3
                            tbl[a]['l'] += 1
                        elif hs < as_:
                            tbl[a]['w'] += 1
                            tbl[a]['pts'] += 3
                            tbl[h]['l'] += 1
                        else:
                            tbl[h]['d'] += 1
                            tbl[h]['pts'] += 1
                            tbl[a]['d'] += 1
                            tbl[a]['pts'] += 1
            ranked = sorted(tbl.values(), key=lambda x: (x['pts'], x['gd'], x['gf'], x['name']), reverse=True)
            pl_gw_ranks[g] = {}
            for pos, r in enumerate(ranked, start=1):
                pl_gw_ranks[g][r['id']] = pos
                cur.execute("""
                    INSERT INTO premier_league_gameweek_standings (
                        event, position, team_id, team_name, team_short,
                        played, won, drawn, lost, goals_for, goals_against,
                        goal_difference, points, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(event, position) DO UPDATE SET
                        team_id = excluded.team_id,
                        team_name = excluded.team_name,
                        team_short = excluded.team_short,
                        played = excluded.played,
                        won = excluded.won,
                        drawn = excluded.drawn,
                        lost = excluded.lost,
                        goals_for = excluded.goals_for,
                        goals_against = excluded.goals_against,
                        goal_difference = excluded.goal_difference,
                        points = excluded.points,
                        updated_at = excluded.updated_at
                """, (
                    g, pos, r['id'], r['name'], r['short_name'],
                    r['p'], r['w'], r['d'], r['l'], r['gf'], r['ga'],
                    r['gd'], r['pts'], now_iso
                ))

    # 8. player_fixture_performances
    cur.execute("""
        CREATE TABLE IF NOT EXISTS player_fixture_performances (
            element_id INTEGER,
            web_name TEXT,
            player_team TEXT,
            player_team_short TEXT,
            event INTEGER,
            opponent_team TEXT,
            opponent_team_short TEXT,
            is_home INTEGER,
            venue TEXT,
            fixture_score TEXT,
            result TEXT,
            points INTEGER,
            minutes INTEGER,
            goals_scored INTEGER,
            assists INTEGER,
            clean_sheets INTEGER,
            goals_conceded INTEGER,
            bonus INTEGER,
            bps INTEGER,
            player_team_rank INTEGER,
            opponent_team_rank INTEGER,
            updated_at TEXT,
            PRIMARY KEY (element_id, event)
        );
    """)

    if all_fixtures and gw_live_stats:
        for g in range(1, max_gw + 1):
            gw_fixtures = [f for f in all_fixtures if f.get('event') == g]
            team_fixture_map = {}
            for f in gw_fixtures:
                team_fixture_map[f.get('team_h')] = (f, True)
                team_fixture_map[f.get('team_a')] = (f, False)

            for pid, el in elements.items():
                p_team_id = el.get("team")
                if p_team_id not in team_fixture_map:
                    continue
                f, is_home = team_fixture_map[p_team_id]
                opp_id = f.get('team_a') if is_home else f.get('team_h')
                opp_info = teams.get(opp_id, {})
                my_team_info = teams.get(p_team_id, {})

                venue = 'H' if is_home else 'A'
                hs, as_ = f.get('team_h_score'), f.get('team_a_score')
                if hs is not None and as_ is not None and f.get('finished'):
                    my_s = hs if is_home else as_
                    opp_s = as_ if is_home else hs
                    score_str = f"{my_s}-{opp_s}"
                    res_letter = 'W' if my_s > opp_s else ('L' if my_s < opp_s else 'D')
                    result_str = f"{res_letter} {my_s}-{opp_s}"
                else:
                    score_str = "TBD"
                    result_str = "TBD"

                stats = gw_live_stats.get(g, {}).get(pid, {})
                cur.execute("""
                    INSERT INTO player_fixture_performances (
                        element_id, web_name, player_team, player_team_short, event,
                        opponent_team, opponent_team_short, is_home, venue, fixture_score,
                        result, points, minutes, goals_scored, assists, clean_sheets,
                        goals_conceded, bonus, bps, player_team_rank, opponent_team_rank, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(element_id, event) DO UPDATE SET
                        web_name = excluded.web_name,
                        player_team = excluded.player_team,
                        player_team_short = excluded.player_team_short,
                        opponent_team = excluded.opponent_team,
                        opponent_team_short = excluded.opponent_team_short,
                        is_home = excluded.is_home,
                        venue = excluded.venue,
                        fixture_score = excluded.fixture_score,
                        result = excluded.result,
                        points = excluded.points,
                        minutes = excluded.minutes,
                        goals_scored = excluded.goals_scored,
                        assists = excluded.assists,
                        clean_sheets = excluded.clean_sheets,
                        goals_conceded = excluded.goals_conceded,
                        bonus = excluded.bonus,
                        bps = excluded.bps,
                        player_team_rank = excluded.player_team_rank,
                        opponent_team_rank = excluded.opponent_team_rank,
                        updated_at = excluded.updated_at
                """, (
                    pid, el.get('web_name'), my_team_info.get('name'), my_team_info.get('short_name'), g,
                    opp_info.get('name'), opp_info.get('short_name'), 1 if is_home else 0, venue,
                    score_str, result_str, stats.get('total_points', 0), stats.get('minutes', 0),
                    stats.get('goals_scored', 0), stats.get('assists', 0), stats.get('clean_sheets', 0),
                    stats.get('goals_conceded', 0), stats.get('bonus', 0), stats.get('bps', 0),
                    pl_gw_ranks.get(g, {}).get(p_team_id), pl_gw_ranks.get(g, {}).get(opp_id),
                    now_iso
                ))

    # 9. premier_league_past_standings
    cur.execute("""
        CREATE TABLE IF NOT EXISTS premier_league_past_standings (
            season TEXT,
            position INTEGER,
            team_name TEXT,
            team_short TEXT,
            played INTEGER,
            won INTEGER,
            drawn INTEGER,
            lost INTEGER,
            goal_difference INTEGER,
            points INTEGER,
            PRIMARY KEY (season, position)
        );
    """)

    past_seasons_data = [
        # 2024/25
        ("2024/25", 1, "Liverpool", "LIV", 38, 25, 9, 4, 45, 84),
        ("2024/25", 2, "Arsenal", "ARS", 38, 22, 8, 8, 35, 74),
        ("2024/25", 3, "Manchester City", "MCI", 38, 21, 8, 9, 28, 71),
        ("2024/25", 4, "Chelsea", "CHE", 38, 20, 9, 9, 21, 69),
        ("2024/25", 5, "Newcastle United", "NEW", 38, 20, 6, 12, 21, 66),
        ("2024/25", 6, "Aston Villa", "AVL", 38, 19, 9, 10, 7, 66),
        ("2024/25", 7, "Nottingham Forest", "NFO", 38, 19, 8, 11, 12, 65),
        ("2024/25", 8, "Brighton & Hove Albion", "BHA", 38, 16, 13, 9, 7, 61),
        ("2024/25", 9, "Bournemouth", "BOU", 38, 15, 11, 12, 12, 56),
        ("2024/25", 10, "Brentford", "BRE", 38, 16, 8, 14, 9, 56),
        ("2024/25", 11, "Fulham", "FUL", 38, 15, 9, 14, 0, 54),
        ("2024/25", 12, "Crystal Palace", "CRY", 38, 13, 14, 11, 0, 53),
        ("2024/25", 13, "Everton", "EVE", 38, 12, 12, 14, -6, 48),
        ("2024/25", 14, "West Ham United", "WHU", 38, 11, 10, 17, -13, 43),
        ("2024/25", 15, "Manchester United", "MUN", 38, 11, 9, 18, -12, 42),
        ("2024/25", 16, "Wolverhampton Wanderers", "WOL", 38, 12, 6, 20, -15, 42),
        ("2024/25", 17, "Tottenham Hotspur", "TOT", 38, 10, 8, 20, -11, 38),
        ("2024/25", 18, "Leicester City", "LEI", 38, 6, 7, 25, -45, 25),
        ("2024/25", 19, "Ipswich Town", "IPS", 38, 4, 10, 24, -46, 22),
        ("2024/25", 20, "Southampton", "SOU", 38, 2, 6, 30, -56, 12),
        # 2023/24
        ("2023/24", 1, "Manchester City", "MCI", 38, 28, 7, 3, 62, 91),
        ("2023/24", 2, "Arsenal", "ARS", 38, 28, 5, 5, 62, 89),
        ("2023/24", 3, "Liverpool", "LIV", 38, 24, 10, 4, 45, 82),
        ("2023/24", 4, "Aston Villa", "AVL", 38, 20, 8, 10, 15, 68),
        ("2023/24", 5, "Tottenham Hotspur", "TOT", 38, 20, 6, 12, 13, 66),
        ("2023/24", 6, "Chelsea", "CHE", 38, 18, 9, 11, 14, 63),
        ("2023/24", 7, "Newcastle United", "NEW", 38, 18, 6, 14, 23, 60),
        ("2023/24", 8, "Manchester United", "MUN", 38, 18, 6, 14, -1, 60),
        ("2023/24", 9, "West Ham United", "WHU", 38, 14, 10, 14, -14, 52),
        ("2023/24", 10, "Crystal Palace", "CRY", 38, 13, 10, 15, -1, 49),
        ("2023/24", 11, "Brighton & Hove Albion", "BHA", 38, 12, 12, 14, -7, 48),
        ("2023/24", 12, "Bournemouth", "BOU", 38, 13, 9, 16, -13, 48),
        ("2023/24", 13, "Fulham", "FUL", 38, 13, 8, 17, -6, 47),
        ("2023/24", 14, "Wolverhampton Wanderers", "WOL", 38, 13, 7, 18, -15, 46),
        ("2023/24", 15, "Everton", "EVE", 38, 13, 9, 16, -11, 40),
        ("2023/24", 16, "Brentford", "BRE", 38, 10, 9, 19, -9, 39),
        ("2023/24", 17, "Nottingham Forest", "NFO", 38, 9, 9, 20, -18, 32),
        ("2023/24", 18, "Luton Town", "LUT", 38, 6, 8, 24, -33, 26),
        ("2023/24", 19, "Burnley", "BUR", 38, 5, 9, 24, -37, 24),
        ("2023/24", 20, "Sheffield United", "SHU", 38, 3, 7, 28, -69, 16),
        # 2022/23
        ("2022/23", 1, "Manchester City", "MCI", 38, 28, 5, 5, 61, 89),
        ("2022/23", 2, "Arsenal", "ARS", 38, 26, 6, 6, 45, 84),
        ("2022/23", 3, "Manchester United", "MUN", 38, 23, 6, 9, 15, 75),
        ("2022/23", 4, "Newcastle United", "NEW", 38, 19, 14, 5, 35, 71),
        ("2022/23", 5, "Liverpool", "LIV", 38, 19, 10, 9, 28, 67),
        ("2022/23", 6, "Brighton & Hove Albion", "BHA", 38, 18, 8, 12, 19, 62),
        ("2022/23", 7, "Aston Villa", "AVL", 38, 18, 7, 13, 5, 61),
        ("2022/23", 8, "Tottenham Hotspur", "TOT", 38, 18, 6, 14, 7, 60),
        ("2022/23", 9, "Brentford", "BRE", 38, 15, 14, 9, 12, 59),
        ("2022/23", 10, "Fulham", "FUL", 38, 15, 7, 16, 2, 52),
        ("2022/23", 11, "Crystal Palace", "CRY", 38, 11, 12, 15, -9, 45),
        ("2022/23", 12, "Chelsea", "CHE", 38, 11, 11, 16, -10, 44),
        ("2022/23", 13, "Wolverhampton Wanderers", "WOL", 38, 11, 8, 19, -27, 41),
        ("2022/23", 14, "West Ham United", "WHU", 38, 11, 7, 20, -13, 40),
        ("2022/23", 15, "Bournemouth", "BOU", 38, 11, 6, 21, -34, 39),
        ("2022/23", 16, "Nottingham Forest", "NFO", 38, 9, 11, 18, -30, 38),
        ("2022/23", 17, "Everton", "EVE", 38, 8, 12, 18, -23, 36),
        ("2022/23", 18, "Leicester City", "LEI", 38, 9, 7, 22, -17, 34),
        ("2022/23", 19, "Leeds United", "LEE", 38, 7, 10, 21, -30, 31),
        ("2022/23", 20, "Southampton", "SOU", 38, 6, 7, 25, -37, 25),
    ]

    for row in past_seasons_data:
        cur.execute("""
            INSERT INTO premier_league_past_standings (
                season, position, team_name, team_short, played, won, drawn, lost, goal_difference, points
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(season, position) DO UPDATE SET
                team_name = excluded.team_name,
                team_short = excluded.team_short,
                played = excluded.played,
                won = excluded.won,
                drawn = excluded.drawn,
                lost = excluded.lost,
                goal_difference = excluded.goal_difference,
                points = excluded.points
        """, row)

    # 10. minileague_past_standings
    cur.execute("""
        CREATE TABLE IF NOT EXISTS minileague_past_standings (
            season TEXT,
            rank INTEGER,
            manager_name TEXT,
            team_name TEXT,
            total_points INTEGER,
            PRIMARY KEY (season, rank)
        );
    """)

    project_root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    past_json_path = os.path.join(project_root_dir, "visualizer_data_2025_26.json")
    if os.path.exists(past_json_path):
        try:
            with open(past_json_path) as pf:
                past_d = json.load(pf)
            final_gw_standings = past_d.get("gameweeks", {}).get("38", {}).get("standings", [])
            for s in final_gw_standings:
                cur.execute("""
                    INSERT INTO minileague_past_standings (season, rank, manager_name, team_name, total_points)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(season, rank) DO UPDATE SET
                        manager_name = excluded.manager_name,
                        team_name = excluded.team_name,
                        total_points = excluded.total_points
                """, ("2025/26", s.get("rank"), s.get("manager"), s.get("team"), s.get("overall_points")))
        except Exception as e:
            print(f"[!] Error loading past mini-league data: {e}")

    conn.commit()
    conn.close()
    print(f"[+] SQLite database successfully synced at {db_path}!")

def main():
    print("[*] Fetching FPL bootstrap static data...")
    bootstrap = fetch_json("https://fantasy.premierleague.com/api/bootstrap-static/")
    if not bootstrap:
        print("[!] Failed to fetch bootstrap static")
        return

    elements = {p["id"]: p for p in bootstrap["elements"]}
    teams = {t["id"]: t for t in bootstrap["teams"]}
    element_types = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}
    events = bootstrap["events"]

    # Determine current and finished GWs
    current_gw = 1
    finished_gws = []
    for e in events:
        if e.get("is_current"):
            current_gw = e["id"]
        if e.get("finished"):
            finished_gws.append(e["id"])

    # Max GW to process (at least 1)
    max_gw = max(current_gw, max(finished_gws, default=1))
    print(f"[*] Current Gameweek: {current_gw}, Max Gameweek: {max_gw}")

    # Fetch League Standings
    print(f"[*] Fetching standings for Blue Square mini-league (ID: {LEAGUE_ID})...")
    standings_data = fetch_json(f"https://fantasy.premierleague.com/api/leagues-classic/{LEAGUE_ID}/standings/")
    if not standings_data:
        print("[!] Failed to fetch league standings")
        return

    results = standings_data.get("standings", {}).get("results", [])
    print(f"[*] Found {len(results)} managers in Blue Square!")

    managers_meta = {}
    for idx, item in enumerate(results):
        mgr_name = item.get("player_name", "").strip()
        team_name = item.get("entry_name", "").strip()
        managers_meta[mgr_name] = {
            "team": team_name,
            "color": COLOR_PALETTE[idx % len(COLOR_PALETTE)],
            "entry_id": item.get("entry")
        }

    gameweeks_dict = {}

    for gw in range(1, 39):
        gameweeks_dict[str(gw)] = {
            "standings": [],
            "lineups": {}
        }

    # Pre-fetch manager transfer histories for all managers
    manager_transfers = {}
    print("[*] Fetching manager transfer histories...")
    for mgr_name, meta in managers_meta.items():
        entry_id = meta.get("entry_id")
        if entry_id:
            t_data = fetch_json(f"https://fantasy.premierleague.com/api/entry/{entry_id}/transfers/") or []
            manager_transfers[mgr_name] = t_data
        else:
            manager_transfers[mgr_name] = []

    # Pre-fetch all Premier League fixtures
    print("[*] Fetching all Premier League fixtures...")
    all_fixtures = fetch_json("https://fantasy.premierleague.com/api/fixtures/") or []

    # Pre-fetch live player stats for all gameweeks 1 to max_gw
    gw_live_stats = {}
    player_gw_scores = {}
    print(f"[*] Pre-fetching live player stats for Gameweeks 1 to {max_gw}...")
    for g in range(1, max_gw + 1):
        live_data = fetch_json(f"https://fantasy.premierleague.com/api/event/{g}/live/")
        g_stats = {}
        if live_data and "elements" in live_data:
            for el in live_data["elements"]:
                pid = el["id"]
                pts = el.get("stats", {}).get("total_points", 0)
                g_stats[pid] = el.get("stats", {})
                if pid not in player_gw_scores:
                    player_gw_scores[pid] = {}
                player_gw_scores[pid][g] = pts
        gw_live_stats[g] = g_stats

    # Process played gameweeks (1 to max_gw)
    for gw in range(1, max_gw + 1):
        print(f"[*] Processing Gameweek {gw}...")
        
        # Use pre-fetched live player stats for this GW
        live_stats = gw_live_stats.get(gw, {})

        # Use pre-fetched fixtures for this GW
        fixtures_data = [f for f in all_fixtures if f.get("event") == gw]
        if not fixtures_data:
            fixtures_data = fetch_json(f"https://fantasy.premierleague.com/api/fixtures/?event={gw}") or []
        team_fixture_finished = {}
        gw_team_fixtures = {}
        for f in fixtures_data:
            finished = f.get("finished", False) or f.get("finished_provisional", False)
            th = f.get("team_h")
            ta = f.get("team_a")
            th_short = teams.get(th, {}).get("short_name", "")
            ta_short = teams.get(ta, {}).get("short_name", "")
            th_name = teams.get(th, {}).get("name", "")
            ta_name = teams.get(ta, {}).get("name", "")
            team_fixture_finished[th] = finished
            team_fixture_finished[ta] = finished
            if th:
                gw_team_fixtures[th] = {
                    "opponent": f"{ta_short} (H)",
                    "opponent_name": ta_name,
                    "venue": "H"
                }
            if ta:
                gw_team_fixtures[ta] = {
                    "opponent": f"{th_short} (A)",
                    "opponent_name": th_name,
                    "venue": "A"
                }

        gw_standings_raw = []

        for mgr_name, meta in managers_meta.items():
            entry_id = meta["entry_id"]
            picks_data = fetch_json(f"https://fantasy.premierleague.com/api/entry/{entry_id}/event/{gw}/picks/")
            
            if not picks_data:
                continue

            entry_hist = picks_data.get("entry_history", {})
            active_chip = picks_data.get("active_chip") or "None"
            picks = picks_data.get("picks", [])

            gw_points = entry_hist.get("points", 0)
            gw_hits = entry_hist.get("event_transfers_cost", 0)
            gw_net_points = gw_points - gw_hits
            overall_points = entry_hist.get("total_points", 0)
            overall_rank = entry_hist.get("overall_rank", 0)
            transfers = entry_hist.get("event_transfers", 0)
            team_value = (entry_hist.get("value", 1000) or 1000) / 10.0
            bank = (entry_hist.get("bank", 0) or 0) / 10.0

            captain_name = ""
            captain_pts = 0
            players_left = 0
            value_left = 0.0
            mgr_lineup = []

            for p in picks:
                p_id = p["element"]
                el_info = elements.get(p_id, {})
                p_team_id = el_info.get("team")
                t_info = teams.get(p_team_id, {})
                stats = live_stats.get(p_id, {})
                
                pos_code = element_types.get(el_info.get("element_type"), "MID")
                club_code = t_info.get("short_name", "PL")
                web_name = el_info.get("web_name", "")
                
                p_pts = stats.get("total_points", 0)
                is_cap = p.get("is_captain", False)
                is_vc = p.get("is_vice_captain", False)
                is_start = p.get("position", 15) <= 11
                multiplier = p.get("multiplier", 1)

                if is_cap:
                    captain_name = web_name
                    captain_pts = p_pts * multiplier

                if is_start:
                    is_match_finished = team_fixture_finished.get(p_team_id, False)
                    if not is_match_finished:
                        players_left += 1
                        value_left += (el_info.get("now_cost", 0) / 10.0)

                fix_info = gw_team_fixtures.get(p_team_id, {})
                opp_str = fix_info.get("opponent", "")
                opp_name = fix_info.get("opponent_name", "")

                mgr_lineup.append({
                    "name": web_name,
                    "club": club_code,
                    "opponent": opp_str,
                    "opponent_name": opp_name,
                    "position": pos_code,
                    "points": p_pts * (multiplier if is_start else 1),
                    "captain": is_cap,
                    "vice_captain": is_vc,
                    "starting": is_start,
                    "sub_in": False,
                    "sub_out": False
                })

            # Calculate transfers detail for this manager in this GW
            mgr_gw_transfers = [t for t in manager_transfers.get(mgr_name, []) if t.get("event") == gw]
            transfers_detail = []
            transfers_in_names = []
            transfers_out_names = []

            for t in mgr_gw_transfers:
                in_id = t.get("element_in")
                out_id = t.get("element_out")
                in_el = elements.get(in_id, {})
                out_el = elements.get(out_id, {})
                in_name = in_el.get("web_name", "Unknown")
                out_name = out_el.get("web_name", "Unknown")
                in_club = teams.get(in_el.get("team"), {}).get("short_name", "")
                out_club = teams.get(out_el.get("team"), {}).get("short_name", "")
                in_pos = element_types.get(in_el.get("element_type"), "MID")
                out_pos = element_types.get(out_el.get("element_type"), "MID")

                in_pts = live_stats.get(in_id, {}).get("total_points", 0)
                out_pts = live_stats.get(out_id, {}).get("total_points", 0)

                in_pts_since = sum(player_gw_scores.get(in_id, {}).get(g, 0) for g in range(gw, max_gw + 1))
                out_pts_since = sum(player_gw_scores.get(out_id, {}).get(g, 0) for g in range(gw, max_gw + 1))
                net_pts_since = in_pts_since - out_pts_since

                in_season_pts = in_el.get("total_points", in_pts)
                out_season_pts = out_el.get("total_points", out_pts)
                in_season_ppg = float(in_el.get("points_per_game") or 0.0)
                out_season_ppg = float(out_el.get("points_per_game") or 0.0)

                gws_since = max(1, max_gw - gw + 1)
                in_ppg_since = round(in_pts_since / gws_since, 1)
                out_ppg_since = round(out_pts_since / gws_since, 1)

                transfers_in_names.append(in_name)
                transfers_out_names.append(out_name)
                transfers_detail.append({
                    "in_name": in_name,
                    "in_club": in_club,
                    "in_pos": in_pos,
                    "in_cost": round(t.get("element_in_cost", 0) / 10.0, 1),
                    "in_points": in_pts,
                    "in_season_points": in_season_pts,
                    "in_points_since": in_pts_since,
                    "in_ppg": in_ppg_since,
                    "in_ppg_since": in_ppg_since,
                    "in_season_ppg": in_season_ppg,
                    "out_name": out_name,
                    "out_club": out_club,
                    "out_pos": out_pos,
                    "out_cost": round(t.get("element_out_cost", 0) / 10.0, 1),
                    "out_points": out_pts,
                    "out_season_points": out_season_pts,
                    "out_points_since": out_pts_since,
                    "out_ppg": out_ppg_since,
                    "out_ppg_since": out_ppg_since,
                    "out_season_ppg": out_season_ppg,
                    "net_points": in_pts - out_pts,
                    "net_points_since": net_pts_since,
                    "transfer_gw": gw,
                    "time": t.get("time")
                })

            # Fallback to squad diffing if transfers were recorded but not in transfers endpoint
            if not transfers_detail and gw > 1:
                prev_lineup = gameweeks_dict.get(str(gw - 1), {}).get("lineups", {}).get(mgr_name, [])
                if prev_lineup:
                    curr_names = {p["name"]: p for p in mgr_lineup}
                    prev_names = {p["name"]: p for p in prev_lineup}
                    ins = [p for name, p in curr_names.items() if name not in prev_names]
                    outs = [p for name, p in prev_names.items() if name not in curr_names]
                    for i in range(max(len(ins), len(outs))):
                        in_p = ins[i] if i < len(ins) else None
                        out_p = outs[i] if i < len(outs) else None
                        in_n = in_p["name"] if in_p else "-"
                        out_n = out_p["name"] if out_p else "-"
                        in_p_pts = in_p["points"] if in_p else 0
                        out_p_pts = 0
                        
                        # Match with element in bootstrap if available
                        in_el_fb = next((e for e in elements.values() if e.get("web_name") == in_n), {}) if in_p else {}
                        out_el_fb = next((e for e in elements.values() if e.get("web_name") == out_n), {}) if out_p else {}

                        in_pid = in_el_fb.get("id")
                        out_pid = out_el_fb.get("id")
                        in_pts_since = sum(player_gw_scores.get(in_pid, {}).get(g, 0) for g in range(gw, max_gw + 1)) if in_pid else in_p_pts
                        out_pts_since = sum(player_gw_scores.get(out_pid, {}).get(g, 0) for g in range(gw, max_gw + 1)) if out_pid else out_p_pts

                        if in_p:
                            transfers_in_names.append(in_n)
                        if out_p:
                            transfers_out_names.append(out_n)
                        gws_since = max(1, max_gw - gw + 1)
                        in_ppg_since = round(in_pts_since / gws_since, 1)
                        out_ppg_since = round(out_pts_since / gws_since, 1)

                        transfers_detail.append({
                            "in_name": in_n,
                            "in_club": in_p["club"] if in_p else "",
                            "in_pos": in_p["position"] if in_p else "",
                            "in_cost": 0.0,
                            "in_points": in_p_pts,
                            "in_season_points": in_el_fb.get("total_points", in_p_pts),
                            "in_points_since": in_pts_since,
                            "in_ppg": in_ppg_since,
                            "in_ppg_since": in_ppg_since,
                            "in_season_ppg": float(in_el_fb.get("points_per_game") or 0.0),
                            "out_name": out_n,
                            "out_club": out_p["club"] if out_p else "",
                            "out_pos": out_p["position"] if out_p else "",
                            "out_cost": 0.0,
                            "out_points": out_p_pts,
                            "out_season_points": out_el_fb.get("total_points", out_p_pts),
                            "out_points_since": out_pts_since,
                            "out_ppg": out_ppg_since,
                            "out_ppg_since": out_ppg_since,
                            "out_season_ppg": float(out_el_fb.get("points_per_game") or 0.0),
                            "net_points": in_p_pts - out_p_pts,
                            "net_points_since": in_pts_since - out_pts_since,
                            "transfer_gw": gw,
                            "time": None
                        })

            gw_standings_raw.append({
                "manager": mgr_name,
                "team": meta["team"],
                "gw_points": gw_points,
                "gw_hits": gw_hits,
                "gw_net_points": gw_net_points,
                "overall_points": overall_points,
                "overall_rank": overall_rank,
                "chip": active_chip,
                "transfers": transfers,
                "team_value": team_value,
                "bank": bank,
                "captain": captain_name,
                "captain_points": captain_pts,
                "players_left": players_left,
                "value_left": round(value_left, 1),
                "transfers_in": transfers_in_names,
                "transfers_out": transfers_out_names,
                "transfers_detail": transfers_detail
            })

            gameweeks_dict[str(gw)]["lineups"][mgr_name] = mgr_lineup

        # Save team fixtures map for this gameweek
        gameweeks_dict[str(gw)]["team_fixtures"] = {
            teams[tid]["short_name"]: info["opponent"] for tid, info in gw_team_fixtures.items() if tid in teams
        }

        # Rank managers by overall_points (or gw_points if tie)
        gw_standings_raw.sort(key=lambda x: (x["overall_points"], x["gw_points"]), reverse=True)
        for rank_idx, record in enumerate(gw_standings_raw):
            record["rank"] = rank_idx + 1

        gameweeks_dict[str(gw)]["standings"] = gw_standings_raw

    # For unplayed GWs (max_gw+1 .. 38), populate with pre-season/latest standings
    latest_gw_key = str(max_gw)
    latest_standings = gameweeks_dict[latest_gw_key]["standings"]
    latest_lineups = gameweeks_dict[latest_gw_key]["lineups"]

    for gw in range(max_gw + 1, 39):
        unplayed_standings = [dict(s, gw_points=0, gw_hits=0, gw_net_points=0, transfers=0, chip="None", transfers_in=[], transfers_out=[], transfers_detail=[]) for s in latest_standings]
        
        # Pre-populate unplayed fixtures
        unplayed_fixtures_data = [f for f in all_fixtures if f.get("event") == gw]
        unplayed_gw_team_fixes = {}
        for f in unplayed_fixtures_data:
            th = f.get("team_h")
            ta = f.get("team_a")
            th_short = teams.get(th, {}).get("short_name", "")
            ta_short = teams.get(ta, {}).get("short_name", "")
            th_name = teams.get(th, {}).get("name", "")
            ta_name = teams.get(ta, {}).get("name", "")
            if th:
                unplayed_gw_team_fixes[th_short] = {"opponent": f"{ta_short} (H)", "opponent_name": ta_name}
            if ta:
                unplayed_gw_team_fixes[ta_short] = {"opponent": f"{th_short} (A)", "opponent_name": th_name}

        unplayed_lineups = {}
        for mgr, lineup in latest_lineups.items():
            mgr_unplayed = []
            for p in lineup:
                p_copy = dict(p, points=0)
                club = p.get("club")
                if club in unplayed_gw_team_fixes:
                    p_copy["opponent"] = unplayed_gw_team_fixes[club]["opponent"]
                    p_copy["opponent_name"] = unplayed_gw_team_fixes[club]["opponent_name"]
                mgr_unplayed.append(p_copy)
            unplayed_lineups[mgr] = mgr_unplayed

        gameweeks_dict[str(gw)]["standings"] = unplayed_standings
        gameweeks_dict[str(gw)]["lineups"] = unplayed_lineups
        gameweeks_dict[str(gw)]["team_fixtures"] = {
            c: info["opponent"] for c, info in unplayed_gw_team_fixes.items()
        }

    # Create compact players catalog with total_points, PPG, cost, etc.
    players_catalog = {}
    for pid, p in elements.items():
        wname = p.get("web_name", "")
        t_info = teams.get(p.get("team"), {})
        pos_code = element_types.get(p.get("element_type"), "MID")
        players_catalog[wname] = {
            "id": pid,
            "web_name": wname,
            "team": t_info.get("short_name", ""),
            "position": pos_code,
            "total_points": p.get("total_points", 0),
            "points_per_game": float(p.get("points_per_game") or 0.0),
            "cost": round(p.get("now_cost", 0) / 10.0, 1),
            "gw_points": {str(g): pts for g, pts in player_gw_scores.get(pid, {}).items()}
        }

    output_data = {
        "season": "2026/27",
        "managers": {m: {"team": meta["team"], "color": meta["color"]} for m, meta in managers_meta.items()},
        "players": players_catalog,
        "gameweeks": gameweeks_dict
    }

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    out_2026_27 = os.path.join(project_root, "visualizer_data_2026_27.json")
    out_master = os.path.join(project_root, "visualizer_data.json")

    with open(out_2026_27, "w") as f:
        json.dump(output_data, f, indent=2)

    with open(out_master, "w") as f:
        json.dump(output_data, f, indent=2)

    print(f"[+] Successfully wrote {out_2026_27} and {out_master}!")

    # Sync to SQLite database
    db_path = os.path.join(project_root, "fpl_data", "fpl_2026_27.db")
    if os.path.exists(os.path.dirname(db_path)):
        sync_sqlite(db_path, LEAGUE_ID, bootstrap, results, managers_meta, gameweeks_dict, player_gw_scores, max_gw, all_fixtures=all_fixtures, gw_live_stats=gw_live_stats)

if __name__ == "__main__":
    main()

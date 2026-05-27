# FPL Gameweek Data Collector

A Python utility to collect and export Fantasy Premier League (FPL) mini-league data from the client-side API of [fplgameweek.com](https://www.fplgameweek.com/).

It extracts:
1. **Standings Table**: Ranks, manager names, team names, gameweek points/hits, total points, overall ranks, chips played, and transfers made.
2. **Lineups Data**: A complete list of player selections for every team in the league, showing their positions, club, gameweek points, captain/vice-captain status, starting status, and sub details.

---

## Getting Started

### Prerequisites

You need Python 3 and the `requests` library.

```bash
pip install requests
```

### Usage

Run the script by passing the URL of the league page:

```bash
python3 fpl_collector.py "https://www.fplgameweek.com/#/25/team/2613587/league/496563"
```

### Options

* `-o`, `--output-dir` : Specify a directory to save CSV/JSON outputs (defaults to `.`).
* `--json`             : Save the raw API JSON response.
* `--standings-only`   : Speed up data collection by only fetching standings without querying player lineups for all managers.

---

## Generated Files (Gameweek 1 - 38 of 26/27 season)

The following example files were successfully generated for your league (**Blue Square**):

1. **[standings_gw25.csv](file:///Users/hoffmann19/projects/fpl/standings_gw25.csv)**: Detailed standing statistics.
2. **[lineups_gw25.csv](file:///Users/hoffmann19/projects/fpl/lineups_gw25.csv)**: Full player selections for all 13 teams (195 player records).


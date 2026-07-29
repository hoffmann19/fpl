import os
import json

def main():
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    report_json_path = os.path.join(project_dir, "fpl_powerbi_project", "fpl_report.Report", "report.json")
    
    if not os.path.exists(report_json_path):
        print(f"Error: {report_json_path} does not exist! Please save the report in Power BI Desktop first.")
        return

    with open(report_json_path, 'r', encoding='utf-8') as f:
        report_data = json.load(f)
        
    if "sections" not in report_data or len(report_data["sections"]) == 0:
        print("Error: No sections (pages) found in report.json.")
        return
        
    # Get the existing section name (so we keep the GUID created by PBI Desktop for Section 1)
    section_name_1 = report_data["sections"][0]["name"]
    
    # -------------------------------------------------------------
    # PAGE 1: FPL Title Race
    # -------------------------------------------------------------
    v2_config = {
        "name": "StandingsTable",
        "layouts": [
            {
                "id": 0,
                "position": {
                    "x": 20.00,
                    "y": 20.00,
                    "width": 450.00,
                    "height": 660.00,
                    "z": 1
                }
            }
        ],
        "singleVisual": {
            "visualType": "tableEx",
            "projections": {
                "Values": [
                    {"queryRef": "master_standings.Gameweek"},
                    {"queryRef": "master_standings.Manager Name"},
                    {"queryRef": "master_standings.Team Name"},
                    {"queryRef": "master_standings.GW Points"},
                    {"queryRef": "master_standings.Overall Points"},
                    {"queryRef": "master_standings.Avg Overall Rank"}
                ]
            },
            "prototypeQuery": {
                "Version": 2,
                "From": [{"Name": "m", "Entity": "master_standings", "Type": 0}],
                "Select": [
                    {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Gameweek"}, "Name": "master_standings.Gameweek"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Manager Name"}, "Name": "master_standings.Manager Name"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Team Name"}, "Name": "master_standings.Team Name"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "GW Points"}, "Name": "master_standings.GW Points"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Overall Points"}, "Name": "master_standings.Overall Points"},
                    {"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Avg Overall Rank"}, "Name": "master_standings.Avg Overall Rank"}
                ]
            },
            "drillFilterOtherVisuals": True
        }
    }
    
    v3_config = {
        "name": "RankLineChart",
        "layouts": [
            {
                "id": 0,
                "position": {
                    "x": 490.00,
                    "y": 20.00,
                    "width": 770.00,
                    "height": 310.00,
                    "z": 2
                }
            }
        ],
        "singleVisual": {
            "visualType": "lineChart",
            "projections": {
                "Category": [
                    {"queryRef": "master_standings.Gameweek"}
                ],
                "Series": [
                    {"queryRef": "master_standings.Manager Name"}
                ],
                "Y": [
                    {"queryRef": "master_standings.Avg Overall Rank"}
                ]
            },
            "prototypeQuery": {
                "Version": 2,
                "From": [{"Name": "m", "Entity": "master_standings", "Type": 0}],
                "Select": [
                    {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Gameweek"}, "Name": "master_standings.Gameweek"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Manager Name"}, "Name": "master_standings.Manager Name"},
                    {"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Avg Overall Rank"}, "Name": "master_standings.Avg Overall Rank"}
                ]
            },
            "drillFilterOtherVisuals": True
        }
    }
    
    v4_config = {
        "name": "ValueLineChart",
        "layouts": [
            {
                "id": 0,
                "position": {
                    "x": 490.00,
                    "y": 370.00,
                    "width": 770.00,
                    "height": 310.00,
                    "z": 3
                }
            }
        ],
        "singleVisual": {
            "visualType": "lineChart",
            "projections": {
                "Category": [
                    {"queryRef": "master_standings.Gameweek"}
                ],
                "Series": [
                    {"queryRef": "master_standings.Manager Name"}
                ],
                "Y": [
                    {"queryRef": "master_standings.Avg Team Value"}
                ]
            },
            "prototypeQuery": {
                "Version": 2,
                "From": [{"Name": "m", "Entity": "master_standings", "Type": 0}],
                "Select": [
                    {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Gameweek"}, "Name": "master_standings.Gameweek"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Manager Name"}, "Name": "master_standings.Manager Name"},
                    {"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Avg Team Value"}, "Name": "master_standings.Avg Team Value"}
                ]
            },
            "drillFilterOtherVisuals": True
        }
    }
    
    section1 = {
        "config": "{}",
        "displayName": "FPL Title Race",
        "displayOption": 1,
        "filters": "[]",
        "height": 720.0,
        "width": 1280.0,
        "name": section_name_1,
        "visualContainers": [
            {
                "config": json.dumps(v2_config),
                "height": 660.00,
                "width": 450.00,
                "x": 20.00,
                "y": 20.00,
                "z": 1.00
            },
            {
                "config": json.dumps(v3_config),
                "height": 310.00,
                "width": 770.00,
                "x": 490.00,
                "y": 20.00,
                "z": 2.00
            },
            {
                "config": json.dumps(v4_config),
                "height": 310.00,
                "width": 770.00,
                "x": 490.00,
                "y": 370.00,
                "z": 3.00
            }
        ]
    }
    
    # -------------------------------------------------------------
    # PAGE 2: Squads & Captains
    # -------------------------------------------------------------
    v2_1_config = {
        "name": "CaptaincyPointsChart",
        "layouts": [
            {
                "id": 0,
                "position": {
                    "x": 20.00,
                    "y": 20.00,
                    "width": 600.00,
                    "height": 310.00,
                    "z": 1
                }
            }
        ],
        "singleVisual": {
            "visualType": "barChart",
            "projections": {
                "Category": [
                    {"queryRef": "master_lineups.Manager Name"}
                ],
                "Y": [
                    {"queryRef": "master_lineups.Captain Points (Doubled)"}
                ]
            },
            "prototypeQuery": {
                "Version": 2,
                "From": [{"Name": "m", "Entity": "master_lineups", "Type": 0}],
                "Select": [
                    {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Manager Name"}, "Name": "master_lineups.Manager Name"},
                    {"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Captain Points (Doubled)"}, "Name": "master_lineups.Captain Points (Doubled)"}
                ]
            },
            "drillFilterOtherVisuals": True
        }
    }
    
    v2_2_config = {
        "name": "PointsByPositionChart",
        "layouts": [
            {
                "id": 0,
                "position": {
                    "x": 660.00,
                    "y": 20.00,
                    "width": 600.00,
                    "height": 310.00,
                    "z": 2
                }
            }
        ],
        "singleVisual": {
            "visualType": "barChart",
            "projections": {
                "Category": [
                    {"queryRef": "master_lineups.Position"}
                ],
                "Y": [
                    {"queryRef": "master_lineups.Starting Points Contributed"}
                ]
            },
            "prototypeQuery": {
                "Version": 2,
                "From": [{"Name": "m", "Entity": "master_lineups", "Type": 0}],
                "Select": [
                    {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Position"}, "Name": "master_lineups.Position"},
                    {"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Starting Points Contributed"}, "Name": "master_lineups.Starting Points Contributed"}
                ]
            },
            "drillFilterOtherVisuals": True
        }
    }
    
    v2_3_config = {
        "name": "PlayersTable",
        "layouts": [
            {
                "id": 0,
                "position": {
                    "x": 20.00,
                    "y": 370.00,
                    "width": 1240.00,
                    "height": 310.00,
                    "z": 3
                }
            }
        ],
        "singleVisual": {
            "visualType": "tableEx",
            "projections": {
                "Values": [
                    {"queryRef": "fpl_players.full_name"},
                    {"queryRef": "fpl_players.team"},
                    {"queryRef": "fpl_players.position"},
                    {"queryRef": "fpl_players.points_25_26"},
                    {"queryRef": "fpl_players.selected_by_percent"}
                ]
            },
            "prototypeQuery": {
                "Version": 2,
                "From": [{"Name": "p", "Entity": "fpl_players", "Type": 0}],
                "Select": [
                    {"Column": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "full_name"}, "Name": "fpl_players.full_name"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "team"}, "Name": "fpl_players.team"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "position"}, "Name": "fpl_players.position"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "points_25_26"}, "Name": "fpl_players.points_25_26"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "selected_by_percent"}, "Name": "fpl_players.selected_by_percent"}
                ]
            },
            "drillFilterOtherVisuals": True
        }
    }
    
    section2 = {
        "config": "{}",
        "displayName": "Squads & Captains",
        "displayOption": 1,
        "filters": "[]",
        "height": 720.0,
        "width": 1280.0,
        "name": "SquadsCaptainsPage",
        "visualContainers": [
            {
                "config": json.dumps(v2_1_config),
                "height": 310.00,
                "width": 600.00,
                "x": 20.00,
                "y": 20.00,
                "z": 1.00
            },
            {
                "config": json.dumps(v2_2_config),
                "height": 310.00,
                "width": 600.00,
                "x": 660.00,
                "y": 20.00,
                "z": 2.00
            },
            {
                "config": json.dumps(v2_3_config),
                "height": 310.00,
                "width": 1240.00,
                "x": 20.00,
                "y": 370.00,
                "z": 3.00
            }
        ]
    }
    
    # -------------------------------------------------------------
    # PAGE 3: Fixtures & FDR
    # -------------------------------------------------------------
    v3_1_config = {
        "name": "TeamsRatingTable",
        "layouts": [
            {
                "id": 0,
                "position": {
                    "x": 20.00,
                    "y": 20.00,
                    "width": 600.00,
                    "height": 660.00,
                    "z": 1
                }
            }
        ],
        "singleVisual": {
            "visualType": "tableEx",
            "projections": {
                "Values": [
                    {"queryRef": "fpl_teams_ratings.name"},
                    {"queryRef": "fpl_teams_ratings.short_name"},
                    {"queryRef": "fpl_teams_ratings.strength"},
                    {"queryRef": "fpl_teams_ratings.strength_overall_home"},
                    {"queryRef": "fpl_teams_ratings.strength_overall_away"}
                ]
            },
            "prototypeQuery": {
                "Version": 2,
                "From": [{"Name": "t", "Entity": "fpl_teams_ratings", "Type": 0}],
                "Select": [
                    {"Column": {"Expression": {"SourceRef": {"Source": "t"}}, "Property": "name"}, "Name": "fpl_teams_ratings.name"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "t"}}, "Property": "short_name"}, "Name": "fpl_teams_ratings.short_name"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "t"}}, "Property": "strength"}, "Name": "fpl_teams_ratings.strength"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "t"}}, "Property": "strength_overall_home"}, "Name": "fpl_teams_ratings.strength_overall_home"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "t"}}, "Property": "strength_overall_away"}, "Name": "fpl_teams_ratings.strength_overall_away"}
                ]
            },
            "drillFilterOtherVisuals": True
        }
    }
    
    v3_2_config = {
        "name": "FixturesTable",
        "layouts": [
            {
                "id": 0,
                "position": {
                    "x": 640.00,
                    "y": 20.00,
                    "width": 620.00,
                    "height": 660.00,
                    "z": 2
                }
            }
        ],
        "singleVisual": {
            "visualType": "tableEx",
            "projections": {
                "Values": [
                    {"queryRef": "fpl_fixtures.event"},
                    {"queryRef": "fpl_fixtures.home_team"},
                    {"queryRef": "fpl_fixtures.away_team"},
                    {"queryRef": "fpl_fixtures.home_difficulty"},
                    {"queryRef": "fpl_fixtures.away_difficulty"}
                ]
            },
            "prototypeQuery": {
                "Version": 2,
                "From": [{"Name": "f", "Entity": "fpl_fixtures", "Type": 0}],
                "Select": [
                    {"Column": {"Expression": {"SourceRef": {"Source": "f"}}, "Property": "event"}, "Name": "fpl_fixtures.event"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "f"}}, "Property": "home_team"}, "Name": "fpl_fixtures.home_team"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "f"}}, "Property": "away_team"}, "Name": "fpl_fixtures.away_team"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "f"}}, "Property": "home_difficulty"}, "Name": "fpl_fixtures.home_difficulty"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "f"}}, "Property": "away_difficulty"}, "Name": "fpl_fixtures.away_difficulty"}
                ]
            },
            "drillFilterOtherVisuals": True
        }
    }
    
    section3 = {
        "config": "{}",
        "displayName": "Fixtures & Teams",
        "displayOption": 1,
        "filters": "[]",
        "height": 720.0,
        "width": 1280.0,
        "name": "FixturesTeamsPage",
        "visualContainers": [
            {
                "config": json.dumps(v3_1_config),
                "height": 660.00,
                "width": 600.00,
                "x": 20.00,
                "y": 20.00,
                "z": 1.00
            },
            {
                "config": json.dumps(v3_2_config),
                "height": 660.00,
                "width": 620.00,
                "x": 640.00,
                "y": 20.00,
                "z": 2.00
            }
        ]
    }
    
    # -------------------------------------------------------------
    # PAGE 4: Most Expensive Players
    # -------------------------------------------------------------
    v4_1_config = {
        "name": "ExpensivePlayersChart",
        "layouts": [
            {
                "id": 0,
                "position": {
                    "x": 20.00,
                    "y": 20.00,
                    "width": 1240.00,
                    "height": 660.00,
                    "z": 1
                }
            }
        ],
        "singleVisual": {
            "visualType": "barChart",
            "projections": {
                "Category": [
                    {"queryRef": "fpl_players.full_name"}
                ],
                "Y": [
                    {"queryRef": "fpl_players.cost_26_27_m"}
                ]
            },
            "prototypeQuery": {
                "Version": 2,
                "From": [{"Name": "p", "Entity": "fpl_players", "Type": 0}],
                "Select": [
                    {"Column": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "full_name"}, "Name": "fpl_players.full_name"},
                    {"Column": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "cost_26_27_m"}, "Name": "fpl_players.cost_26_27_m"}
                ],
                "OrderBy": [
                    {
                        "Expression": {"Column": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "cost_26_27_m"}},
                        "Direction": 2
                    }
                ]
            },
            "drillFilterOtherVisuals": True
        }
    }
    
    section4 = {
        "config": "{}",
        "displayName": "Most Expensive Players",
        "displayOption": 1,
        "filters": "[]",
        "height": 720.0,
        "width": 1280.0,
        "name": "ExpensivePlayersPage",
        "visualContainers": [
            {
                "config": json.dumps(v4_1_config),
                "height": 660.00,
                "width": 1240.00,
                "x": 20.00,
                "y": 20.00,
                "z": 1.00
            }
        ]
    }
    
    # Overwrite the report sections list
    report_data["sections"] = [section1, section2, section3, section4]
    
    with open(report_json_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, indent=2)
        
    print("Power BI report.json successfully populated with multiple tabs!")

if __name__ == "__main__":
    main()

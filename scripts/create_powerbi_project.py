import os
import json

def generate_model_bim(fpl_data_dir):
    # Standardize paths to use forward slashes for Power Query M expression compatibility
    fpl_data_dir_clean = fpl_data_dir.replace("\\", "/")
    
    standings_path = f"{fpl_data_dir_clean}/master_standings.csv"
    lineups_path = f"{fpl_data_dir_clean}/master_lineups.csv"
    players_path = f"{fpl_data_dir_clean}/fpl_players_2025_26_vs_2026_27.csv"
    fixtures_path = f"{fpl_data_dir_clean}/fpl_fixtures_2026_27.csv"
    teams_path = f"{fpl_data_dir_clean}/fpl_teams_ratings.csv"

    model = {
        "name": "FplSemanticModel",
        "compatibilityLevel": 1570,
        "model": {
            "culture": "en-US",
            "defaultPowerBIDataSourceVersion": "powerBI_V3",
            "sourceQueryCulture": "en-US",
            "tables": [
                {
                    "name": "master_standings",
                    "columns": [
                        {"name": "Gameweek", "dataType": "int64", "sourceColumn": "Gameweek"},
                        {"name": "Rank", "dataType": "int64", "sourceColumn": "Rank"},
                        {"name": "Team Name", "dataType": "string", "sourceColumn": "Team Name"},
                        {"name": "Manager Name", "dataType": "string", "sourceColumn": "Manager Name"},
                        {"name": "GW Points", "dataType": "int64", "sourceColumn": "GW Points"},
                        {"name": "GW Hits", "dataType": "int64", "sourceColumn": "GW Hits"},
                        {"name": "GW Net Points", "dataType": "int64", "sourceColumn": "GW Net Points"},
                        {"name": "Overall Points", "dataType": "int64", "sourceColumn": "Overall Points"},
                        {"name": "Overall Rank", "dataType": "int64", "sourceColumn": "Overall Rank"},
                        {"name": "Chip Played", "dataType": "string", "sourceColumn": "Chip Played"},
                        {"name": "Transfers Made", "dataType": "int64", "sourceColumn": "Transfers Made"},
                        {"name": "Team Value", "dataType": "double", "sourceColumn": "Team Value"},
                        {"name": "Bank", "dataType": "double", "sourceColumn": "Bank"},
                        {"name": "Manager_GW_Key", "dataType": "string", "sourceColumn": "Manager_GW_Key"}
                    ],
                    "partitions": [
                        {
                            "name": "Partition",
                            "source": {
                                "type": "m",
                                "expression": (
                                    f'let\n'
                                    f'    Source = Csv.Document(File.Contents("{standings_path}"),[Delimiter=",", Columns=13, Encoding=65001, QuoteStyle=QuoteStyle.None]),\n'
                                    f'    #"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalarTypes=true]),\n'
                                    f'    #"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers",{{\n'
                                    f'        {{"Gameweek", Int64.Type}}, {{"Rank", Int64.Type}}, {{"Team Name", type text}}, {{"Manager Name", type text}},\n'
                                    f'        {{"GW Points", Int64.Type}}, {{"GW Hits", Int64.Type}}, {{"GW Net Points", Int64.Type}},\n'
                                    f'        {{"Overall Points", Int64.Type}}, {{"Overall Rank", Int64.Type}}, {{"Chip Played", type text}},\n'
                                    f'        {{"Transfers Made", Int64.Type}}, {{"Team Value", type number}}, {{"Bank", type number}}\n'
                                    f'    }}),\n'
                                    f'    #"Added Key" = Table.AddColumn(#"Changed Type", "Manager_GW_Key", each [Manager Name] & "-" & Text.From([Gameweek]), type text)\n'
                                    f'in\n'
                                    f'    #"Added Key"'
                                )
                            }
                        }
                    ],
                    "measures": [
                        {
                            "name": "Total Transfers Made",
                            "expression": "SUM(master_standings[Transfers Made])",
                            "formatString": "#,0"
                        },
                        {
                            "name": "Total Transfer Hits Cost",
                            "expression": "SUM(master_standings[GW Hits])",
                            "formatString": "#,0"
                        },
                        {
                            "name": "Avg Overall Rank",
                            "expression": "AVERAGE(master_standings[Overall Rank])",
                            "formatString": "#,0"
                        },
                        {
                            "name": "Avg Team Value",
                            "expression": "AVERAGE(master_standings[Team Value])",
                            "formatString": "$#,0.00"
                        }
                    ]
                },
                {
                    "name": "master_lineups",
                    "columns": [
                        {"name": "Gameweek", "dataType": "int64", "sourceColumn": "Gameweek"},
                        {"name": "Manager Name", "dataType": "string", "sourceColumn": "Manager Name"},
                        {"name": "Team Name", "dataType": "string", "sourceColumn": "Team Name"},
                        {"name": "Player Name", "dataType": "string", "sourceColumn": "Player Name"},
                        {"name": "Club", "dataType": "string", "sourceColumn": "Club"},
                        {"name": "Position", "dataType": "string", "sourceColumn": "Position"},
                        {"name": "Points", "dataType": "int64", "sourceColumn": "Points"},
                        {"name": "Captain", "dataType": "boolean", "sourceColumn": "Captain"},
                        {"name": "Vice Captain", "dataType": "boolean", "sourceColumn": "Vice Captain"},
                        {"name": "Is Starting", "dataType": "boolean", "sourceColumn": "Is Starting"},
                        {"name": "Subbed In", "dataType": "boolean", "sourceColumn": "Subbed In"},
                        {"name": "Subbed Out", "dataType": "boolean", "sourceColumn": "Subbed Out"},
                        {"name": "Manager_GW_Key", "dataType": "string", "sourceColumn": "Manager_GW_Key"},
                        {"name": "Player_Team_Key", "dataType": "string", "sourceColumn": "Player_Team_Key"}
                    ],
                    "partitions": [
                        {
                            "name": "Partition",
                            "source": {
                                "type": "m",
                                "expression": (
                                    f'let\n'
                                    f'    Source = Csv.Document(File.Contents("{lineups_path}"),[Delimiter=",", Columns=12, Encoding=65001, QuoteStyle=QuoteStyle.None]),\n'
                                    f'    #"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalarTypes=true]),\n'
                                    f'    #"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers",{{\n'
                                    f'        {{"Gameweek", Int64.Type}}, {{"Manager Name", type text}}, {{"Team Name", type text}}, {{"Player Name", type text}},\n'
                                    f'        {{"Club", type text}}, {{"Position", type text}}, {{"Points", Int64.Type}},\n'
                                    f'        {{"Captain", type logical}}, {{"Vice Captain", type logical}}, {{"Is Starting", type logical}},\n'
                                    f'        {{"Subbed In", type logical}}, {{"Subbed Out", type logical}}\n'
                                    f'    }}),\n'
                                    f'    #"Added Key" = Table.AddColumn(#"Changed Type", "Manager_GW_Key", each [Manager Name] & "-" & Text.From([Gameweek]), type text),\n'
                                    f'    #"Added Team Name" = Table.AddColumn(#"Added Key", "Full_Team_Name", each\n'
                                    f'        if [Club] = "ARS" then "Arsenal"\n'
                                    f'        else if [Club] = "AVL" then "Aston Villa"\n'
                                    f'        else if [Club] = "BOU" then "Bournemouth"\n'
                                    f'        else if [Club] = "BRE" then "Brentford"\n'
                                    f'        else if [Club] = "BHA" then "Brighton"\n'
                                    f'        else if [Club] = "CHE" then "Chelsea"\n'
                                    f'        else if [Club] = "COV" then "Coventry City"\n'
                                    f'        else if [Club] = "CRY" then "Crystal Palace"\n'
                                    f'        else if [Club] = "EVE" then "Everton"\n'
                                    f'        else if [Club] = "FUL" then "Fulham"\n'
                                    f'        else if [Club] = "HUL" then "Hull City"\n'
                                    f'        else if [Club] = "IPS" then "Ipswich Town"\n'
                                    f'        else if [Club] = "LEE" then "Leeds"\n'
                                    f'        else if [Club] = "LIV" then "Liverpool"\n'
                                    f'        else if [Club] = "MCI" then "Man City"\n'
                                    f'        else if [Club] = "MUN" then "Man Utd"\n'
                                    f'        else if [Club] = "NEW" then "Newcastle"\n'
                                    f'        else if [Club] = "NFO" then "Nott\'m Forest"\n'
                                    f'        else if [Club] = "TOT" then "Spurs"\n'
                                    f'        else if [Club] = "SUN" then "Sunderland"\n'
                                    f'        else if [Club] = "BUR" then "Burnley"\n'
                                    f'        else if [Club] = "WHU" then "West Ham"\n'
                                    f'        else if [Club] = "WOL" then "Wolves"\n'
                                    f'        else [Club], type text),\n'
                                    f'    #"Added Player Key" = Table.AddColumn(#"Added Team Name", "Player_Team_Key", each [Player Name] & "-" & [Full_Team_Name], type text)\n'
                                    f'in\n'
                                    f'    #"Added Player Key"'
                                )
                            }
                        }
                    ],
                    "measures": [
                        {
                            "name": "Starting Points Contributed",
                            "expression": "CALCULATE(SUM(master_lineups[Points]), master_lineups[Is Starting] = TRUE())",
                            "formatString": "#,0"
                        },
                        {
                            "name": "Captain Points (Doubled)",
                            "expression": "CALCULATE(SUM(master_lineups[Points]) * 2, master_lineups[Captain] = TRUE())",
                            "formatString": "#,0"
                        },
                        {
                            "name": "Captain Points Contribution",
                            "expression": "CALCULATE(SUM(master_lineups[Points]), master_lineups[Captain] = TRUE())",
                            "formatString": "#,0"
                        }
                    ]
                },
                {
                    "name": "fpl_players",
                    "columns": [
                        {"name": "id", "dataType": "int64", "sourceColumn": "id"},
                        {"name": "web_name", "dataType": "string", "sourceColumn": "web_name"},
                        {"name": "full_name", "dataType": "string", "sourceColumn": "full_name"},
                        {"name": "team", "dataType": "string", "sourceColumn": "team"},
                        {"name": "position", "dataType": "string", "sourceColumn": "position"},
                        {"name": "cost_26_27_m", "dataType": "double", "sourceColumn": "cost_26_27_m"},
                        {"name": "cost_25_26_start_m", "dataType": "double", "sourceColumn": "cost_25_26_start_m"},
                        {"name": "cost_25_26_end_m", "dataType": "double", "sourceColumn": "cost_25_26_end_m"},
                        {"name": "cost_25_26_season_change_m", "dataType": "double", "sourceColumn": "cost_25_26_season_change_m"},
                        {"name": "price_change_yoy_m", "dataType": "double", "sourceColumn": "price_change_yoy_m"},
                        {"name": "selected_by_percent", "dataType": "double", "sourceColumn": "selected_by_percent"},
                        {"name": "points_25_26", "dataType": "int64", "sourceColumn": "points_25_26"},
                        {"name": "minutes_25_26", "dataType": "int64", "sourceColumn": "minutes_25_26"},
                        {"name": "minutes_26_27", "dataType": "int64", "sourceColumn": "minutes_26_27"},
                        {"name": "minutes_diff", "dataType": "int64", "sourceColumn": "minutes_diff"},
                        {"name": "goals_25_26", "dataType": "int64", "sourceColumn": "goals_25_26"},
                        {"name": "assists_25_26", "dataType": "int64", "sourceColumn": "assists_25_26"},
                        {"name": "Player_Team_Key", "dataType": "string", "sourceColumn": "Player_Team_Key"}
                    ],
                    "partitions": [
                        {
                            "name": "Partition",
                            "source": {
                                "type": "m",
                                "expression": (
                                    f'let\n'
                                    f'    Source = Csv.Document(File.Contents("{players_path}"),[Delimiter=",", Columns=17, Encoding=65001, QuoteStyle=QuoteStyle.None]),\n'
                                    f'    #"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalarTypes=true]),\n'
                                    f'    #"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers",{{\n'
                                    f'        {{"id", Int64.Type}}, {{"web_name", type text}}, {{"full_name", type text}}, {{"team", type text}},\n'
                                    f'        {{"position", type text}}, {{"cost_26_27_m", type number}}, {{"cost_25_26_start_m", type number}},\n'
                                    f'        {{"cost_25_26_end_m", type number}}, {{"cost_25_26_season_change_m", type number}},\n'
                                    f'        {{"price_change_yoy_m", type number}}, {{"selected_by_percent", type number}},\n'
                                    f'        {{"points_25_26", Int64.Type}}, {{"minutes_25_26", Int64.Type}},\n'
                                    f'        {{"minutes_26_27", Int64.Type}}, {{"minutes_diff", Int64.Type}},\n'
                                    f'        {{"goals_25_26", Int64.Type}}, {{"assists_25_26", Int64.Type}}\n'
                                    f'    }}),\n'
                                    f'    #"Added Player Key" = Table.AddColumn(#"Changed Type", "Player_Team_Key", each [web_name] & "-" & [team], type text)\n'
                                    f'in\n'
                                    f'    #"Added Player Key"'
                                )
                            }
                        }
                    ]
                },
                {
                    "name": "fpl_fixtures",
                    "columns": [
                        {"name": "id", "dataType": "int64", "sourceColumn": "id"},
                        {"name": "event", "dataType": "int64", "sourceColumn": "event"},
                        {"name": "kickoff_time", "dataType": "string", "sourceColumn": "kickoff_time"},
                        {"name": "finished", "dataType": "int64", "sourceColumn": "finished"},
                        {"name": "home_team_id", "dataType": "int64", "sourceColumn": "home_team_id"},
                        {"name": "home_team", "dataType": "string", "sourceColumn": "home_team"},
                        {"name": "home_team_short", "dataType": "string", "sourceColumn": "home_team_short"},
                        {"name": "away_team_id", "dataType": "int64", "sourceColumn": "away_team_id"},
                        {"name": "away_team", "dataType": "string", "sourceColumn": "away_team"},
                        {"name": "away_team_short", "dataType": "string", "sourceColumn": "away_team_short"},
                        {"name": "home_difficulty", "dataType": "int64", "sourceColumn": "home_difficulty"},
                        {"name": "away_difficulty", "dataType": "int64", "sourceColumn": "away_difficulty"},
                        {"name": "home_score", "dataType": "int64", "sourceColumn": "home_score"},
                        {"name": "away_score", "dataType": "int64", "sourceColumn": "away_score"}
                    ],
                    "partitions": [
                        {
                            "name": "Partition",
                            "source": {
                                "type": "m",
                                "expression": (
                                    f'let\n'
                                    f'    Source = Csv.Document(File.Contents("{fixtures_path}"),[Delimiter=",", Columns=14, Encoding=65001, QuoteStyle=QuoteStyle.None]),\n'
                                    f'    #"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalarTypes=true]),\n'
                                    f'    #"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers",{{\n'
                                    f'        {{"id", Int64.Type}}, {{"event", Int64.Type}}, {{"kickoff_time", type text}}, {{"finished", Int64.Type}},\n'
                                    f'        {{"home_team_id", Int64.Type}}, {{"home_team", type text}}, {{"home_team_short", type text}},\n'
                                    f'        {{"away_team_id", Int64.Type}}, {{"away_team", type text}}, {{"away_team_short", type text}},\n'
                                    f'        {{"home_difficulty", Int64.Type}}, {{"away_difficulty", Int64.Type}},\n'
                                    f'        {{"home_score", Int64.Type}}, {{"away_score", Int64.Type}}\n'
                                    f'    }})\n'
                                    f'in\n'
                                    f'    #"Changed Type"'
                                )
                            }
                        }
                    ]
                },
                {
                    "name": "fpl_teams_ratings",
                    "columns": [
                        {"name": "id", "dataType": "int64", "sourceColumn": "id"},
                        {"name": "name", "dataType": "string", "sourceColumn": "name"},
                        {"name": "short_name", "dataType": "string", "sourceColumn": "short_name"},
                        {"name": "strength", "dataType": "int64", "sourceColumn": "strength"},
                        {"name": "strength_overall_home", "dataType": "int64", "sourceColumn": "strength_overall_home"},
                        {"name": "strength_overall_away", "dataType": "int64", "sourceColumn": "strength_overall_away"},
                        {"name": "strength_attack_home", "dataType": "int64", "sourceColumn": "strength_attack_home"},
                        {"name": "strength_attack_away", "dataType": "int64", "sourceColumn": "strength_attack_away"},
                        {"name": "strength_defence_home", "dataType": "int64", "sourceColumn": "strength_defence_home"},
                        {"name": "strength_defence_away", "dataType": "int64", "sourceColumn": "strength_defence_away"}
                    ],
                    "partitions": [
                        {
                            "name": "Partition",
                            "source": {
                                "type": "m",
                                "expression": (
                                    f'let\n'
                                    f'    Source = Csv.Document(File.Contents("{teams_path}"),[Delimiter=",", Columns=10, Encoding=65001, QuoteStyle=QuoteStyle.None]),\n'
                                    f'    #"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalarTypes=true]),\n'
                                    f'    #"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers",{{\n'
                                    f'        {{"id", Int64.Type}}, {{"name", type text}}, {{"short_name", type text}}, {{"strength", Int64.Type}},\n'
                                    f'        {{"strength_overall_home", Int64.Type}}, {{"strength_overall_away", Int64.Type}},\n'
                                    f'        {{"strength_attack_home", Int64.Type}}, {{"strength_attack_away", Int64.Type}},\n'
                                    f'        {{"strength_defence_home", Int64.Type}}, {{"strength_defence_away", Int64.Type}}\n'
                                    f'    }})\n'
                                    f'in\n'
                                    f'    #"Changed Type"'
                                )
                            }
                        }
                    ]
                }
            ],
            "relationships": [
                {
                    "name": "Relationship_Standings_Lineups",
                    "fromTable": "master_lineups",
                    "fromColumn": "Manager_GW_Key",
                    "toTable": "master_standings",
                    "toColumn": "Manager_GW_Key"
                },
                {
                    "name": "Relationship_Lineups_Players",
                    "fromTable": "master_lineups",
                    "fromColumn": "Player_Team_Key",
                    "toTable": "fpl_players",
                    "toColumn": "Player_Team_Key",
                    "crossFilteringBehavior": "bothDirections"
                },
                {
                    "name": "Relationship_Fixtures_Home_Teams",
                    "fromTable": "fpl_fixtures",
                    "fromColumn": "home_team",
                    "toTable": "fpl_teams_ratings",
                    "toColumn": "name"
                }
            ]
        }
    }
    return model

def main():
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    fpl_data_dir = os.path.join(project_dir, "fpl_data")
    
    # Define folder structure
    pbi_project_dir = os.path.join(project_dir, "fpl_powerbi_project")
    report_dir = os.path.join(pbi_project_dir, "fpl_report.Report")
    model_dir = os.path.join(pbi_project_dir, "fpl_report.SemanticModel")
    
    os.makedirs(report_dir, exist_ok=True)
    os.makedirs(model_dir, exist_ok=True)
    
    # 1. Create fpl_report.pbip
    pbip_content = {
        "version": "1.0",
        "artifacts": [
            {
                "report": {
                    "path": "fpl_report.Report"
                }
            }
        ],
        "settings": {
            "enableAutoRecovery": True
        }
    }
    
    with open(os.path.join(pbi_project_dir, "fpl_report.pbip"), "w", encoding="utf-8") as f:
        json.dump(pbip_content, f, indent=4)
        
    # 2. Create definition.pbir
    pbir_content = {
        "version": "1.0",
        "datasetReference": {
            "byPath": {
                "path": "../fpl_report.SemanticModel"
            }
        }
    }
    with open(os.path.join(report_dir, "definition.pbir"), "w", encoding="utf-8") as f:
        json.dump(pbir_content, f, indent=4)
        
    # 3. Create model.bim
    model_bim = generate_model_bim(fpl_data_dir)
    with open(os.path.join(model_dir, "model.bim"), "w", encoding="utf-8") as f:
        json.dump(model_bim, f, indent=4)
        
    # 4. Create definition.pbism
    pbism_content = {
        "version": "1.0",
        "settings": {}
    }
    with open(os.path.join(model_dir, "definition.pbism"), "w", encoding="utf-8") as f:
        json.dump(pbism_content, f, indent=4)
        
    print(f"Power BI Project (.pbip) successfully created at: {pbi_project_dir}")

if __name__ == "__main__":
    main()

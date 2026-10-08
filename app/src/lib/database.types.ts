// Generiert aus dem Datenbankschema (supabase/tests/gen_types.py) – nicht von Hand ändern.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          entity: string
          entity_id: string | null
          action: string
          before: Json | null
          after: Json | null
          at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          entity: string
          entity_id?: string | null
          action: string
          before?: Json | null
          after?: Json | null
          at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          entity?: string
          entity_id?: string | null
          action?: string
          before?: Json | null
          after?: Json | null
          at?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          id: string
          name: string
          short_name: string
          logo_url: string | null
          primary_color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          short_name: string
          logo_url?: string | null
          primary_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          short_name?: string
          logo_url?: string | null
          primary_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      competitions: {
        Row: {
          id: string
          slug: string
          name: string
          short_name: string | null
          organizer: string | null
          logo_url: string | null
          description: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          short_name?: string | null
          organizer?: string | null
          logo_url?: string | null
          description?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          short_name?: string | null
          organizer?: string | null
          logo_url?: string | null
          description?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fantasy_league_members: {
        Row: {
          league_id: string
          fantasy_team_id: string
          joined_at: string
        }
        Insert: {
          league_id: string
          fantasy_team_id: string
          joined_at?: string
        }
        Update: {
          league_id?: string
          fantasy_team_id?: string
          joined_at?: string
        }
        Relationships: [
          { foreignKeyName: "fantasy_league_members_fantasy_team_id_fkey"; columns: ["fantasy_team_id"]; isOneToOne: false; referencedRelation: "fantasy_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_league_members_league_id_fkey"; columns: ["league_id"]; isOneToOne: false; referencedRelation: "fantasy_leagues"; referencedColumns: ["id"] }
        ]
      }
      fantasy_leagues: {
        Row: {
          id: string
          season_id: string
          owner_id: string
          name: string
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          owner_id: string
          name: string
          invite_code?: string
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          owner_id?: string
          name?: string
          invite_code?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "fantasy_leagues_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "fantasy_leagues_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] }
        ]
      }
      fantasy_lineup_players: {
        Row: {
          lineup_id: string
          season_player_id: string
          slot: Database["public"]["Enums"]["roster_slot"]
          slot_order: number
        }
        Insert: {
          lineup_id: string
          season_player_id: string
          slot: Database["public"]["Enums"]["roster_slot"]
          slot_order?: number
        }
        Update: {
          lineup_id?: string
          season_player_id?: string
          slot?: Database["public"]["Enums"]["roster_slot"]
          slot_order?: number
        }
        Relationships: [
          { foreignKeyName: "fantasy_lineup_players_lineup_id_fkey"; columns: ["lineup_id"]; isOneToOne: false; referencedRelation: "fantasy_lineups"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_lineup_players_season_player_id_fkey"; columns: ["season_player_id"]; isOneToOne: false; referencedRelation: "season_players"; referencedColumns: ["id"] }
        ]
      }
      fantasy_lineups: {
        Row: {
          id: string
          fantasy_team_id: string
          round_id: string
          captain_season_player_id: string | null
          locked_at: string
        }
        Insert: {
          id?: string
          fantasy_team_id: string
          round_id: string
          captain_season_player_id?: string | null
          locked_at?: string
        }
        Update: {
          id?: string
          fantasy_team_id?: string
          round_id?: string
          captain_season_player_id?: string | null
          locked_at?: string
        }
        Relationships: [
          { foreignKeyName: "fantasy_lineups_captain_season_player_id_fkey"; columns: ["captain_season_player_id"]; isOneToOne: false; referencedRelation: "season_players"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_lineups_fantasy_team_id_fkey"; columns: ["fantasy_team_id"]; isOneToOne: false; referencedRelation: "fantasy_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_lineups_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] }
        ]
      }
      fantasy_player_scores: {
        Row: {
          id: string
          round_id: string
          season_player_id: string
          scoring_version_id: string
          points: number
          details: Json
          status: Database["public"]["Enums"]["score_status"]
          computed_at: string
        }
        Insert: {
          id?: string
          round_id: string
          season_player_id: string
          scoring_version_id: string
          points?: number
          details?: Json
          status?: Database["public"]["Enums"]["score_status"]
          computed_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          season_player_id?: string
          scoring_version_id?: string
          points?: number
          details?: Json
          status?: Database["public"]["Enums"]["score_status"]
          computed_at?: string
        }
        Relationships: [
          { foreignKeyName: "fantasy_player_scores_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_player_scores_scoring_version_id_fkey"; columns: ["scoring_version_id"]; isOneToOne: false; referencedRelation: "scoring_rule_versions"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_player_scores_season_player_id_fkey"; columns: ["season_player_id"]; isOneToOne: false; referencedRelation: "season_players"; referencedColumns: ["id"] }
        ]
      }
      fantasy_rosters: {
        Row: {
          id: string
          fantasy_team_id: string
          season_player_id: string
          slot: Database["public"]["Enums"]["roster_slot"]
          slot_order: number
          price_paid_m: number
          acquired_round_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          fantasy_team_id: string
          season_player_id: string
          slot: Database["public"]["Enums"]["roster_slot"]
          slot_order?: number
          price_paid_m: number
          acquired_round_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          fantasy_team_id?: string
          season_player_id?: string
          slot?: Database["public"]["Enums"]["roster_slot"]
          slot_order?: number
          price_paid_m?: number
          acquired_round_id?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "fantasy_rosters_acquired_round_id_fkey"; columns: ["acquired_round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_rosters_fantasy_team_id_fkey"; columns: ["fantasy_team_id"]; isOneToOne: false; referencedRelation: "fantasy_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_rosters_season_player_id_fkey"; columns: ["season_player_id"]; isOneToOne: false; referencedRelation: "season_players"; referencedColumns: ["id"] }
        ]
      }
      fantasy_rounds: {
        Row: {
          id: string
          season_id: string
          number: number
          name: string
          deadline_at: string
          status: Database["public"]["Enums"]["round_status"]
          locked_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          season_id: string
          number: number
          name: string
          deadline_at: string
          status?: Database["public"]["Enums"]["round_status"]
          locked_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          number?: number
          name?: string
          deadline_at?: string
          status?: Database["public"]["Enums"]["round_status"]
          locked_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "fantasy_rounds_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] }
        ]
      }
      fantasy_team_scores: {
        Row: {
          id: string
          fantasy_team_id: string
          round_id: string
          lineup_id: string | null
          scoring_version_id: string | null
          base_points: number
          captain_bonus: number
          transfer_penalty: number
          total_points: number
          status: Database["public"]["Enums"]["score_status"]
          computed_at: string
        }
        Insert: {
          id?: string
          fantasy_team_id: string
          round_id: string
          lineup_id?: string | null
          scoring_version_id?: string | null
          base_points?: number
          captain_bonus?: number
          transfer_penalty?: number
          total_points?: number
          status?: Database["public"]["Enums"]["score_status"]
          computed_at?: string
        }
        Update: {
          id?: string
          fantasy_team_id?: string
          round_id?: string
          lineup_id?: string | null
          scoring_version_id?: string | null
          base_points?: number
          captain_bonus?: number
          transfer_penalty?: number
          total_points?: number
          status?: Database["public"]["Enums"]["score_status"]
          computed_at?: string
        }
        Relationships: [
          { foreignKeyName: "fantasy_team_scores_fantasy_team_id_fkey"; columns: ["fantasy_team_id"]; isOneToOne: false; referencedRelation: "fantasy_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_team_scores_lineup_id_fkey"; columns: ["lineup_id"]; isOneToOne: false; referencedRelation: "fantasy_lineups"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_team_scores_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_team_scores_scoring_version_id_fkey"; columns: ["scoring_version_id"]; isOneToOne: false; referencedRelation: "scoring_rule_versions"; referencedColumns: ["id"] }
        ]
      }
      fantasy_teams: {
        Row: {
          id: string
          user_id: string
          season_id: string
          name: string
          name_status: Database["public"]["Enums"]["name_status"]
          captain_season_player_id: string | null
          joined_round_id: string | null
          is_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          season_id: string
          name: string
          name_status?: Database["public"]["Enums"]["name_status"]
          captain_season_player_id?: string | null
          joined_round_id?: string | null
          is_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          season_id?: string
          name?: string
          name_status?: Database["public"]["Enums"]["name_status"]
          captain_season_player_id?: string | null
          joined_round_id?: string | null
          is_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "fantasy_teams_captain_season_player_id_fkey"; columns: ["captain_season_player_id"]; isOneToOne: false; referencedRelation: "season_players"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_teams_joined_round_id_fkey"; columns: ["joined_round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_teams_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_teams_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["user_id"] }
        ]
      }
      fantasy_transfers: {
        Row: {
          id: string
          fantasy_team_id: string
          round_id: string
          out_season_player_id: string | null
          in_season_player_id: string | null
          is_free: boolean
          penalty_points: number
          made_at: string
        }
        Insert: {
          id?: string
          fantasy_team_id: string
          round_id: string
          out_season_player_id?: string | null
          in_season_player_id?: string | null
          is_free?: boolean
          penalty_points?: number
          made_at?: string
        }
        Update: {
          id?: string
          fantasy_team_id?: string
          round_id?: string
          out_season_player_id?: string | null
          in_season_player_id?: string | null
          is_free?: boolean
          penalty_points?: number
          made_at?: string
        }
        Relationships: [
          { foreignKeyName: "fantasy_transfers_fantasy_team_id_fkey"; columns: ["fantasy_team_id"]; isOneToOne: false; referencedRelation: "fantasy_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_transfers_in_season_player_id_fkey"; columns: ["in_season_player_id"]; isOneToOne: false; referencedRelation: "season_players"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_transfers_out_season_player_id_fkey"; columns: ["out_season_player_id"]; isOneToOne: false; referencedRelation: "season_players"; referencedColumns: ["id"] },
          { foreignKeyName: "fantasy_transfers_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] }
        ]
      }
      import_audit_logs: {
        Row: {
          id: string
          import_id: string | null
          actor_id: string | null
          action: string
          details: Json
          at: string
        }
        Insert: {
          id?: string
          import_id?: string | null
          actor_id?: string | null
          action: string
          details?: Json
          at?: string
        }
        Update: {
          id?: string
          import_id?: string | null
          actor_id?: string | null
          action?: string
          details?: Json
          at?: string
        }
        Relationships: [
          { foreignKeyName: "import_audit_logs_import_id_fkey"; columns: ["import_id"]; isOneToOne: false; referencedRelation: "statistic_imports"; referencedColumns: ["id"] }
        ]
      }
      leaderboard_history: {
        Row: {
          season_id: string
          fantasy_team_id: string
          round_id: string
          round_number: number
          rank: number
          total_points: number
          round_points: number
        }
        Insert: {
          season_id: string
          fantasy_team_id: string
          round_id: string
          round_number: number
          rank: number
          total_points: number
          round_points: number
        }
        Update: {
          season_id?: string
          fantasy_team_id?: string
          round_id?: string
          round_number?: number
          rank?: number
          total_points?: number
          round_points?: number
        }
        Relationships: [
          { foreignKeyName: "leaderboard_history_fantasy_team_id_fkey"; columns: ["fantasy_team_id"]; isOneToOne: false; referencedRelation: "fantasy_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "leaderboard_history_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "leaderboard_history_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] }
        ]
      }
      leaderboard_overall: {
        Row: {
          season_id: string
          fantasy_team_id: string
          total_points: number
          last_round_points: number
          rank: number
          prev_rank: number | null
          rank_delta: number | null
          rounds_won: number
          best_round_points: number
          computed_at: string
        }
        Insert: {
          season_id: string
          fantasy_team_id: string
          total_points?: number
          last_round_points?: number
          rank: number
          prev_rank?: number | null
          rank_delta?: number | null
          rounds_won?: number
          best_round_points?: number
          computed_at?: string
        }
        Update: {
          season_id?: string
          fantasy_team_id?: string
          total_points?: number
          last_round_points?: number
          rank?: number
          prev_rank?: number | null
          rank_delta?: number | null
          rounds_won?: number
          best_round_points?: number
          computed_at?: string
        }
        Relationships: [
          { foreignKeyName: "leaderboard_overall_fantasy_team_id_fkey"; columns: ["fantasy_team_id"]; isOneToOne: false; referencedRelation: "fantasy_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "leaderboard_overall_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] }
        ]
      }
      leaderboard_round: {
        Row: {
          round_id: string
          fantasy_team_id: string
          points: number
          rank: number
        }
        Insert: {
          round_id: string
          fantasy_team_id: string
          points?: number
          rank: number
        }
        Update: {
          round_id?: string
          fantasy_team_id?: string
          points?: number
          rank?: number
        }
        Relationships: [
          { foreignKeyName: "leaderboard_round_fantasy_team_id_fkey"; columns: ["fantasy_team_id"]; isOneToOne: false; referencedRelation: "fantasy_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "leaderboard_round_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] }
        ]
      }
      matchdays: {
        Row: {
          id: string
          season_id: string
          round_id: string | null
          number: number
          name: string | null
          date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          round_id?: string | null
          number: number
          name?: string | null
          date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          round_id?: string | null
          number?: number
          name?: string | null
          date?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "matchdays_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "matchdays_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] }
        ]
      }
      matches: {
        Row: {
          id: string
          matchday_id: string
          home_team_id: string
          away_team_id: string
          kickoff_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          home_score: number | null
          away_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          matchday_id: string
          home_team_id: string
          away_team_id: string
          kickoff_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          home_score?: number | null
          away_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          matchday_id?: string
          home_team_id?: string
          away_team_id?: string
          kickoff_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          home_score?: number | null
          away_score?: number | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "matches_away_team_id_fkey"; columns: ["away_team_id"]; isOneToOne: false; referencedRelation: "season_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "matches_home_team_id_fkey"; columns: ["home_team_id"]; isOneToOne: false; referencedRelation: "season_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "matches_matchday_id_fkey"; columns: ["matchday_id"]; isOneToOne: false; referencedRelation: "matchdays"; referencedColumns: ["id"] }
        ]
      }
      player_market_values: {
        Row: {
          id: string
          season_player_id: string
          value_m: number
          valid_from: string
          valid_to: string | null
          reason: string | null
        }
        Insert: {
          id?: string
          season_player_id: string
          value_m: number
          valid_from?: string
          valid_to?: string | null
          reason?: string | null
        }
        Update: {
          id?: string
          season_player_id?: string
          value_m?: number
          valid_from?: string
          valid_to?: string | null
          reason?: string | null
        }
        Relationships: [
          { foreignKeyName: "player_market_values_season_player_id_fkey"; columns: ["season_player_id"]; isOneToOne: false; referencedRelation: "season_players"; referencedColumns: ["id"] }
        ]
      }
      player_round_statistics: {
        Row: {
          id: string
          round_id: string
          season_player_id: string
          stat_key: string
          value: number
          derived_from_snapshot_id: string | null
          previous_snapshot_id: string | null
          status: Database["public"]["Enums"]["stat_status"]
          updated_at: string
        }
        Insert: {
          id?: string
          round_id: string
          season_player_id: string
          stat_key: string
          value: number
          derived_from_snapshot_id?: string | null
          previous_snapshot_id?: string | null
          status?: Database["public"]["Enums"]["stat_status"]
          updated_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          season_player_id?: string
          stat_key?: string
          value?: number
          derived_from_snapshot_id?: string | null
          previous_snapshot_id?: string | null
          status?: Database["public"]["Enums"]["stat_status"]
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "player_round_statistics_derived_from_snapshot_id_fkey"; columns: ["derived_from_snapshot_id"]; isOneToOne: false; referencedRelation: "statistic_snapshots"; referencedColumns: ["id"] },
          { foreignKeyName: "player_round_statistics_previous_snapshot_id_fkey"; columns: ["previous_snapshot_id"]; isOneToOne: false; referencedRelation: "statistic_snapshots"; referencedColumns: ["id"] },
          { foreignKeyName: "player_round_statistics_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "player_round_statistics_season_player_id_fkey"; columns: ["season_player_id"]; isOneToOne: false; referencedRelation: "season_players"; referencedColumns: ["id"] },
          { foreignKeyName: "player_round_statistics_stat_key_fkey"; columns: ["stat_key"]; isOneToOne: false; referencedRelation: "stat_definitions"; referencedColumns: ["key"] }
        ]
      }
      players: {
        Row: {
          id: string
          first_name: string
          last_name: string
          display_name: string
          nationality: string | null
          image_url: string | null
          external_refs: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          display_name: string
          nationality?: string | null
          image_url?: string | null
          external_refs?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          display_name?: string
          nationality?: string | null
          image_url?: string | null
          external_refs?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      prize_winners: {
        Row: {
          id: string
          prize_id: string
          fantasy_team_id: string
          notified_at: string | null
          claimed_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prize_id: string
          fantasy_team_id: string
          notified_at?: string | null
          claimed_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prize_id?: string
          fantasy_team_id?: string
          notified_at?: string | null
          claimed_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "prize_winners_fantasy_team_id_fkey"; columns: ["fantasy_team_id"]; isOneToOne: false; referencedRelation: "fantasy_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "prize_winners_prize_id_fkey"; columns: ["prize_id"]; isOneToOne: false; referencedRelation: "prizes"; referencedColumns: ["id"] }
        ]
      }
      prizes: {
        Row: {
          id: string
          season_id: string
          round_id: string | null
          title: string
          description: string | null
          image_url: string | null
          rank_from: number
          rank_to: number
          sponsor_name: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          round_id?: string | null
          title: string
          description?: string | null
          image_url?: string | null
          rank_from?: number
          rank_to?: number
          sponsor_name?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          round_id?: string | null
          title?: string
          description?: string | null
          image_url?: string | null
          rank_from?: number
          rank_to?: number
          sponsor_name?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "prizes_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "prizes_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] }
        ]
      }
      profiles: {
        Row: {
          user_id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          locale: string
          role: Database["public"]["Enums"]["user_role"]
          active_season_id: string | null
          username_changed_at: string | null
          terms_accepted_at: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          active_season_id?: string | null
          username_changed_at?: string | null
          terms_accepted_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          active_season_id?: string | null
          username_changed_at?: string | null
          terms_accepted_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "profiles_active_season_fk"; columns: ["active_season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] },
          { foreignKeyName: "profiles_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "auth.users"; referencedColumns: ["id"] }
        ]
      }
      round_winners: {
        Row: {
          round_id: string
          fantasy_team_id: string
          points: number
          published_at: string
        }
        Insert: {
          round_id: string
          fantasy_team_id: string
          points: number
          published_at?: string
        }
        Update: {
          round_id?: string
          fantasy_team_id?: string
          points?: number
          published_at?: string
        }
        Relationships: [
          { foreignKeyName: "round_winners_fantasy_team_id_fkey"; columns: ["fantasy_team_id"]; isOneToOne: false; referencedRelation: "fantasy_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "round_winners_round_id_fkey"; columns: ["round_id"]; isOneToOne: true; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] }
        ]
      }
      scoring_rule_versions: {
        Row: {
          id: string
          season_id: string
          version: number
          name: string | null
          is_active: boolean
          rules: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          version: number
          name?: string | null
          is_active?: boolean
          rules: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          version?: number
          name?: string | null
          is_active?: boolean
          rules?: Json
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "scoring_rule_versions_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "scoring_rule_versions_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] }
        ]
      }
      season_champions: {
        Row: {
          season_id: string
          fantasy_team_id: string
          total_points: number
          rounds_won: number
          best_round_points: number
          podium: Json
          published_at: string
        }
        Insert: {
          season_id: string
          fantasy_team_id: string
          total_points: number
          rounds_won?: number
          best_round_points?: number
          podium?: Json
          published_at?: string
        }
        Update: {
          season_id?: string
          fantasy_team_id?: string
          total_points?: number
          rounds_won?: number
          best_round_points?: number
          podium?: Json
          published_at?: string
        }
        Relationships: [
          { foreignKeyName: "season_champions_fantasy_team_id_fkey"; columns: ["fantasy_team_id"]; isOneToOne: false; referencedRelation: "fantasy_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "season_champions_season_id_fkey"; columns: ["season_id"]; isOneToOne: true; referencedRelation: "seasons"; referencedColumns: ["id"] }
        ]
      }
      season_players: {
        Row: {
          id: string
          season_id: string
          player_id: string
          season_team_id: string
          position: Database["public"]["Enums"]["player_position"]
          shirt_number: number | null
          status: Database["public"]["Enums"]["player_status"]
          market_value_m: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          season_id: string
          player_id: string
          season_team_id: string
          position: Database["public"]["Enums"]["player_position"]
          shirt_number?: number | null
          status?: Database["public"]["Enums"]["player_status"]
          market_value_m?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          player_id?: string
          season_team_id?: string
          position?: Database["public"]["Enums"]["player_position"]
          shirt_number?: number | null
          status?: Database["public"]["Enums"]["player_status"]
          market_value_m?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "season_players_player_id_fkey"; columns: ["player_id"]; isOneToOne: false; referencedRelation: "players"; referencedColumns: ["id"] },
          { foreignKeyName: "season_players_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] },
          { foreignKeyName: "season_players_season_team_id_fkey"; columns: ["season_team_id"]; isOneToOne: false; referencedRelation: "season_teams"; referencedColumns: ["id"] }
        ]
      }
      season_teams: {
        Row: {
          id: string
          season_id: string
          club_id: string
          display_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          club_id: string
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          club_id?: string
          display_name?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "season_teams_club_id_fkey"; columns: ["club_id"]; isOneToOne: false; referencedRelation: "clubs"; referencedColumns: ["id"] },
          { foreignKeyName: "season_teams_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] }
        ]
      }
      seasons: {
        Row: {
          id: string
          competition_id: string
          slug: string
          name: string
          status: Database["public"]["Enums"]["season_status"]
          starts_at: string | null
          ends_at: string | null
          branding: Json
          rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          competition_id: string
          slug: string
          name: string
          status?: Database["public"]["Enums"]["season_status"]
          starts_at?: string | null
          ends_at?: string | null
          branding?: Json
          rules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          competition_id?: string
          slug?: string
          name?: string
          status?: Database["public"]["Enums"]["season_status"]
          starts_at?: string | null
          ends_at?: string | null
          branding?: Json
          rules?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "seasons_competition_id_fkey"; columns: ["competition_id"]; isOneToOne: false; referencedRelation: "competitions"; referencedColumns: ["id"] }
        ]
      }
      stat_definitions: {
        Row: {
          key: string
          label_de: string
          short_de: string | null
          category: string
          data_type: string
          is_cumulative: boolean
          is_derived: boolean
          derive_from: Json | null
          sort_order: number
        }
        Insert: {
          key: string
          label_de: string
          short_de?: string | null
          category?: string
          data_type?: string
          is_cumulative?: boolean
          is_derived?: boolean
          derive_from?: Json | null
          sort_order?: number
        }
        Update: {
          key?: string
          label_de?: string
          short_de?: string | null
          category?: string
          data_type?: string
          is_cumulative?: boolean
          is_derived?: boolean
          derive_from?: Json | null
          sort_order?: number
        }
        Relationships: []
      }
      statistic_corrections: {
        Row: {
          id: string
          round_stat_id: string
          old_value: number | null
          new_value: number
          reason: string | null
          corrected_by: string | null
          corrected_at: string
        }
        Insert: {
          id?: string
          round_stat_id: string
          old_value?: number | null
          new_value: number
          reason?: string | null
          corrected_by?: string | null
          corrected_at?: string
        }
        Update: {
          id?: string
          round_stat_id?: string
          old_value?: number | null
          new_value?: number
          reason?: string | null
          corrected_by?: string | null
          corrected_at?: string
        }
        Relationships: [
          { foreignKeyName: "statistic_corrections_corrected_by_fkey"; columns: ["corrected_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "statistic_corrections_round_stat_id_fkey"; columns: ["round_stat_id"]; isOneToOne: false; referencedRelation: "player_round_statistics"; referencedColumns: ["id"] }
        ]
      }
      statistic_imports: {
        Row: {
          id: string
          season_id: string
          round_id: string | null
          source: Database["public"]["Enums"]["import_source"]
          mode: string
          file_path: string | null
          file_name: string | null
          file_hash: string | null
          imported_by: string | null
          status: Database["public"]["Enums"]["import_status"]
          column_mapping: Json | null
          extraction_log: Json
          error_log: Json
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          season_id: string
          round_id?: string | null
          source: Database["public"]["Enums"]["import_source"]
          mode?: string
          file_path?: string | null
          file_name?: string | null
          file_hash?: string | null
          imported_by?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          column_mapping?: Json | null
          extraction_log?: Json
          error_log?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          round_id?: string | null
          source?: Database["public"]["Enums"]["import_source"]
          mode?: string
          file_path?: string | null
          file_name?: string | null
          file_hash?: string | null
          imported_by?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          column_mapping?: Json | null
          extraction_log?: Json
          error_log?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "statistic_imports_imported_by_fkey"; columns: ["imported_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "statistic_imports_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "statistic_imports_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] }
        ]
      }
      statistic_snapshot_values: {
        Row: {
          snapshot_id: string
          season_player_id: string
          stat_key: string
          value: number | null
          confidence: number | null
          needs_review: boolean
        }
        Insert: {
          snapshot_id: string
          season_player_id: string
          stat_key: string
          value?: number | null
          confidence?: number | null
          needs_review?: boolean
        }
        Update: {
          snapshot_id?: string
          season_player_id?: string
          stat_key?: string
          value?: number | null
          confidence?: number | null
          needs_review?: boolean
        }
        Relationships: [
          { foreignKeyName: "statistic_snapshot_values_season_player_id_fkey"; columns: ["season_player_id"]; isOneToOne: false; referencedRelation: "season_players"; referencedColumns: ["id"] },
          { foreignKeyName: "statistic_snapshot_values_snapshot_id_fkey"; columns: ["snapshot_id"]; isOneToOne: false; referencedRelation: "statistic_snapshots"; referencedColumns: ["id"] },
          { foreignKeyName: "statistic_snapshot_values_stat_key_fkey"; columns: ["stat_key"]; isOneToOne: false; referencedRelation: "stat_definitions"; referencedColumns: ["key"] }
        ]
      }
      statistic_snapshots: {
        Row: {
          id: string
          season_id: string
          import_id: string | null
          as_of_round_id: string
          captured_at: string
          is_valid: boolean
          superseded_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          import_id?: string | null
          as_of_round_id: string
          captured_at?: string
          is_valid?: boolean
          superseded_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          import_id?: string | null
          as_of_round_id?: string
          captured_at?: string
          is_valid?: boolean
          superseded_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "statistic_snapshots_as_of_round_id_fkey"; columns: ["as_of_round_id"]; isOneToOne: false; referencedRelation: "fantasy_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "statistic_snapshots_import_id_fkey"; columns: ["import_id"]; isOneToOne: false; referencedRelation: "statistic_imports"; referencedColumns: ["id"] },
          { foreignKeyName: "statistic_snapshots_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] },
          { foreignKeyName: "statistic_snapshots_superseded_by_fkey"; columns: ["superseded_by"]; isOneToOne: false; referencedRelation: "statistic_snapshots"; referencedColumns: ["id"] }
        ]
      }
      user_notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          payload: Json
          read_at: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          payload?: Json
          read_at?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          payload?: Json
          read_at?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "user_notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["user_id"] }
        ]
      }
      user_preferences: {
        Row: {
          user_id: string
          email_round_reminder: boolean
          email_round_result: boolean
          email_marketing: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          email_round_reminder?: boolean
          email_round_result?: boolean
          email_marketing?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          email_round_reminder?: boolean
          email_round_result?: boolean
          email_marketing?: boolean
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "user_preferences_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["user_id"] }
        ]
      }
    }
    Views: {
      player_season_stats: {
        Row: {
          season_player_id: string | null
          season_id: string | null
          total_points: number | null
          rounds_played: number | null
          avg_points: number | null
          last_points: number | null
          best_points: number | null
          form3: number | null
          points_per_m: number | null
          goals: number | null
          assists: number | null
          owned_by: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_activate_scoring_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      admin_create_season: {
        Args: { p_competition_id: string; p_slug: string; p_name: string; p_rules?: Json }
        Returns: string
      }
      change_username: {
        Args: { p_username: string }
        Returns: Json
      }
      compute_round: {
        Args: { p_round_id: string; p_finalize?: boolean }
        Returns: Json
      }
      correct_round_stat: {
        Args: { p_round_stat_id: string; p_new_value: number; p_reason: string }
        Returns: Json
      }
      create_league: {
        Args: { p_season_id: string; p_name: string }
        Returns: Json
      }
      current_role_of: {
        Args: { uid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      delete_my_account: {
        Args: Record<string, never>
        Returns: undefined
      }
      derive_round_stats_from_snapshot: {
        Args: { p_snapshot_id: string }
        Returns: Json
      }
      export_my_data: {
        Args: Record<string, never>
        Returns: Json
      }
      finalize_season: {
        Args: { p_season_id: string }
        Returns: Json
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_staff: {
        Args: Record<string, never>
        Returns: boolean
      }
      join_league: {
        Args: { p_code: string }
        Returns: Json
      }
      last_locked_lineup: {
        Args: { p_team_id: string }
        Returns: unknown
      }
      leaderboard_window: {
        Args: { p_season_id: string; p_from: number; p_to: number }
        Returns: { rank: number; rank_delta: number; total_points: number; last_round_points: number; fantasy_team_id: string; team_name: string; username: string; is_me: boolean }[]
      }
      league_table: {
        Args: { p_league_id: string }
        Returns: { rank: number; total_points: number; last_round_points: number; fantasy_team_id: string; team_name: string; username: string; is_me: boolean }[]
      }
      lock_due_rounds: {
        Args: Record<string, never>
        Returns: number
      }
      lock_round: {
        Args: { p_round_id: string }
        Returns: Json
      }
      my_rank: {
        Args: { p_season_id: string }
        Returns: Json
      }
      next_open_round: {
        Args: { p_season_id: string }
        Returns: unknown
      }
      publish_round_stats: {
        Args: { p_round_id: string }
        Returns: Json
      }
      rebuild_overall_leaderboard: {
        Args: { p_season_id: string }
        Returns: undefined
      }
      round_leaderboard_window: {
        Args: { p_round_id: string; p_from: number; p_to: number }
        Returns: { rank: number; points: number; fantasy_team_id: string; team_name: string; username: string; is_me: boolean }[]
      }
      save_roster: {
        Args: { p_season_id: string; p_team_name: string; p_players: Json; p_captain: string; p_dry_run?: boolean }
        Returns: Json
      }
      score_player_stats: {
        Args: { p_stats: Json; p_position: Database["public"]["Enums"]["player_position"]; p_rules: Json }
        Returns: Json
      }
      scoring_rules_default: {
        Args: Record<string, never>
        Returns: Json
      }
      season_rules: {
        Args: { p_season_id: string }
        Returns: Json
      }
      season_rules_default: {
        Args: Record<string, never>
        Returns: Json
      }
      set_active_season: {
        Args: { p_season_id: string }
        Returns: undefined
      }
      set_user_role: {
        Args: { p_user_id: string; p_role: Database["public"]["Enums"]["user_role"] }
        Returns: undefined
      }
      username_available: {
        Args: { p_username: string }
        Returns: boolean
      }
    }
    Enums: {
      import_source: "csv" | "xlsx" | "json" | "api" | "screenshot" | "manual"
      import_status: "uploaded" | "extracted" | "review" | "confirmed" | "published" | "rejected"
      match_status: "scheduled" | "live" | "finished" | "postponed" | "cancelled"
      name_status: "pending" | "approved" | "rejected"
      player_position: "GK" | "FIELD"
      player_status: "active" | "injured" | "unavailable" | "left"
      roster_slot: "GK" | "FIELD" | "BENCH"
      round_status: "upcoming" | "locked" | "live" | "under_review" | "completed"
      score_status: "provisional" | "official"
      season_status: "draft" | "open" | "live" | "completed" | "archived"
      stat_status: "computed" | "confirmed" | "published" | "corrected"
      user_role: "user" | "editor" | "admin"
    }
    CompositeTypes: Record<string, never>
  }
}


export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]
export type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"]


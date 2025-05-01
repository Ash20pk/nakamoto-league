export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TournamentFormat = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS'

export interface Database {
  public: {
    Tables: {
      achievements: {
        Row: {
          id: string
          warrior_id: string
          title: string
          description: string | null
          achieved_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          warrior_id: string
          title: string
          description?: string | null
          achieved_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          warrior_id?: string
          title?: string
          description?: string | null
          achieved_at?: string
          metadata?: Json | null
        }
      }
      dojos: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          location: string | null
          banner_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          location?: string | null
          banner_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          location?: string | null
          banner_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          metadata?: Json | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tournament_participants: {
        Row: {
          id: string
          tournament_id: string
          warrior_id: string
          registration_date: string
          status: string
        }
        Insert: {
          id?: string
          tournament_id: string
          warrior_id: string
          registration_date?: string
          status?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          warrior_id?: string
          registration_date?: string
          status?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          title: string
          description: string | null
          organizer_id: string
          format: TournamentFormat
          start_date: string
          end_date: string
          registration_deadline: string
          max_participants: number
          entry_fee: number
          prize_pool: Json
          rules: string[]
          requirements: Json
          banner_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          organizer_id: string
          format: TournamentFormat
          start_date: string
          end_date: string
          registration_deadline: string
          max_participants: number
          entry_fee?: number
          prize_pool: Json
          rules: string[]
          requirements?: Json
          banner_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          organizer_id?: string
          format?: TournamentFormat
          start_date?: string
          end_date?: string
          registration_deadline?: string
          max_participants?: number
          entry_fee?: number
          prize_pool?: Json
          rules?: string[]
          requirements?: Json
          banner_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      warriors: {
        Row: {
          id: string
          name: string
          owner_id: string
          dojo_id: string | null
          power_level: number
          rank: number
          avatar_url: string | null
          win_rate: number
          experience?: number
          level?: number
          energy?: number
          energy_last_updated?: string
          last_check_in?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          dojo_id?: string | null
          power_level?: number
          rank?: number
          avatar_url?: string | null
          win_rate?: number
          experience?: number
          level?: number
          energy?: number
          energy_last_updated?: string
          last_check_in?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          dojo_id?: string | null
          power_level?: number
          rank?: number
          avatar_url?: string | null
          win_rate?: number
          experience?: number
          level?: number
          energy?: number
          energy_last_updated?: string
          last_check_in?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tournament_format: TournamentFormat
    }
  }
}
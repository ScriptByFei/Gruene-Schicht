export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          display_name: string
          department: string
          shift_start_date: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          display_name: string
          department?: string
          shift_start_date?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          department?: string
          shift_start_date?: string | null
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          title: string
          description: string
          status: string
          final_location: string | null
          final_date: string | null
          final_note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          status?: string
          final_location?: string | null
          final_date?: string | null
          final_note?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: string
          final_location?: string | null
          final_date?: string | null
          final_note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      polls: {
        Row: {
          id: string
          event_id: string
          title: string
          description: string | null
          type: string
          is_open: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          title: string
          description?: string | null
          type?: string
          is_open?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          title?: string
          description?: string | null
          type?: string
          is_open?: boolean
          created_at?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          id: string
          poll_id: string
          label: string
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          label: string
          created_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          label?: string
          created_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          id: string
          poll_id: string
          option_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          option_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          option_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      event_attendance: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          id: string
          event_id: string
          user_id: string
          text: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          text: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          text?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

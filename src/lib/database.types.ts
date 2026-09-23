export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      client_error_reports: {
        Row: {
          created_at: string
          error_code: string
          id: string
          organization_id: string
          route: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code: string
          id?: string
          organization_id: string
          route: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_code?: string
          id?: string
          organization_id?: string
          route?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_error_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_error_reports_organization_id_user_id_fkey"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          final_date: string | null
          final_location: string | null
          final_note: string | null
          id: string
          organization_id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          final_date?: string | null
          final_location?: string | null
          final_note?: string | null
          id?: string
          organization_id: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          final_date?: string | null
          final_location?: string | null
          final_note?: string | null
          id?: string
          organization_id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_user_id: string | null
          body: string
          created_at: string
          id: string
          link: string
          organization_id: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          link: string
          organization_id: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          link?: string
          organization_id?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_user_id_fkey"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      organization_access_requests: {
        Row: {
          id: string
          organization_id: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_shift_group_id: string | null
          status: Database["public"]["Enums"]["access_request_status"]
          user_id: string
        }
        Insert: {
          id?: string
          organization_id: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_shift_group_id?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
          user_id: string
        }
        Update: {
          id?: string
          organization_id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_shift_group_id?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_access_requests_organization_id_reviewed_shif_fkey"
            columns: ["organization_id", "reviewed_shift_group_id"]
            isOneToOne: false
            referencedRelation: "shift_groups"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      organization_members: {
        Row: {
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          shift_group_id: string | null
          status: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Insert: {
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["user_role"]
          shift_group_id?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Update: {
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          shift_group_id?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_shift_group_fk"
            columns: ["organization_id", "shift_group_id"]
            isOneToOne: false
            referencedRelation: "shift_groups"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          timezone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          timezone?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          label: string
          poll_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          poll_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_open: boolean
          title: string
          type: Database["public"]["Enums"]["poll_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_open?: boolean
          title: string
          type?: Database["public"]["Enums"]["poll_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_open?: boolean
          title?: string
          type?: Database["public"]["Enums"]["poll_type"]
        }
        Relationships: [
          {
            foreignKeyName: "polls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_directory: {
        Row: {
          display_name: string
          id: string
        }
        Insert: {
          display_name: string
          id: string
        }
        Update: {
          display_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_directory_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          shift_start_date: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          shift_start_date?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          shift_start_date?: string | null
        }
        Relationships: []
      }
      shift_change_requests: {
        Row: {
          admin_response_note: string | null
          created_at: string
          id: string
          note: string | null
          organization_id: string
          request_type: Database["public"]["Enums"]["shift_request_type"]
          requester_date: string
          requester_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["shift_request_status"]
          target_date: string | null
          target_responded_at: string | null
          target_response_note: string | null
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          admin_response_note?: string | null
          created_at?: string
          id?: string
          note?: string | null
          organization_id: string
          request_type: Database["public"]["Enums"]["shift_request_type"]
          requester_date: string
          requester_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status: Database["public"]["Enums"]["shift_request_status"]
          target_date?: string | null
          target_responded_at?: string | null
          target_response_note?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_response_note?: string | null
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string
          request_type?: Database["public"]["Enums"]["shift_request_type"]
          requester_date?: string
          requester_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["shift_request_status"]
          target_date?: string | null
          target_responded_at?: string | null
          target_response_note?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_change_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_organization_id_requester_user_id_fkey"
            columns: ["organization_id", "requester_user_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "shift_change_requests_organization_id_target_user_id_fkey"
            columns: ["organization_id", "target_user_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      shift_groups: {
        Row: {
          anchor_date: string
          color: string
          created_at: string
          id: string
          name: string
          organization_id: string
          pattern: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          anchor_date: string
          color?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          pattern?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          anchor_date?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          pattern?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_overrides: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["shift_override_kind"]
          organization_id: string
          shift_date: string
          shift_symbol: string
          source_request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["shift_override_kind"]
          organization_id: string
          shift_date: string
          shift_symbol: string
          source_request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["shift_override_kind"]
          organization_id?: string
          shift_date?: string
          shift_symbol?: string
          source_request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_overrides_organization_id_source_request_id_fkey"
            columns: ["organization_id", "source_request_id"]
            isOneToOne: false
            referencedRelation: "shift_change_requests"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "shift_overrides_organization_id_user_id_fkey"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      suggestions: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: Database["public"]["Enums"]["suggestion_status"]
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_poll_option_match"
            columns: ["poll_id", "option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["poll_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_shift_change_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      create_poll_with_options: {
        Args: {
          p_description: string
          p_event_id: string
          p_option_labels: string[]
          p_title: string
          p_type: Database["public"]["Enums"]["poll_type"]
        }
        Returns: string
      }
      create_shift_change_request: {
        Args: {
          p_note?: string
          p_organization_id: string
          p_request_type: Database["public"]["Enums"]["shift_request_type"]
          p_requester_date: string
          p_target_date?: string
          p_target_user_id?: string
        }
        Returns: string
      }
      delete_my_account: {
        Args: { p_expected_email: string }
        Returns: undefined
      }
      export_my_data: { Args: never; Returns: Json }
      get_admin_event_overview: {
        Args: { p_organization_id: string }
        Returns: {
          attending: number
          declined: number
          event_id: string
          maybe: number
          pending_suggestions: number
          poll_count: number
        }[]
      }
      get_attendance_summary: {
        Args: { p_event_id: string }
        Returns: {
          attending: number
          declined: number
          maybe: number
          total: number
        }[]
      }
      get_beta_health: {
        Args: { p_organization_id: string }
        Returns: {
          active_events: number
          active_members: number
          client_errors_24h: number
          client_errors_7d: number
          database_now: string
          last_client_error_at: string
          pending_access_requests: number
          pending_shift_requests: number
          unread_notifications: number
        }[]
      }
      get_event_attendee_roster: {
        Args: { p_event_id: string }
        Returns: {
          display_name: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          user_id: string
        }[]
      }
      get_poll_results: {
        Args: { p_poll_id: string }
        Returns: {
          option_id: string
          vote_count: number
        }[]
      }
      replace_single_vote: {
        Args: { p_option_id: string; p_poll_id: string }
        Returns: undefined
      }
      report_client_error: {
        Args: { p_error_code: string; p_route: string }
        Returns: undefined
      }
      request_organization_access: {
        Args: { p_organization_slug: string }
        Returns: string
      }
      respond_to_shift_swap: {
        Args: { p_accept: boolean; p_note?: string; p_request_id: string }
        Returns: undefined
      }
      review_organization_access_request: {
        Args: {
          p_approve: boolean
          p_request_id: string
          p_shift_group_id?: string
        }
        Returns: undefined
      }
      review_shift_change_request: {
        Args: { p_approve: boolean; p_note?: string; p_request_id: string }
        Returns: undefined
      }
    }
    Enums: {
      access_request_status: "pending" | "approved" | "rejected"
      attendance_status: "attending" | "maybe" | "declined"
      event_status: "draft" | "active" | "closed"
      membership_status: "active" | "disabled"
      notification_type: "event" | "poll" | "shift_request" | "suggestion"
      poll_type: "single_choice" | "multiple_choice"
      shift_override_kind: "absence" | "swap"
      shift_request_status:
        | "pending_target"
        | "pending_admin"
        | "approved"
        | "rejected"
        | "cancelled"
      shift_request_type: "absence" | "swap"
      suggestion_status: "pending" | "approved" | "rejected"
      user_role: "employee" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      access_request_status: ["pending", "approved", "rejected"],
      attendance_status: ["attending", "maybe", "declined"],
      event_status: ["draft", "active", "closed"],
      membership_status: ["active", "disabled"],
      notification_type: ["event", "poll", "shift_request", "suggestion"],
      poll_type: ["single_choice", "multiple_choice"],
      shift_override_kind: ["absence", "swap"],
      shift_request_status: [
        "pending_target",
        "pending_admin",
        "approved",
        "rejected",
        "cancelled",
      ],
      shift_request_type: ["absence", "swap"],
      suggestion_status: ["pending", "approved", "rejected"],
      user_role: ["employee", "admin"],
    },
  },
} as const

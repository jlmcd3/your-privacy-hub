export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          id: string
          is_premium: boolean
          payment_failed: boolean
          stripe_customer_id: string | null
          subscription_end_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_premium?: boolean
          payment_failed?: boolean
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_premium?: boolean
          payment_failed?: boolean
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      updates: {
        Row: {
          ai_summary: Json | null
          category: string
          created_at: string
          id: string
          image_url: string | null
          is_premium: boolean
          published_at: string
          regulator: string | null
          source_domain: string | null
          source_name: string | null
          summary: string | null
          title: string
          topic_tags: string[] | null
          url: string
        }
        Insert: {
          ai_summary?: Json | null
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_premium?: boolean
          published_at?: string
          regulator?: string | null
          source_domain?: string | null
          source_name?: string | null
          summary?: string | null
          title: string
          topic_tags?: string[] | null
          url: string
        }
        Update: {
          ai_summary?: Json | null
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_premium?: boolean
          published_at?: string
          regulator?: string | null
          source_domain?: string | null
          source_name?: string | null
          summary?: string | null
          title?: string
          topic_tags?: string[] | null
          url?: string
        }
        Relationships: []
      }
      weekly_briefs: {
        Row: {
          article_count: number | null
          created_at: string
          enforcement_table: Json | null
          eu_uk: string | null
          executive_summary: string
          global_developments: string | null
          headline: string
          id: string
          published_at: string
          trend_signal: string | null
          us_federal: string | null
          us_states: string | null
          week_label: string
          why_this_matters: string | null
        }
        Insert: {
          article_count?: number | null
          created_at?: string
          enforcement_table?: Json | null
          eu_uk?: string | null
          executive_summary: string
          global_developments?: string | null
          headline: string
          id?: string
          published_at?: string
          trend_signal?: string | null
          us_federal?: string | null
          us_states?: string | null
          week_label: string
          why_this_matters?: string | null
        }
        Update: {
          article_count?: number | null
          created_at?: string
          enforcement_table?: Json | null
          eu_uk?: string | null
          executive_summary?: string
          global_developments?: string | null
          headline?: string
          id?: string
          published_at?: string
          trend_signal?: string | null
          us_federal?: string | null
          us_states?: string | null
          week_label?: string
          why_this_matters?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const

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
      custom_briefs: {
        Row: {
          articles_used: number | null
          base_brief_id: string | null
          custom_sections: Json
          generated_at: string | null
          generation_model: string | null
          id: string
          issue_tags: Json | null
          preferences_snapshot: Json | null
          user_id: string
          verification_result: Json | null
          week_label: string
        }
        Insert: {
          articles_used?: number | null
          base_brief_id?: string | null
          custom_sections?: Json
          generated_at?: string | null
          generation_model?: string | null
          id?: string
          issue_tags?: Json | null
          preferences_snapshot?: Json | null
          user_id: string
          verification_result?: Json | null
          week_label: string
        }
        Update: {
          articles_used?: number | null
          base_brief_id?: string | null
          custom_sections?: Json
          generated_at?: string | null
          generation_model?: string | null
          id?: string
          issue_tags?: Json | null
          preferences_snapshot?: Json | null
          user_id?: string
          verification_result?: Json | null
          week_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_briefs_base_brief_id_fkey"
            columns: ["base_brief_id"]
            isOneToOne: false
            referencedRelation: "weekly_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscribers: {
        Row: {
          confirmed: boolean | null
          email: string
          id: string
          source: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          confirmed?: boolean | null
          email: string
          id?: string
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          confirmed?: boolean | null
          email?: string
          id?: string
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      enforcement_actions: {
        Row: {
          action_type: string | null
          created_at: string | null
          decision_date: string | null
          etid: string | null
          fine_amount: string | null
          fine_eur: number | null
          id: string
          jurisdiction: string
          law: string | null
          regulator: string
          sector: string | null
          source_url: string | null
          subject: string | null
          violation: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          decision_date?: string | null
          etid?: string | null
          fine_amount?: string | null
          fine_eur?: number | null
          id?: string
          jurisdiction: string
          law?: string | null
          regulator: string
          sector?: string | null
          source_url?: string | null
          subject?: string | null
          violation?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          decision_date?: string | null
          etid?: string | null
          fine_amount?: string | null
          fine_eur?: number | null
          id?: string
          jurisdiction?: string
          law?: string | null
          regulator?: string
          sector?: string | null
          source_url?: string | null
          subject?: string | null
          violation?: string | null
        }
        Relationships: []
      }
      enforcement_submissions: {
        Row: {
          created_at: string | null
          fine_amount: string | null
          id: string
          jurisdiction: string
          law: string | null
          regulator: string
          reviewed: boolean | null
          source_url: string | null
          subject: string | null
          submitted_by: string | null
          violation: string | null
        }
        Insert: {
          created_at?: string | null
          fine_amount?: string | null
          id?: string
          jurisdiction: string
          law?: string | null
          regulator: string
          reviewed?: boolean | null
          source_url?: string | null
          subject?: string | null
          submitted_by?: string | null
          violation?: string | null
        }
        Update: {
          created_at?: string | null
          fine_amount?: string | null
          id?: string
          jurisdiction?: string
          law?: string | null
          regulator?: string
          reviewed?: boolean | null
          source_url?: string | null
          subject?: string | null
          submitted_by?: string | null
          violation?: string | null
        }
        Relationships: []
      }
      ingestion_runs: {
        Row: {
          enrichment_failed_429: number | null
          enrichment_failed_other: number | null
          id: string
          inserted: number | null
          run_at: string
          skipped: number | null
          summaries_generated: number | null
        }
        Insert: {
          enrichment_failed_429?: number | null
          enrichment_failed_other?: number | null
          id?: string
          inserted?: number | null
          run_at: string
          skipped?: number | null
          summaries_generated?: number | null
        }
        Update: {
          enrichment_failed_429?: number | null
          enrichment_failed_other?: number | null
          id?: string
          inserted?: number | null
          run_at?: string
          skipped?: number | null
          summaries_generated?: number | null
        }
        Relationships: []
      }
      jurisdictions: {
        Row: {
          created_at: string | null
          dla_piper_url: string | null
          dpa_name: string | null
          id: string
          iso_code: string | null
          law_name: string | null
          law_status: string | null
          name: string
          region: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          dla_piper_url?: string | null
          dpa_name?: string | null
          id?: string
          iso_code?: string | null
          law_name?: string | null
          law_status?: string | null
          name: string
          region?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          dla_piper_url?: string | null
          dpa_name?: string | null
          id?: string
          iso_code?: string | null
          law_name?: string | null
          law_status?: string | null
          name?: string
          region?: string | null
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ask_privacy_count: number | null
          ask_privacy_reset_date: string | null
          bonus_report_credits: number
          brief_role: string | null
          created_at: string
          id: string
          is_premium: boolean
          is_pro: boolean | null
          monthly_reports_used: number
          payment_failed: boolean
          reports_reset_date: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          subscription_end_date: string | null
          updated_at: string
        }
        Insert: {
          ask_privacy_count?: number | null
          ask_privacy_reset_date?: string | null
          bonus_report_credits?: number
          brief_role?: string | null
          created_at?: string
          id: string
          is_premium?: boolean
          is_pro?: boolean | null
          monthly_reports_used?: number
          payment_failed?: boolean
          reports_reset_date?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          subscription_end_date?: string | null
          updated_at?: string
        }
        Update: {
          ask_privacy_count?: number | null
          ask_privacy_reset_date?: string | null
          bonus_report_credits?: number
          brief_role?: string | null
          created_at?: string
          id?: string
          is_premium?: boolean
          is_pro?: boolean | null
          monthly_reports_used?: number
          payment_failed?: boolean
          reports_reset_date?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          subscription_end_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      regulator_follows: {
        Row: {
          created_at: string | null
          email: string
          follow_key: string
          follow_type: string
          id: string
          is_premium: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          follow_key: string
          follow_type: string
          id?: string
          is_premium?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          follow_key?: string
          follow_type?: string
          id?: string
          is_premium?: boolean | null
        }
        Relationships: []
      }
      trend_reports: {
        Row: {
          affected_industries: Json
          article_count: number
          confidence_score: number
          created_at: string | null
          date: string
          emerging_risks: Json
          id: string
          jurisdictions: Json
          period: string
          regulatory_patterns: Json
          source_article_ids: Json
          top_trends: Json
          updated_at: string | null
        }
        Insert: {
          affected_industries?: Json
          article_count?: number
          confidence_score?: number
          created_at?: string | null
          date: string
          emerging_risks?: Json
          id?: string
          jurisdictions?: Json
          period?: string
          regulatory_patterns?: Json
          source_article_ids?: Json
          top_trends?: Json
          updated_at?: string | null
        }
        Update: {
          affected_industries?: Json
          article_count?: number
          confidence_score?: number
          created_at?: string | null
          date?: string
          emerging_risks?: Json
          id?: string
          jurisdictions?: Json
          period?: string
          regulatory_patterns?: Json
          source_article_ids?: Json
          top_trends?: Json
          updated_at?: string | null
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
      user_brief_preferences: {
        Row: {
          created_at: string | null
          format: string | null
          id: string
          industries: string[] | null
          jurisdictions: string[] | null
          topics: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          format?: string | null
          id?: string
          industries?: string[] | null
          jurisdictions?: string[] | null
          topics?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          format?: string | null
          id?: string
          industries?: string[] | null
          jurisdictions?: string[] | null
          topics?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_watchlist: {
        Row: {
          created_at: string | null
          flag: string | null
          id: string
          label: string
          slug: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          flag?: string | null
          id?: string
          label: string
          slug: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          flag?: string | null
          id?: string
          label?: string
          slug?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_briefs: {
        Row: {
          adtech_advertising: string | null
          ai_governance: string | null
          article_count: number | null
          biometric_data: string | null
          created_at: string
          cross_jurisdiction_patterns: string | null
          enforcement_table: Json | null
          enforcement_trends: string | null
          eu_uk: string | null
          executive_summary: string
          global_developments: string | null
          headline: string
          id: string
          privacy_litigation: string | null
          published_at: string
          source_map: Json | null
          trend_signal: string | null
          us_federal: string | null
          us_states: string | null
          verification_report: Json | null
          week_label: string
          why_this_matters: string | null
        }
        Insert: {
          adtech_advertising?: string | null
          ai_governance?: string | null
          article_count?: number | null
          biometric_data?: string | null
          created_at?: string
          cross_jurisdiction_patterns?: string | null
          enforcement_table?: Json | null
          enforcement_trends?: string | null
          eu_uk?: string | null
          executive_summary: string
          global_developments?: string | null
          headline: string
          id?: string
          privacy_litigation?: string | null
          published_at?: string
          source_map?: Json | null
          trend_signal?: string | null
          us_federal?: string | null
          us_states?: string | null
          verification_report?: Json | null
          week_label: string
          why_this_matters?: string | null
        }
        Update: {
          adtech_advertising?: string | null
          ai_governance?: string | null
          article_count?: number | null
          biometric_data?: string | null
          created_at?: string
          cross_jurisdiction_patterns?: string | null
          enforcement_table?: Json | null
          enforcement_trends?: string | null
          eu_uk?: string | null
          executive_summary?: string
          global_developments?: string | null
          headline?: string
          id?: string
          privacy_litigation?: string | null
          published_at?: string
          source_map?: Json | null
          trend_signal?: string | null
          us_federal?: string | null
          us_states?: string | null
          verification_report?: Json | null
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

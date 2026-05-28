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
      article_image_pool: {
        Row: {
          approval_status: string
          category: string | null
          created_at: string
          height: number | null
          id: string
          photographer_name: string | null
          photographer_url: string | null
          public_url: string
          query: string | null
          source: string
          source_id: string | null
          storage_path: string
          times_used: number
          width: number | null
        }
        Insert: {
          approval_status?: string
          category?: string | null
          created_at?: string
          height?: number | null
          id?: string
          photographer_name?: string | null
          photographer_url?: string | null
          public_url: string
          query?: string | null
          source?: string
          source_id?: string | null
          storage_path: string
          times_used?: number
          width?: number | null
        }
        Update: {
          approval_status?: string
          category?: string | null
          created_at?: string
          height?: number | null
          id?: string
          photographer_name?: string | null
          photographer_url?: string | null
          public_url?: string
          query?: string | null
          source?: string
          source_id?: string | null
          storage_path?: string
          times_used?: number
          width?: number | null
        }
        Relationships: []
      }
      assessment_purchases: {
        Row: {
          amount_cents: number
          assessment_id: string
          created_at: string | null
          id: string
          status: string
          stripe_payment_intent_id: string
          subscriber_at_time: boolean | null
          tool_type: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          assessment_id: string
          created_at?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id: string
          subscriber_at_time?: boolean | null
          tool_type: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          assessment_id?: string
          created_at?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id?: string
          subscriber_at_time?: boolean | null
          tool_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      biometric_assessments: {
        Row: {
          analysis_text: string | null
          client_id: string | null
          created_at: string | null
          id: string
          intake_data: Json
          is_free_tier: boolean | null
          is_subscriber_credit: boolean | null
          jurisdictions: string[] | null
          pdf_url: string | null
          purchase_price_cents: number | null
          purchased_as_standalone: boolean | null
          report_data: Json | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analysis_text?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          intake_data?: Json
          is_free_tier?: boolean | null
          is_subscriber_credit?: boolean | null
          jurisdictions?: string[] | null
          pdf_url?: string | null
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          report_data?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_text?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          intake_data?: Json
          is_free_tier?: boolean | null
          is_subscriber_credit?: boolean | null
          jurisdictions?: string[] | null
          pdf_url?: string | null
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          report_data?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biometric_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_translations: {
        Row: {
          brief_date: string
          created_at: string
          id: string
          language_code: string
          translated_content: string
        }
        Insert: {
          brief_date: string
          created_at?: string
          id?: string
          language_code: string
          translated_content: string
        }
        Update: {
          brief_date?: string
          created_at?: string
          id?: string
          language_code?: string
          translated_content?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_personal: boolean
          name: string
          notes: string | null
          owner_id: string
          sector: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_personal?: boolean
          name: string
          notes?: string | null
          owner_id?: string
          sector?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_personal?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          sector?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      corpus_drift_log: {
        Row: {
          detected_at: string
          enforcement_action_id: string | null
          id: string
          new_hash: string | null
          new_verdict: string | null
          notes: string | null
          previous_hash: string | null
          previous_verdict: string | null
          trigger_source: string
        }
        Insert: {
          detected_at?: string
          enforcement_action_id?: string | null
          id?: string
          new_hash?: string | null
          new_verdict?: string | null
          notes?: string | null
          previous_hash?: string | null
          previous_verdict?: string | null
          trigger_source: string
        }
        Update: {
          detected_at?: string
          enforcement_action_id?: string | null
          id?: string
          new_hash?: string | null
          new_verdict?: string | null
          notes?: string | null
          previous_hash?: string | null
          previous_verdict?: string | null
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "corpus_drift_log_enforcement_action_id_fkey"
            columns: ["enforcement_action_id"]
            isOneToOne: false
            referencedRelation: "enforcement_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      corpus_extraction_errors: {
        Row: {
          details: Json | null
          enforcement_action_id: string | null
          error_message: string
          id: string
          ran_at: string
          stage: string
        }
        Insert: {
          details?: Json | null
          enforcement_action_id?: string | null
          error_message: string
          id?: string
          ran_at?: string
          stage: string
        }
        Update: {
          details?: Json | null
          enforcement_action_id?: string | null
          error_message?: string
          id?: string
          ran_at?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "corpus_extraction_errors_enforcement_action_id_fkey"
            columns: ["enforcement_action_id"]
            isOneToOne: false
            referencedRelation: "enforcement_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      corpus_field_history: {
        Row: {
          changed_at: string
          enforcement_action_id: string
          extraction_method: string
          field_name: string
          id: string
          model_used: string | null
          new_value: Json | null
          notes: string | null
          previous_value: Json | null
          source_document_hash: string | null
          source_url: string | null
        }
        Insert: {
          changed_at?: string
          enforcement_action_id: string
          extraction_method: string
          field_name: string
          id?: string
          model_used?: string | null
          new_value?: Json | null
          notes?: string | null
          previous_value?: Json | null
          source_document_hash?: string | null
          source_url?: string | null
        }
        Update: {
          changed_at?: string
          enforcement_action_id?: string
          extraction_method?: string
          field_name?: string
          id?: string
          model_used?: string | null
          new_value?: Json | null
          notes?: string | null
          previous_value?: Json | null
          source_document_hash?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corpus_field_history_enforcement_action_id_fkey"
            columns: ["enforcement_action_id"]
            isOneToOne: false
            referencedRelation: "enforcement_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      corpus_versions: {
        Row: {
          memo_eligible_count: number
          notes: string | null
          snapshot_date: string
          total_enforcement_actions: number
          total_regulatory_guidance: number
          version_label: string
        }
        Insert: {
          memo_eligible_count: number
          notes?: string | null
          snapshot_date?: string
          total_enforcement_actions: number
          total_regulatory_guidance?: number
          version_label: string
        }
        Update: {
          memo_eligible_count?: number
          notes?: string | null
          snapshot_date?: string
          total_enforcement_actions?: number
          total_regulatory_guidance?: number
          version_label?: string
        }
        Relationships: []
      }
      cppa_assessments: {
        Row: {
          client_id: string | null
          created_at: string
          document_a_text: string | null
          document_b_text: string | null
          id: string
          intake_data: Json
          module: string
          purchase_price_cents: number | null
          report_data: Json | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          document_a_text?: string | null
          document_b_text?: string | null
          id?: string
          intake_data?: Json
          module: string
          purchase_price_cents?: number | null
          report_data?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          document_a_text?: string | null
          document_b_text?: string | null
          id?: string
          intake_data?: Json
          module?: string
          purchase_price_cents?: number | null
          report_data?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cppa_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      cppa_scope_checks: {
        Row: {
          answers: Json
          created_at: string
          id: string
          in_scope: boolean
          obligation_map: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          in_scope?: boolean
          obligation_map?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          in_scope?: boolean
          obligation_map?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      dpa_documents: {
        Row: {
          client_id: string | null
          created_at: string | null
          document_text: string | null
          id: string
          intake_data: Json
          is_subscriber_credit: boolean | null
          pdf_url: string | null
          purchase_price_cents: number | null
          purchased_as_standalone: boolean | null
          report_data: Json | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          document_text?: string | null
          id?: string
          intake_data?: Json
          is_subscriber_credit?: boolean | null
          pdf_url?: string | null
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          report_data?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          document_text?: string | null
          id?: string
          intake_data?: Json
          is_subscriber_credit?: boolean | null
          pdf_url?: string | null
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          report_data?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dpa_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      dpia_frameworks: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          intake_data: Json
          is_subscriber_credit: boolean | null
          pdf_url: string | null
          purchase_price_cents: number | null
          purchased_as_standalone: boolean | null
          report_data: Json | null
          report_version: number | null
          source_assessment_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          intake_data?: Json
          is_subscriber_credit?: boolean | null
          pdf_url?: string | null
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          report_data?: Json | null
          report_version?: number | null
          source_assessment_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          intake_data?: Json
          is_subscriber_credit?: boolean | null
          pdf_url?: string | null
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          report_data?: Json | null
          report_version?: number | null
          source_assessment_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dpia_frameworks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_frameworks_source_assessment_id_fkey"
            columns: ["source_assessment_id"]
            isOneToOne: false
            referencedRelation: "governance_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_signups: {
        Row: {
          confirmed: boolean | null
          created_at: string
          email: string
          id: string
          source: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string
          email: string
          id?: string
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string
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
          appeal_status: string | null
          appeal_status_extraction_method: string | null
          biometric_related: boolean | null
          breach_related: boolean | null
          case_reference: string | null
          case_reference_extraction_method: string | null
          company_type: string | null
          created_at: string | null
          data_categories: string[] | null
          decision_date: string | null
          disposition_type: string | null
          disposition_type_extraction_method: string | null
          dpa_related: boolean | null
          enrichment_version: number | null
          etid: string | null
          fine_amount: string | null
          fine_amount_local: string | null
          fine_currency: string | null
          fine_eur: number | null
          fine_eur_equivalent: number | null
          id: string
          industry_sector: string | null
          ingestion_confidence: string | null
          ingestion_method: string | null
          ingestion_run_id: string | null
          ingestion_strategy_used: string | null
          jurisdiction: string
          key_compliance_failure: string | null
          last_source_fetch_at: string | null
          law: string | null
          legacy_enrichment_version: number | null
          legacy_summary_text: string | null
          legacy_summary_url: string | null
          li_processed: boolean
          memo_eligible: boolean
          original_amount: number | null
          original_currency: string | null
          precedent_significance: number | null
          preventive_measures: string | null
          primary_source_status: string | null
          primary_source_url: string | null
          primary_source_url_discovered_at: string | null
          raw_text: string | null
          regulator: string
          regulator_canonical: string | null
          regulator_profile_version: string | null
          regulatory_family: string[] | null
          sector: string | null
          sector_extraction_method: string | null
          source_database: string | null
          source_document_fetched_at: string | null
          source_document_hash: string | null
          source_document_hash_at_ingest: string | null
          source_document_text: string | null
          source_url: string | null
          statutory_provisions: string[] | null
          statutory_provisions_evidence: Json | null
          statutory_provisions_extraction_method: string | null
          subject: string | null
          tool_relevance: string[] | null
          verification_deterministic_pass: boolean | null
          verification_last_run_at: string | null
          verification_paraphrase_confidence: string | null
          verification_status: string
          violation: string | null
          violation_types: string[] | null
        }
        Insert: {
          action_type?: string | null
          appeal_status?: string | null
          appeal_status_extraction_method?: string | null
          biometric_related?: boolean | null
          breach_related?: boolean | null
          case_reference?: string | null
          case_reference_extraction_method?: string | null
          company_type?: string | null
          created_at?: string | null
          data_categories?: string[] | null
          decision_date?: string | null
          disposition_type?: string | null
          disposition_type_extraction_method?: string | null
          dpa_related?: boolean | null
          enrichment_version?: number | null
          etid?: string | null
          fine_amount?: string | null
          fine_amount_local?: string | null
          fine_currency?: string | null
          fine_eur?: number | null
          fine_eur_equivalent?: number | null
          id?: string
          industry_sector?: string | null
          ingestion_confidence?: string | null
          ingestion_method?: string | null
          ingestion_run_id?: string | null
          ingestion_strategy_used?: string | null
          jurisdiction: string
          key_compliance_failure?: string | null
          last_source_fetch_at?: string | null
          law?: string | null
          legacy_enrichment_version?: number | null
          legacy_summary_text?: string | null
          legacy_summary_url?: string | null
          li_processed?: boolean
          memo_eligible?: boolean
          original_amount?: number | null
          original_currency?: string | null
          precedent_significance?: number | null
          preventive_measures?: string | null
          primary_source_status?: string | null
          primary_source_url?: string | null
          primary_source_url_discovered_at?: string | null
          raw_text?: string | null
          regulator: string
          regulator_canonical?: string | null
          regulator_profile_version?: string | null
          regulatory_family?: string[] | null
          sector?: string | null
          sector_extraction_method?: string | null
          source_database?: string | null
          source_document_fetched_at?: string | null
          source_document_hash?: string | null
          source_document_hash_at_ingest?: string | null
          source_document_text?: string | null
          source_url?: string | null
          statutory_provisions?: string[] | null
          statutory_provisions_evidence?: Json | null
          statutory_provisions_extraction_method?: string | null
          subject?: string | null
          tool_relevance?: string[] | null
          verification_deterministic_pass?: boolean | null
          verification_last_run_at?: string | null
          verification_paraphrase_confidence?: string | null
          verification_status?: string
          violation?: string | null
          violation_types?: string[] | null
        }
        Update: {
          action_type?: string | null
          appeal_status?: string | null
          appeal_status_extraction_method?: string | null
          biometric_related?: boolean | null
          breach_related?: boolean | null
          case_reference?: string | null
          case_reference_extraction_method?: string | null
          company_type?: string | null
          created_at?: string | null
          data_categories?: string[] | null
          decision_date?: string | null
          disposition_type?: string | null
          disposition_type_extraction_method?: string | null
          dpa_related?: boolean | null
          enrichment_version?: number | null
          etid?: string | null
          fine_amount?: string | null
          fine_amount_local?: string | null
          fine_currency?: string | null
          fine_eur?: number | null
          fine_eur_equivalent?: number | null
          id?: string
          industry_sector?: string | null
          ingestion_confidence?: string | null
          ingestion_method?: string | null
          ingestion_run_id?: string | null
          ingestion_strategy_used?: string | null
          jurisdiction?: string
          key_compliance_failure?: string | null
          last_source_fetch_at?: string | null
          law?: string | null
          legacy_enrichment_version?: number | null
          legacy_summary_text?: string | null
          legacy_summary_url?: string | null
          li_processed?: boolean
          memo_eligible?: boolean
          original_amount?: number | null
          original_currency?: string | null
          precedent_significance?: number | null
          preventive_measures?: string | null
          primary_source_status?: string | null
          primary_source_url?: string | null
          primary_source_url_discovered_at?: string | null
          raw_text?: string | null
          regulator?: string
          regulator_canonical?: string | null
          regulator_profile_version?: string | null
          regulatory_family?: string[] | null
          sector?: string | null
          sector_extraction_method?: string | null
          source_database?: string | null
          source_document_fetched_at?: string | null
          source_document_hash?: string | null
          source_document_hash_at_ingest?: string | null
          source_document_text?: string | null
          source_url?: string | null
          statutory_provisions?: string[] | null
          statutory_provisions_evidence?: Json | null
          statutory_provisions_extraction_method?: string | null
          subject?: string | null
          tool_relevance?: string[] | null
          verification_deterministic_pass?: boolean | null
          verification_last_run_at?: string | null
          verification_paraphrase_confidence?: string | null
          verification_status?: string
          violation?: string | null
          violation_types?: string[] | null
        }
        Relationships: []
      }
      enforcement_context_cache: {
        Row: {
          cache_key: string
          created_at: string
          response: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          response: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          response?: Json
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
      entity_relationships: {
        Row: {
          created_at: string | null
          from_entity_id: string | null
          id: string
          relationship: string
          source_article: string | null
          to_entity_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_entity_id?: string | null
          id?: string
          relationship: string
          source_article?: string | null
          to_entity_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_entity_id?: string | null
          id?: string
          relationship?: string
          source_article?: string | null
          to_entity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_relationships_from_entity_id_fkey"
            columns: ["from_entity_id"]
            isOneToOne: false
            referencedRelation: "regulatory_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relationships_source_article_fkey"
            columns: ["source_article"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relationships_to_entity_id_fkey"
            columns: ["to_entity_id"]
            isOneToOne: false
            referencedRelation: "regulatory_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      eu_notice_answers: {
        Row: {
          answer_value: Json
          answered_at: string
          id: string
          question_key: string
          ropa_activity_id: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          answer_value: Json
          answered_at?: string
          id?: string
          question_key: string
          ropa_activity_id?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          answer_value?: Json
          answered_at?: string
          id?: string
          question_key?: string
          ropa_activity_id?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eu_notice_answers_ropa_activity_id_fkey"
            columns: ["ropa_activity_id"]
            isOneToOne: false
            referencedRelation: "ropa_processing_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eu_notice_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "eu_notice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      eu_notice_documents: {
        Row: {
          client_id: string
          document_format: string
          file_path: string
          file_size_bytes: number | null
          framework_code: string
          generated_at: string
          id: string
          is_combined: boolean
          is_current: boolean
          session_id: string
          version_number: number
        }
        Insert: {
          client_id: string
          document_format: string
          file_path: string
          file_size_bytes?: number | null
          framework_code: string
          generated_at?: string
          id?: string
          is_combined?: boolean
          is_current?: boolean
          session_id: string
          version_number?: number
        }
        Update: {
          client_id?: string
          document_format?: string
          file_path?: string
          file_size_bytes?: number | null
          framework_code?: string
          generated_at?: string
          id?: string
          is_combined?: boolean
          is_current?: boolean
          session_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "eu_notice_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eu_notice_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "eu_notice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      eu_notice_framework_selections: {
        Row: {
          framework_code: string
          framework_name: string
          id: string
          region: string
          session_id: string
        }
        Insert: {
          framework_code: string
          framework_name: string
          id?: string
          region: string
          session_id: string
        }
        Update: {
          framework_code?: string
          framework_name?: string
          id?: string
          region?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eu_notice_framework_selections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "eu_notice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      eu_notice_sessions: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          is_refresh: boolean
          last_activity_at: string
          mode: string
          paid_at: string | null
          parent_session_id: string | null
          payment_confirmed: boolean
          ropa_session_id: string | null
          scope: string
          started_at: string
          status: string
          updated_at: string
          version_number: number
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_refresh?: boolean
          last_activity_at?: string
          mode?: string
          paid_at?: string | null
          parent_session_id?: string | null
          payment_confirmed?: boolean
          ropa_session_id?: string | null
          scope?: string
          started_at?: string
          status?: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_refresh?: boolean
          last_activity_at?: string
          mode?: string
          paid_at?: string | null
          parent_session_id?: string | null
          payment_confirmed?: boolean
          ropa_session_id?: string | null
          scope?: string
          started_at?: string
          status?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "eu_notice_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eu_notice_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "eu_notice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eu_notice_sessions_ropa_session_id_fkey"
            columns: ["ropa_session_id"]
            isOneToOne: false
            referencedRelation: "ropa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      eu_privacy_frameworks: {
        Row: {
          effective_date: string | null
          enforcement_body: string | null
          enforcement_url: string | null
          framework_code: string
          framework_name: string
          full_law_name: string
          is_active: boolean
          notes: string | null
          region: string
          template_type: string
        }
        Insert: {
          effective_date?: string | null
          enforcement_body?: string | null
          enforcement_url?: string | null
          framework_code: string
          framework_name: string
          full_law_name: string
          is_active?: boolean
          notes?: string | null
          region: string
          template_type: string
        }
        Update: {
          effective_date?: string | null
          enforcement_body?: string | null
          enforcement_url?: string | null
          framework_code?: string
          framework_name?: string
          full_law_name?: string
          is_active?: boolean
          notes?: string | null
          region?: string
          template_type?: string
        }
        Relationships: []
      }
      eup_user_roles: {
        Row: {
          action_brief_salutation: string
          id: string
          label: string
        }
        Insert: {
          action_brief_salutation: string
          id: string
          label: string
        }
        Update: {
          action_brief_salutation?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      free_digests: {
        Row: {
          digest_items: Json
          generated_at: string
          id: string
          jurisdictions_used: string[] | null
          pattern_observation: string | null
          period_end: string
          period_start: string
          topics_used: string[] | null
          user_id: string
          week_label: string
        }
        Insert: {
          digest_items?: Json
          generated_at?: string
          id?: string
          jurisdictions_used?: string[] | null
          pattern_observation?: string | null
          period_end: string
          period_start: string
          topics_used?: string[] | null
          user_id: string
          week_label: string
        }
        Update: {
          digest_items?: Json
          generated_at?: string
          id?: string
          jurisdictions_used?: string[] | null
          pattern_observation?: string | null
          period_end?: string
          period_start?: string
          topics_used?: string[] | null
          user_id?: string
          week_label?: string
        }
        Relationships: []
      }
      function_run_log: {
        Row: {
          function_name: string
          last_result: Json | null
          last_run_at: string | null
        }
        Insert: {
          function_name: string
          last_result?: Json | null
          last_run_at?: string | null
        }
        Update: {
          function_name?: string
          last_result?: Json | null
          last_run_at?: string | null
        }
        Relationships: []
      }
      governance_assessments: {
        Row: {
          client_id: string | null
          created_at: string | null
          dpia_scope: Json | null
          id: string
          intake_data: Json
          is_subscriber_credit: boolean | null
          pdf_url: string | null
          purchase_price_cents: number | null
          purchased_as_standalone: boolean | null
          report_data: Json | null
          report_version: number | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          dpia_scope?: Json | null
          id?: string
          intake_data?: Json
          is_subscriber_credit?: boolean | null
          pdf_url?: string | null
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          report_data?: Json | null
          report_version?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          dpia_scope?: Json | null
          id?: string
          intake_data?: Json
          is_subscriber_credit?: boolean | null
          pdf_url?: string | null
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          report_data?: Json | null
          report_version?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_spotlight: {
        Row: {
          created_at: string
          id: string
          slot: number
          spotlight_date: string
          update_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          slot: number
          spotlight_date: string
          update_id: string
        }
        Update: {
          created_at?: string
          id?: string
          slot?: number
          spotlight_date?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_spotlight_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      horizon_intelligence: {
        Row: {
          anticipated_development: string
          confidence: string | null
          created_at: string | null
          id: string
          jurisdiction: string | null
          recommended_action: string | null
          sector: string | null
          source_signal: string | null
          timeline_label: string | null
          week_of: string
        }
        Insert: {
          anticipated_development: string
          confidence?: string | null
          created_at?: string | null
          id?: string
          jurisdiction?: string | null
          recommended_action?: string | null
          sector?: string | null
          source_signal?: string | null
          timeline_label?: string | null
          week_of: string
        }
        Update: {
          anticipated_development?: string
          confidence?: string | null
          created_at?: string | null
          id?: string
          jurisdiction?: string | null
          recommended_action?: string | null
          sector?: string | null
          source_signal?: string | null
          timeline_label?: string | null
          week_of?: string
        }
        Relationships: []
      }
      ingestion_alert_state: {
        Row: {
          alert_key: string
          last_alerted_at: string
          last_payload: Json | null
        }
        Insert: {
          alert_key: string
          last_alerted_at?: string
          last_payload?: Json | null
        }
        Update: {
          alert_key?: string
          last_alerted_at?: string
          last_payload?: Json | null
        }
        Relationships: []
      }
      ingestion_runs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          enriched: number | null
          enrichment_failed_429: number | null
          enrichment_failed_other: number | null
          error_message: string | null
          errors: Json | null
          fetched: number | null
          finished_at: string | null
          id: string
          inserted: number | null
          job_name: string | null
          llm_calls_made: number | null
          llm_cost_usd: number | null
          metadata: Json | null
          notes: string | null
          regulator_canonical: string | null
          rows_discovered: number | null
          rows_failed: number | null
          rows_inserted_new: number | null
          rows_matched_legacy: number | null
          run_at: string
          skipped: number | null
          started_at: string | null
          status: string | null
          strategy_method: string | null
          summaries_generated: number | null
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          enriched?: number | null
          enrichment_failed_429?: number | null
          enrichment_failed_other?: number | null
          error_message?: string | null
          errors?: Json | null
          fetched?: number | null
          finished_at?: string | null
          id?: string
          inserted?: number | null
          job_name?: string | null
          llm_calls_made?: number | null
          llm_cost_usd?: number | null
          metadata?: Json | null
          notes?: string | null
          regulator_canonical?: string | null
          rows_discovered?: number | null
          rows_failed?: number | null
          rows_inserted_new?: number | null
          rows_matched_legacy?: number | null
          run_at?: string
          skipped?: number | null
          started_at?: string | null
          status?: string | null
          strategy_method?: string | null
          summaries_generated?: number | null
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          enriched?: number | null
          enrichment_failed_429?: number | null
          enrichment_failed_other?: number | null
          error_message?: string | null
          errors?: Json | null
          fetched?: number | null
          finished_at?: string | null
          id?: string
          inserted?: number | null
          job_name?: string | null
          llm_calls_made?: number | null
          llm_cost_usd?: number | null
          metadata?: Json | null
          notes?: string | null
          regulator_canonical?: string | null
          rows_discovered?: number | null
          rows_failed?: number | null
          rows_inserted_new?: number | null
          rows_matched_legacy?: number | null
          run_at?: string
          skipped?: number | null
          started_at?: string | null
          status?: string | null
          strategy_method?: string | null
          summaries_generated?: number | null
        }
        Relationships: []
      }
      ir_playbooks: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          intake_data: Json
          is_subscriber_credit: boolean | null
          pdf_url: string | null
          playbook_text: string | null
          purchase_price_cents: number | null
          purchased_as_standalone: boolean | null
          report_data: Json | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          intake_data?: Json
          is_subscriber_credit?: boolean | null
          pdf_url?: string | null
          playbook_text?: string | null
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          report_data?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          intake_data?: Json
          is_subscriber_credit?: boolean | null
          pdf_url?: string | null
          playbook_text?: string | null
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          report_data?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ir_playbooks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdiction_canonical: {
        Row: {
          canonical_name: string
          display_name: string
          is_subnational: boolean
          iso_country_code: string | null
          iso_subdivision_code: string | null
          notes: string | null
          parent_jurisdiction: string | null
        }
        Insert: {
          canonical_name: string
          display_name: string
          is_subnational?: boolean
          iso_country_code?: string | null
          iso_subdivision_code?: string | null
          notes?: string | null
          parent_jurisdiction?: string | null
        }
        Update: {
          canonical_name?: string
          display_name?: string
          is_subnational?: boolean
          iso_country_code?: string | null
          iso_subdivision_code?: string | null
          notes?: string | null
          parent_jurisdiction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jurisdiction_canonical_parent_jurisdiction_fkey"
            columns: ["parent_jurisdiction"]
            isOneToOne: false
            referencedRelation: "jurisdiction_canonical"
            referencedColumns: ["canonical_name"]
          },
        ]
      }
      jurisdiction_monitoring_log: {
        Row: {
          check_type: string
          detected_at: string
          id: string
          jurisdiction_code: string
          new_value: string | null
          previous_value: string | null
          reviewed: boolean
          reviewer_notes: string | null
          source_url: string | null
        }
        Insert: {
          check_type: string
          detected_at?: string
          id?: string
          jurisdiction_code: string
          new_value?: string | null
          previous_value?: string | null
          reviewed?: boolean
          reviewer_notes?: string | null
          source_url?: string | null
        }
        Update: {
          check_type?: string
          detected_at?: string
          id?: string
          jurisdiction_code?: string
          new_value?: string | null
          previous_value?: string | null
          reviewed?: boolean
          reviewer_notes?: string | null
          source_url?: string | null
        }
        Relationships: []
      }
      jurisdiction_requirements: {
        Row: {
          ai_registration_required: boolean
          ai_threshold: string | null
          authority_name: string
          authority_url: string | null
          created_at: string
          dpo_required: boolean
          dpo_threshold: string | null
          filing_currency: string | null
          filing_fee_cents: number | null
          filing_portal_url: string | null
          id: string
          jurisdiction_code: string
          jurisdiction_name: string
          language_requirements: string[] | null
          last_verified_at: string | null
          law_name: string
          notes: string | null
          online_filing_available: boolean
          region: string
          registration_required: boolean
          registration_threshold: string | null
          renewal_period_months: number | null
          representative_required: boolean
          representative_threshold: string | null
          updated_at: string
        }
        Insert: {
          ai_registration_required?: boolean
          ai_threshold?: string | null
          authority_name: string
          authority_url?: string | null
          created_at?: string
          dpo_required?: boolean
          dpo_threshold?: string | null
          filing_currency?: string | null
          filing_fee_cents?: number | null
          filing_portal_url?: string | null
          id?: string
          jurisdiction_code: string
          jurisdiction_name: string
          language_requirements?: string[] | null
          last_verified_at?: string | null
          law_name: string
          notes?: string | null
          online_filing_available?: boolean
          region: string
          registration_required?: boolean
          registration_threshold?: string | null
          renewal_period_months?: number | null
          representative_required?: boolean
          representative_threshold?: string | null
          updated_at?: string
        }
        Update: {
          ai_registration_required?: boolean
          ai_threshold?: string | null
          authority_name?: string
          authority_url?: string | null
          created_at?: string
          dpo_required?: boolean
          dpo_threshold?: string | null
          filing_currency?: string | null
          filing_fee_cents?: number | null
          filing_portal_url?: string | null
          id?: string
          jurisdiction_code?: string
          jurisdiction_name?: string
          language_requirements?: string[] | null
          last_verified_at?: string | null
          law_name?: string
          notes?: string | null
          online_filing_available?: boolean
          region?: string
          registration_required?: boolean
          registration_threshold?: string | null
          renewal_period_months?: number | null
          representative_required?: boolean
          representative_threshold?: string | null
          updated_at?: string
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
      legislation_bills: {
        Row: {
          bill_name: string
          bill_number: string | null
          created_at: string
          external_id: string
          id: string
          introduced_at: string | null
          iso2: string | null
          jurisdiction: string
          jurisdiction_slug: string | null
          key_provisions: string[] | null
          last_changed_at: string
          last_seen_at: string
          matched_keywords: string[] | null
          raw_payload: Json | null
          region: string | null
          source: string
          source_last_action_at: string | null
          source_name: string | null
          source_url: string | null
          stage: string
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          bill_name: string
          bill_number?: string | null
          created_at?: string
          external_id: string
          id?: string
          introduced_at?: string | null
          iso2?: string | null
          jurisdiction: string
          jurisdiction_slug?: string | null
          key_provisions?: string[] | null
          last_changed_at?: string
          last_seen_at?: string
          matched_keywords?: string[] | null
          raw_payload?: Json | null
          region?: string | null
          source: string
          source_last_action_at?: string | null
          source_name?: string | null
          source_url?: string | null
          stage: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          bill_name?: string
          bill_number?: string | null
          created_at?: string
          external_id?: string
          id?: string
          introduced_at?: string | null
          iso2?: string | null
          jurisdiction?: string
          jurisdiction_slug?: string | null
          key_provisions?: string[] | null
          last_changed_at?: string
          last_seen_at?: string
          matched_keywords?: string[] | null
          raw_payload?: Json | null
          region?: string | null
          source?: string
          source_last_action_at?: string | null
          source_name?: string | null
          source_url?: string | null
          stage?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      legislation_ingestion_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          fetched: number
          finished_at: string | null
          id: string
          inserted: number
          metadata: Json | null
          rejected: number
          rejected_samples: Json | null
          source: string
          started_at: string
          status: string
          unchanged: number
          updated: number
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          fetched?: number
          finished_at?: string | null
          id?: string
          inserted?: number
          metadata?: Json | null
          rejected?: number
          rejected_samples?: Json | null
          source: string
          started_at?: string
          status?: string
          unchanged?: number
          updated?: number
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          fetched?: number
          finished_at?: string | null
          id?: string
          inserted?: number
          metadata?: Json | null
          rejected?: number
          rejected_samples?: Json | null
          source?: string
          started_at?: string
          status?: string
          unchanged?: number
          updated?: number
        }
        Relationships: []
      }
      li_assessments: {
        Row: {
          alternatives_considered: string | null
          balancing_details: Json | null
          client_id: string | null
          created_at: string | null
          data_categories: string[] | null
          id: string
          is_subscriber_credit: boolean | null
          jurisdictions: string[] | null
          necessity_details: Json | null
          pdf_url: string | null
          preview_signal: Json | null
          processing_description: string
          purchase_price_cents: number | null
          purchased_as_standalone: boolean | null
          purpose_details: Json | null
          relationship_type: string | null
          report_data: Json | null
          report_version: number | null
          sector: string | null
          stage: string
          stated_purpose: string | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alternatives_considered?: string | null
          balancing_details?: Json | null
          client_id?: string | null
          created_at?: string | null
          data_categories?: string[] | null
          id?: string
          is_subscriber_credit?: boolean | null
          jurisdictions?: string[] | null
          necessity_details?: Json | null
          pdf_url?: string | null
          preview_signal?: Json | null
          processing_description: string
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          purpose_details?: Json | null
          relationship_type?: string | null
          report_data?: Json | null
          report_version?: number | null
          sector?: string | null
          stage?: string
          stated_purpose?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alternatives_considered?: string | null
          balancing_details?: Json | null
          client_id?: string | null
          created_at?: string | null
          data_categories?: string[] | null
          id?: string
          is_subscriber_credit?: boolean | null
          jurisdictions?: string[] | null
          necessity_details?: Json | null
          pdf_url?: string | null
          preview_signal?: Json | null
          processing_description?: string
          purchase_price_cents?: number | null
          purchased_as_standalone?: boolean | null
          purpose_details?: Json | null
          relationship_type?: string | null
          report_data?: Json | null
          report_version?: number | null
          sector?: string | null
          stage?: string
          stated_purpose?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "li_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      li_tracker_entries: {
        Row: {
          case_reference: string | null
          confidence: string
          created_at: string | null
          dpa_source: string
          id: string
          jurisdiction: string
          last_confirmed: string | null
          outcome: string
          processing_activity: string
          signal_type: string
          source_article_id: string | null
          source_enforcement_id: string | null
          source_url: string | null
          summary: string
          updated_at: string | null
        }
        Insert: {
          case_reference?: string | null
          confidence?: string
          created_at?: string | null
          dpa_source: string
          id?: string
          jurisdiction: string
          last_confirmed?: string | null
          outcome: string
          processing_activity: string
          signal_type: string
          source_article_id?: string | null
          source_enforcement_id?: string | null
          source_url?: string | null
          summary: string
          updated_at?: string | null
        }
        Update: {
          case_reference?: string | null
          confidence?: string
          created_at?: string | null
          dpa_source?: string
          id?: string
          jurisdiction?: string
          last_confirmed?: string | null
          outcome?: string
          processing_activity?: string
          signal_type?: string
          source_article_id?: string | null
          source_enforcement_id?: string | null
          source_url?: string | null
          summary?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "li_tracker_entries_source_article_id_fkey"
            columns: ["source_article_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      li_trend_summaries: {
        Row: {
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          summary: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          summary: string
        }
        Update: {
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          summary?: string
        }
        Relationships: []
      }
      longitudinal_signals: {
        Row: {
          article_count: number | null
          generated_at: string
          id: string
          jurisdictions_active: string[] | null
          key_observations: Json | null
          period_days: number
          period_end: string
          period_start: string
          sectors_affected: string[] | null
          source_article_ids: string[] | null
          summary: string | null
          topic_area: string
        }
        Insert: {
          article_count?: number | null
          generated_at?: string
          id?: string
          jurisdictions_active?: string[] | null
          key_observations?: Json | null
          period_days: number
          period_end: string
          period_start: string
          sectors_affected?: string[] | null
          source_article_ids?: string[] | null
          summary?: string | null
          topic_area: string
        }
        Update: {
          article_count?: number | null
          generated_at?: string
          id?: string
          jurisdictions_active?: string[] | null
          key_observations?: Json | null
          period_days?: number
          period_end?: string
          period_start?: string
          sectors_affected?: string[] | null
          source_article_ids?: string[] | null
          summary?: string | null
          topic_area?: string
        }
        Relationships: []
      }
      professional_clients: {
        Row: {
          client_matter: string | null
          client_name: string
          created_at: string | null
          free_run_reset_date: string | null
          free_run_used_this_month: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_matter?: string | null
          client_name: string
          created_at?: string | null
          free_run_reset_date?: string | null
          free_run_used_this_month?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_matter?: string | null
          client_name?: string
          created_at?: string | null
          free_run_reset_date?: string | null
          free_run_used_this_month?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ask_privacy_count: number | null
          ask_privacy_reset_date: string | null
          bonus_report_credits: number
          brief_role: string | null
          cancel_at_period_end: boolean
          company_size: string | null
          created_at: string
          digest_jurisdictions: string[] | null
          digest_topics: string[] | null
          founding_subscriber: boolean | null
          founding_subscriber_set_at: string | null
          free_tool_run_reset_date: string | null
          free_tool_run_used_this_month: boolean | null
          id: string
          industry: string | null
          is_premium: boolean
          is_pro: boolean | null
          jurisdictions: string[] | null
          monthly_reports_used: number
          onboarding_complete: boolean | null
          payment_failed: boolean
          preferred_language: string
          primary_jurisdiction: string | null
          professional_annual: boolean | null
          reports_reset_date: string | null
          role_confirmed_at: string | null
          sector: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          stripe_trial_end: string | null
          subscription_end_date: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          subscription_tier: string | null
          subscription_type: string | null
          updated_at: string
          user_role: string | null
        }
        Insert: {
          ask_privacy_count?: number | null
          ask_privacy_reset_date?: string | null
          bonus_report_credits?: number
          brief_role?: string | null
          cancel_at_period_end?: boolean
          company_size?: string | null
          created_at?: string
          digest_jurisdictions?: string[] | null
          digest_topics?: string[] | null
          founding_subscriber?: boolean | null
          founding_subscriber_set_at?: string | null
          free_tool_run_reset_date?: string | null
          free_tool_run_used_this_month?: boolean | null
          id: string
          industry?: string | null
          is_premium?: boolean
          is_pro?: boolean | null
          jurisdictions?: string[] | null
          monthly_reports_used?: number
          onboarding_complete?: boolean | null
          payment_failed?: boolean
          preferred_language?: string
          primary_jurisdiction?: string | null
          professional_annual?: boolean | null
          reports_reset_date?: string | null
          role_confirmed_at?: string | null
          sector?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_trial_end?: string | null
          subscription_end_date?: string | null
          subscription_interval?: string | null
          subscription_plan?: string | null
          subscription_tier?: string | null
          subscription_type?: string | null
          updated_at?: string
          user_role?: string | null
        }
        Update: {
          ask_privacy_count?: number | null
          ask_privacy_reset_date?: string | null
          bonus_report_credits?: number
          brief_role?: string | null
          cancel_at_period_end?: boolean
          company_size?: string | null
          created_at?: string
          digest_jurisdictions?: string[] | null
          digest_topics?: string[] | null
          founding_subscriber?: boolean | null
          founding_subscriber_set_at?: string | null
          free_tool_run_reset_date?: string | null
          free_tool_run_used_this_month?: boolean | null
          id?: string
          industry?: string | null
          is_premium?: boolean
          is_pro?: boolean | null
          jurisdictions?: string[] | null
          monthly_reports_used?: number
          onboarding_complete?: boolean | null
          payment_failed?: boolean
          preferred_language?: string
          primary_jurisdiction?: string | null
          professional_annual?: boolean | null
          reports_reset_date?: string | null
          role_confirmed_at?: string | null
          sector?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_trial_end?: string | null
          subscription_end_date?: string | null
          subscription_interval?: string | null
          subscription_plan?: string | null
          subscription_tier?: string | null
          subscription_type?: string | null
          updated_at?: string
          user_role?: string | null
        }
        Relationships: []
      }
      questionnaire_versions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          schema: Json
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          schema: Json
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          schema?: Json
          version?: string
        }
        Relationships: []
      }
      registration_assessments: {
        Row: {
          client_id: string | null
          confidence_tier: string | null
          converted_order_id: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          intake_data: Json
          organization_country: string | null
          organization_name: string | null
          organization_size: string | null
          recommended_jurisdictions: string[] | null
          result_summary: Json | null
          shareable_token: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          confidence_tier?: string | null
          converted_order_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          intake_data?: Json
          organization_country?: string | null
          organization_name?: string | null
          organization_size?: string | null
          recommended_jurisdictions?: string[] | null
          result_summary?: Json | null
          shareable_token?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          confidence_tier?: string | null
          converted_order_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          intake_data?: Json
          organization_country?: string | null
          organization_name?: string | null
          organization_size?: string | null
          recommended_jurisdictions?: string[] | null
          result_summary?: Json | null
          shareable_token?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_audit_log: {
        Row: {
          action: string
          assessment_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          order_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          assessment_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          assessment_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_audit_log_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "registration_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_audit_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "registration_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_documents: {
        Row: {
          content_text: string | null
          created_at: string
          document_type: string
          generation_model: string | null
          id: string
          jurisdiction_code: string
          language: string
          order_id: string
          pdf_url: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          document_type: string
          generation_model?: string | null
          id?: string
          jurisdiction_code: string
          language?: string
          order_id: string
          pdf_url?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          content_text?: string | null
          created_at?: string
          document_type?: string
          generation_model?: string | null
          id?: string
          jurisdiction_code?: string
          language?: string
          order_id?: string
          pdf_url?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "registration_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "registration_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_filings: {
        Row: {
          confirmation_pdf_url: string | null
          confirmation_url: string | null
          created_at: string
          expires_at: string | null
          filed_at: string
          filing_method: string | null
          filing_reference: string | null
          id: string
          jurisdiction_code: string
          notes: string | null
          order_id: string
        }
        Insert: {
          confirmation_pdf_url?: string | null
          confirmation_url?: string | null
          created_at?: string
          expires_at?: string | null
          filed_at?: string
          filing_method?: string | null
          filing_reference?: string | null
          id?: string
          jurisdiction_code: string
          notes?: string | null
          order_id: string
        }
        Update: {
          confirmation_pdf_url?: string | null
          confirmation_url?: string | null
          created_at?: string
          expires_at?: string | null
          filed_at?: string
          filing_method?: string | null
          filing_reference?: string | null
          id?: string
          jurisdiction_code?: string
          notes?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_filings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "registration_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_orders: {
        Row: {
          amount_cents: number
          assessment_id: string | null
          client_id: string | null
          created_at: string
          currency: string
          delivery_email: string | null
          delivery_sent_at: string | null
          documents_generated_at: string | null
          filed_at: string | null
          fulfillment_status: string
          id: string
          jurisdictions: string[]
          next_renewal_at: string | null
          organization_snapshot: Json
          payment_status: string
          renewal_reminder_email: string | null
          renewal_reminders_enabled: boolean
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          assessment_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          delivery_email?: string | null
          delivery_sent_at?: string | null
          documents_generated_at?: string | null
          filed_at?: string | null
          fulfillment_status?: string
          id?: string
          jurisdictions?: string[]
          next_renewal_at?: string | null
          organization_snapshot: Json
          payment_status?: string
          renewal_reminder_email?: string | null
          renewal_reminders_enabled?: boolean
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          assessment_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          delivery_email?: string | null
          delivery_sent_at?: string | null
          documents_generated_at?: string | null
          filed_at?: string | null
          fulfillment_status?: string
          id?: string
          jurisdictions?: string[]
          next_renewal_at?: string | null
          organization_snapshot?: Json
          payment_status?: string
          renewal_reminder_email?: string | null
          renewal_reminders_enabled?: boolean
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_orders_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "registration_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      regulator_profiles: {
        Row: {
          active: boolean
          canonical_name: string
          case_reference_pattern: string | null
          coverage_assessment: string | null
          created_at: string
          currency_code: string
          date_formats: string[]
          default_language: string
          fetch_rate_limit_ms: number
          fetch_user_agent_strategy: string
          field_recipes: Json
          jurisdiction: string
          known_issues: string[] | null
          law_canonical: string
          llm_extraction_model: string
          profile_version: string
          regulatory_family: string[]
          requires_js_render: boolean
          respect_robots_txt: boolean
          strategy_stack: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          canonical_name: string
          case_reference_pattern?: string | null
          coverage_assessment?: string | null
          created_at?: string
          currency_code?: string
          date_formats?: string[]
          default_language: string
          fetch_rate_limit_ms?: number
          fetch_user_agent_strategy?: string
          field_recipes?: Json
          jurisdiction: string
          known_issues?: string[] | null
          law_canonical: string
          llm_extraction_model?: string
          profile_version?: string
          regulatory_family?: string[]
          requires_js_render?: boolean
          respect_robots_txt?: boolean
          strategy_stack?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          canonical_name?: string
          case_reference_pattern?: string | null
          coverage_assessment?: string | null
          created_at?: string
          currency_code?: string
          date_formats?: string[]
          default_language?: string
          fetch_rate_limit_ms?: number
          fetch_user_agent_strategy?: string
          field_recipes?: Json
          jurisdiction?: string
          known_issues?: string[] | null
          law_canonical?: string
          llm_extraction_model?: string
          profile_version?: string
          regulatory_family?: string[]
          requires_js_render?: boolean
          respect_robots_txt?: boolean
          strategy_stack?: Json
          updated_at?: string
        }
        Relationships: []
      }
      regulatory_drift_alerts: {
        Row: {
          created_at: string
          id: string
          law_slug: string
          matched_at: string
          matched_update_id: string | null
          matched_update_title: string | null
          matched_update_url: string | null
          milestone_id: string | null
          resolution: string | null
          reviewed: boolean
          reviewed_at: string | null
          signal_keyword: string
        }
        Insert: {
          created_at?: string
          id?: string
          law_slug: string
          matched_at?: string
          matched_update_id?: string | null
          matched_update_title?: string | null
          matched_update_url?: string | null
          milestone_id?: string | null
          resolution?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          signal_keyword: string
        }
        Update: {
          created_at?: string
          id?: string
          law_slug?: string
          matched_at?: string
          matched_update_id?: string | null
          matched_update_title?: string | null
          matched_update_url?: string | null
          milestone_id?: string | null
          resolution?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          signal_keyword?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_drift_alerts_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "regulatory_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_entities: {
        Row: {
          created_at: string | null
          entity_type: string
          id: string
          jurisdiction: string | null
          metadata: Json | null
          name: string
        }
        Insert: {
          created_at?: string | null
          entity_type: string
          id?: string
          jurisdiction?: string | null
          metadata?: Json | null
          name: string
        }
        Update: {
          created_at?: string | null
          entity_type?: string
          id?: string
          jurisdiction?: string | null
          metadata?: Json | null
          name?: string
        }
        Relationships: []
      }
      regulatory_family_mapping: {
        Row: {
          id: string
          jurisdiction: string
          notes: string | null
          primary_statute: string | null
          regulator: string
          regulatory_family: string
        }
        Insert: {
          id?: string
          jurisdiction: string
          notes?: string | null
          primary_statute?: string | null
          regulator: string
          regulatory_family: string
        }
        Update: {
          id?: string
          jurisdiction?: string
          notes?: string | null
          primary_statute?: string | null
          regulator?: string
          regulatory_family?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_family_mapping_jurisdiction_fkey"
            columns: ["jurisdiction"]
            isOneToOne: false
            referencedRelation: "jurisdiction_canonical"
            referencedColumns: ["canonical_name"]
          },
        ]
      }
      regulatory_guidance: {
        Row: {
          created_at: string
          document_type: string
          effective_date: string | null
          full_text: string | null
          id: string
          jurisdiction: string
          last_source_fetch_at: string | null
          regulator: string
          regulatory_family: string[]
          source_document_hash: string | null
          source_url: string
          summary: string | null
          title: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          document_type: string
          effective_date?: string | null
          full_text?: string | null
          id?: string
          jurisdiction: string
          last_source_fetch_at?: string | null
          regulator: string
          regulatory_family?: string[]
          source_document_hash?: string | null
          source_url: string
          summary?: string | null
          title: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          effective_date?: string | null
          full_text?: string | null
          id?: string
          jurisdiction?: string
          last_source_fetch_at?: string | null
          regulator?: string
          regulatory_family?: string[]
          source_document_hash?: string | null
          source_url?: string
          summary?: string | null
          title?: string
          verification_status?: string
        }
        Relationships: []
      }
      regulatory_milestones: {
        Row: {
          created_at: string
          description: string | null
          id: string
          jurisdiction: string
          law_slug: string
          milestone_date: string
          milestone_type: string
          notes: string | null
          source_url: string | null
          superseded_by: string | null
          title: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          jurisdiction: string
          law_slug: string
          milestone_date: string
          milestone_type: string
          notes?: string | null
          source_url?: string | null
          superseded_by?: string | null
          title: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          jurisdiction?: string
          law_slug?: string
          milestone_date?: string
          milestone_type?: string
          notes?: string | null
          source_url?: string | null
          superseded_by?: string | null
          title?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_milestones_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "regulatory_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_notifications: {
        Row: {
          delivery_status: string
          filing_id: string | null
          id: string
          notification_type: string
          order_id: string
          recipient_email: string
          sent_at: string
        }
        Insert: {
          delivery_status?: string
          filing_id?: string | null
          id?: string
          notification_type: string
          order_id: string
          recipient_email: string
          sent_at?: string
        }
        Update: {
          delivery_status?: string
          filing_id?: string | null
          id?: string
          notification_type?: string
          order_id?: string
          recipient_email?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_notifications_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "registration_filings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "registration_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      report_configs: {
        Row: {
          converted: boolean | null
          created_at: string | null
          email: string | null
          id: string
          industry: string | null
          jurisdiction: string
          topics: string[]
          user_id: string | null
        }
        Insert: {
          converted?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          jurisdiction: string
          topics: string[]
          user_id?: string | null
        }
        Update: {
          converted?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          jurisdiction?: string
          topics?: string[]
          user_id?: string | null
        }
        Relationships: []
      }
      report_translations: {
        Row: {
          content_hash: string
          created_at: string
          id: string
          model: string | null
          report_id: string
          report_type: string
          source_lang: string
          target_lang: string
          translated_content: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string
          id?: string
          model?: string | null
          report_id: string
          report_type: string
          source_lang?: string
          target_lang: string
          translated_content: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string
          id?: string
          model?: string | null
          report_id?: string
          report_type?: string
          source_lang?: string
          target_lang?: string
          translated_content?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      research_syntheses: {
        Row: {
          article_count: number
          article_ids_used: Json
          created_at: string
          generated_at: string | null
          headlines: Json
          id: string
          model_used: string
          page_slug: string
          section_heading: string
          section_key: string
          synthesis_text: string | null
          topic_filters: Json
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          article_count?: number
          article_ids_used?: Json
          created_at?: string
          generated_at?: string | null
          headlines?: Json
          id?: string
          model_used?: string
          page_slug: string
          section_heading: string
          section_key: string
          synthesis_text?: string | null
          topic_filters?: Json
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          article_count?: number
          article_ids_used?: Json
          created_at?: string
          generated_at?: string | null
          headlines?: Json
          id?: string
          model_used?: string
          page_slug?: string
          section_heading?: string
          section_key?: string
          synthesis_text?: string | null
          topic_filters?: Json
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      ropa_activity_templates: {
        Row: {
          category: string
          description: string
          display_name: string
          display_order: number
          id: string
          is_active: boolean
          is_high_risk: boolean
          is_public_facing: boolean
          sector_tags: string[]
          template_key: string
        }
        Insert: {
          category: string
          description: string
          display_name: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_high_risk?: boolean
          is_public_facing?: boolean
          sector_tags?: string[]
          template_key: string
        }
        Update: {
          category?: string
          description?: string
          display_name?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_high_risk?: boolean
          is_public_facing?: boolean
          sector_tags?: string[]
          template_key?: string
        }
        Relationships: []
      }
      ropa_answers: {
        Row: {
          activity_id: string
          answer_value: Json
          answered_at: string
          id: string
          question_key: string
          session_id: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          answer_value: Json
          answered_at?: string
          id?: string
          question_key: string
          session_id: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          answer_value?: Json
          answered_at?: string
          id?: string
          question_key?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ropa_answers_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "ropa_processing_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ropa_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ropa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ropa_client_profiles: {
        Row: {
          client_id: string
          created_at: string
          dpo_email: string | null
          dpo_name: string | null
          dpo_phone: string | null
          employee_band: string | null
          eu_rep_email: string | null
          eu_rep_name: string | null
          is_controller: boolean
          is_processor: boolean
          legal_entity_type: string | null
          uk_rep_email: string | null
          uk_rep_name: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          dpo_email?: string | null
          dpo_name?: string | null
          dpo_phone?: string | null
          employee_band?: string | null
          eu_rep_email?: string | null
          eu_rep_name?: string | null
          is_controller?: boolean
          is_processor?: boolean
          legal_entity_type?: string | null
          uk_rep_email?: string | null
          uk_rep_name?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          dpo_email?: string | null
          dpo_name?: string | null
          dpo_phone?: string | null
          employee_band?: string | null
          eu_rep_email?: string | null
          eu_rep_name?: string | null
          is_controller?: boolean
          is_processor?: boolean
          legal_entity_type?: string | null
          uk_rep_email?: string | null
          uk_rep_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ropa_client_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ropa_document_versions: {
        Row: {
          activities_count: number
          change_summary: string | null
          client_id: string
          document_format: string
          file_path: string
          file_size_bytes: number | null
          generated_at: string
          id: string
          is_current: boolean
          jurisdictions_covered: string[]
          session_id: string
          version_number: number
        }
        Insert: {
          activities_count?: number
          change_summary?: string | null
          client_id: string
          document_format: string
          file_path: string
          file_size_bytes?: number | null
          generated_at?: string
          id?: string
          is_current?: boolean
          jurisdictions_covered?: string[]
          session_id: string
          version_number: number
        }
        Update: {
          activities_count?: number
          change_summary?: string | null
          client_id?: string
          document_format?: string
          file_path?: string
          file_size_bytes?: number | null
          generated_at?: string
          id?: string
          is_current?: boolean
          jurisdictions_covered?: string[]
          session_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ropa_document_versions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ropa_document_versions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ropa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ropa_flags: {
        Row: {
          action_label: string | null
          action_route: string | null
          activity_id: string | null
          consequence: string | null
          created_at: string
          flag_message: string
          flag_type: string
          id: string
          question_key: string | null
          resolved: boolean
          resolved_at: string | null
          session_id: string
          severity: string
        }
        Insert: {
          action_label?: string | null
          action_route?: string | null
          activity_id?: string | null
          consequence?: string | null
          created_at?: string
          flag_message: string
          flag_type: string
          id?: string
          question_key?: string | null
          resolved?: boolean
          resolved_at?: string | null
          session_id: string
          severity?: string
        }
        Update: {
          action_label?: string | null
          action_route?: string | null
          activity_id?: string | null
          consequence?: string | null
          created_at?: string
          flag_message?: string
          flag_type?: string
          id?: string
          question_key?: string | null
          resolved?: boolean
          resolved_at?: string | null
          session_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "ropa_flags_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "ropa_processing_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ropa_flags_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ropa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ropa_jurisdiction_selections: {
        Row: {
          added_at: string
          client_id: string
          id: string
          jurisdiction_code: string
          jurisdiction_name: string
          jurisdiction_region: string
        }
        Insert: {
          added_at?: string
          client_id: string
          id?: string
          jurisdiction_code: string
          jurisdiction_name: string
          jurisdiction_region: string
        }
        Update: {
          added_at?: string
          client_id?: string
          id?: string
          jurisdiction_code?: string
          jurisdiction_name?: string
          jurisdiction_region?: string
        }
        Relationships: [
          {
            foreignKeyName: "ropa_jurisdiction_selections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ropa_noted_regulatory_updates: {
        Row: {
          article_id: string
          article_title: string
          article_url: string
          client_id: string
          id: string
          jurisdiction_code: string
          noted_at: string
          session_id: string
          urgency: string
        }
        Insert: {
          article_id: string
          article_title: string
          article_url: string
          client_id: string
          id?: string
          jurisdiction_code: string
          noted_at?: string
          session_id: string
          urgency: string
        }
        Update: {
          article_id?: string
          article_title?: string
          article_url?: string
          client_id?: string
          id?: string
          jurisdiction_code?: string
          noted_at?: string
          session_id?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "ropa_noted_regulatory_updates_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ropa_noted_regulatory_updates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ropa_noted_regulatory_updates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ropa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ropa_processing_activities: {
        Row: {
          category: string
          client_id: string
          completion_pct: number
          created_at: string
          display_name: string
          display_order: number
          id: string
          is_high_risk: boolean
          is_public_facing: boolean
          session_id: string
          status: string
          template_key: string | null
          updated_at: string
        }
        Insert: {
          category: string
          client_id: string
          completion_pct?: number
          created_at?: string
          display_name: string
          display_order?: number
          id?: string
          is_high_risk?: boolean
          is_public_facing?: boolean
          session_id: string
          status?: string
          template_key?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          completion_pct?: number
          created_at?: string
          display_name?: string
          display_order?: number
          id?: string
          is_high_risk?: boolean
          is_public_facing?: boolean
          session_id?: string
          status?: string
          template_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ropa_processing_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ropa_processing_activities_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ropa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ropa_refresh_cycles: {
        Row: {
          activities_added: number
          activities_confirmed: number
          activities_updated: number
          client_id: string
          completed_at: string | null
          id: string
          initiated_at: string
          new_session_id: string | null
          source_session_id: string
        }
        Insert: {
          activities_added?: number
          activities_confirmed?: number
          activities_updated?: number
          client_id: string
          completed_at?: string | null
          id?: string
          initiated_at?: string
          new_session_id?: string | null
          source_session_id: string
        }
        Update: {
          activities_added?: number
          activities_confirmed?: number
          activities_updated?: number
          client_id?: string
          completed_at?: string | null
          id?: string
          initiated_at?: string
          new_session_id?: string | null
          source_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ropa_refresh_cycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ropa_refresh_cycles_new_session_id_fkey"
            columns: ["new_session_id"]
            isOneToOne: false
            referencedRelation: "ropa_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ropa_refresh_cycles_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "ropa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ropa_refresh_reminders: {
        Row: {
          client_id: string
          id: string
          recipient_email: string | null
          sent_at: string
          source_session_id: string
          updates_count: number
        }
        Insert: {
          client_id: string
          id?: string
          recipient_email?: string | null
          sent_at?: string
          source_session_id: string
          updates_count?: number
        }
        Update: {
          client_id?: string
          id?: string
          recipient_email?: string | null
          sent_at?: string
          source_session_id?: string
          updates_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ropa_refresh_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ropa_refresh_reminders_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "ropa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ropa_sessions: {
        Row: {
          client_id: string
          completed_activities: number
          completed_at: string | null
          created_at: string
          generated_docx_path: string | null
          generated_pdf_path: string | null
          generated_xlsx_path: string | null
          id: string
          is_refresh: boolean
          last_activity_at: string
          open_flags_count: number
          paid_at: string | null
          parent_session_id: string | null
          payment_confirmed: boolean
          started_at: string
          status: string
          total_activities: number
          updated_at: string
          version_number: number
        }
        Insert: {
          client_id: string
          completed_activities?: number
          completed_at?: string | null
          created_at?: string
          generated_docx_path?: string | null
          generated_pdf_path?: string | null
          generated_xlsx_path?: string | null
          id?: string
          is_refresh?: boolean
          last_activity_at?: string
          open_flags_count?: number
          paid_at?: string | null
          parent_session_id?: string | null
          payment_confirmed?: boolean
          started_at?: string
          status?: string
          total_activities?: number
          updated_at?: string
          version_number?: number
        }
        Update: {
          client_id?: string
          completed_activities?: number
          completed_at?: string | null
          created_at?: string
          generated_docx_path?: string | null
          generated_pdf_path?: string | null
          generated_xlsx_path?: string | null
          id?: string
          is_refresh?: boolean
          last_activity_at?: string
          open_flags_count?: number
          paid_at?: string | null
          parent_session_id?: string | null
          payment_confirmed?: boolean
          started_at?: string
          status?: string
          total_activities?: number
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ropa_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ropa_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "ropa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_brief_translations: {
        Row: {
          created_at: string
          id: string
          language_code: string
          translated_content: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          translated_content: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          translated_content?: string
          updated_at?: string
        }
        Relationships: []
      }
      source_document_cache: {
        Row: {
          content_hash: string
          content_text: string
          content_type: string
          expires_at: string
          fetched_at: string
          source_url: string
        }
        Insert: {
          content_hash: string
          content_text: string
          content_type: string
          expires_at?: string
          fetched_at?: string
          source_url: string
        }
        Update: {
          content_hash?: string
          content_text?: string
          content_type?: string
          expires_at?: string
          fetched_at?: string
          source_url?: string
        }
        Relationships: []
      }
      sponsorships: {
        Row: {
          active: boolean | null
          created_at: string | null
          ends_at: string | null
          id: string
          label: string | null
          link_url: string | null
          logo_url: string | null
          placement: string | null
          sponsor_name: string
          starts_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          label?: string | null
          link_url?: string | null
          logo_url?: string | null
          placement?: string | null
          sponsor_name: string
          starts_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          label?: string | null
          link_url?: string | null
          logo_url?: string | null
          placement?: string | null
          sponsor_name?: string
          starts_at?: string | null
        }
        Relationships: []
      }
      state_law_overrides: {
        Row: {
          authority_name: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          effective_date: string | null
          state_name: string
          state_slug: string
          statute_name: string | null
          statute_status: string
          statute_url: string | null
        }
        Insert: {
          authority_name?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          effective_date?: string | null
          state_name: string
          state_slug: string
          statute_name?: string | null
          statute_status: string
          statute_url?: string | null
        }
        Update: {
          authority_name?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          effective_date?: string | null
          state_name?: string
          state_slug?: string
          statute_name?: string | null
          statute_status?: string
          statute_url?: string | null
        }
        Relationships: []
      }
      state_law_update_candidates: {
        Row: {
          confidence: string | null
          detected_at: string | null
          detected_authority: string | null
          detected_effective_date: string | null
          detected_law_name: string | null
          detected_statute_url: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_summary: string | null
          state_name: string
          state_slug: string
          status: string
        }
        Insert: {
          confidence?: string | null
          detected_at?: string | null
          detected_authority?: string | null
          detected_effective_date?: string | null
          detected_law_name?: string | null
          detected_statute_url?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_summary?: string | null
          state_name: string
          state_slug: string
          status?: string
        }
        Update: {
          confidence?: string | null
          detected_at?: string | null
          detected_authority?: string | null
          detected_effective_date?: string | null
          detected_law_name?: string | null
          detected_statute_url?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_summary?: string | null
          state_name?: string
          state_slug?: string
          status?: string
        }
        Relationships: []
      }
      tool_acknowledgments: {
        Row: {
          acknowledged_at: string
          created_at: string
          id: string
          report_id: string | null
          session_id: string | null
          tool_type: string
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string
          created_at?: string
          id?: string
          report_id?: string | null
          session_id?: string | null
          tool_type: string
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string
          created_at?: string
          id?: string
          report_id?: string | null
          session_id?: string | null
          tool_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tool_regulatory_update_acknowledgements: {
        Row: {
          article_id: string
          article_title: string
          document_id: string
          id: string
          jurisdiction_name: string | null
          noted_at: string
          tool_type: string
          urgency: string
          user_id: string
        }
        Insert: {
          article_id: string
          article_title: string
          document_id: string
          id?: string
          jurisdiction_name?: string | null
          noted_at?: string
          tool_type: string
          urgency: string
          user_id: string
        }
        Update: {
          article_id?: string
          article_title?: string
          document_id?: string
          id?: string
          jurisdiction_name?: string | null
          noted_at?: string
          tool_type?: string
          urgency?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_regulatory_update_acknowledgements_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_glossary: {
        Row: {
          authority: string | null
          created_at: string
          domain: string
          id: string
          notes: string | null
          source_lang: string
          source_term: string
          target_lang: string
          target_term: string
          updated_at: string
        }
        Insert: {
          authority?: string | null
          created_at?: string
          domain?: string
          id?: string
          notes?: string | null
          source_lang?: string
          source_term: string
          target_lang: string
          target_term: string
          updated_at?: string
        }
        Update: {
          authority?: string | null
          created_at?: string
          domain?: string
          id?: string
          notes?: string | null
          source_lang?: string
          source_term?: string
          target_lang?: string
          target_term?: string
          updated_at?: string
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
          enforcement_patterns: Json | null
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
          enforcement_patterns?: Json | null
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
          enforcement_patterns?: Json | null
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
          action_items: Json | null
          affected_jurisdictions: string[] | null
          affected_sectors: string[] | null
          ai_summary: Json | null
          analysis_basis: string | null
          attention_level: string | null
          category: string
          contextual_record: Json | null
          contextual_teaser: string | null
          created_at: string
          defense_considerations: string | null
          direct_jurisdictions: string[] | null
          enrichment_quality: string | null
          enrichment_version: number | null
          entities: Json | null
          id: string
          image_source: string | null
          image_url: string | null
          is_hidden: boolean
          is_premium: boolean
          key_date: string | null
          law_slug: string | null
          li_processed: boolean | null
          li_relevant: boolean | null
          precedent_novelty: string | null
          published_at: string
          regulator: string | null
          regulatory_theory: string | null
          related_development: string | null
          related_signals: Json | null
          source_domain: string | null
          source_name: string | null
          source_note: string | null
          source_tier: number | null
          summary: string | null
          title: string
          topic_tags: string[] | null
          url: string
          why_it_matters_short: string | null
        }
        Insert: {
          action_items?: Json | null
          affected_jurisdictions?: string[] | null
          affected_sectors?: string[] | null
          ai_summary?: Json | null
          analysis_basis?: string | null
          attention_level?: string | null
          category?: string
          contextual_record?: Json | null
          contextual_teaser?: string | null
          created_at?: string
          defense_considerations?: string | null
          direct_jurisdictions?: string[] | null
          enrichment_quality?: string | null
          enrichment_version?: number | null
          entities?: Json | null
          id?: string
          image_source?: string | null
          image_url?: string | null
          is_hidden?: boolean
          is_premium?: boolean
          key_date?: string | null
          law_slug?: string | null
          li_processed?: boolean | null
          li_relevant?: boolean | null
          precedent_novelty?: string | null
          published_at?: string
          regulator?: string | null
          regulatory_theory?: string | null
          related_development?: string | null
          related_signals?: Json | null
          source_domain?: string | null
          source_name?: string | null
          source_note?: string | null
          source_tier?: number | null
          summary?: string | null
          title: string
          topic_tags?: string[] | null
          url: string
          why_it_matters_short?: string | null
        }
        Update: {
          action_items?: Json | null
          affected_jurisdictions?: string[] | null
          affected_sectors?: string[] | null
          ai_summary?: Json | null
          analysis_basis?: string | null
          attention_level?: string | null
          category?: string
          contextual_record?: Json | null
          contextual_teaser?: string | null
          created_at?: string
          defense_considerations?: string | null
          direct_jurisdictions?: string[] | null
          enrichment_quality?: string | null
          enrichment_version?: number | null
          entities?: Json | null
          id?: string
          image_source?: string | null
          image_url?: string | null
          is_hidden?: boolean
          is_premium?: boolean
          key_date?: string | null
          law_slug?: string | null
          li_processed?: boolean | null
          li_relevant?: boolean | null
          precedent_novelty?: string | null
          published_at?: string
          regulator?: string | null
          regulatory_theory?: string | null
          related_development?: string | null
          related_signals?: Json | null
          source_domain?: string | null
          source_name?: string | null
          source_note?: string | null
          source_tier?: number | null
          summary?: string | null
          title?: string
          topic_tags?: string[] | null
          url?: string
          why_it_matters_short?: string | null
        }
        Relationships: []
      }
      us_notice_answers: {
        Row: {
          answer_value: Json
          answered_at: string
          id: string
          question_key: string
          ropa_activity_id: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          answer_value: Json
          answered_at?: string
          id?: string
          question_key: string
          ropa_activity_id?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          answer_value?: Json
          answered_at?: string
          id?: string
          question_key?: string
          ropa_activity_id?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "us_notice_answers_ropa_activity_id_fkey"
            columns: ["ropa_activity_id"]
            isOneToOne: false
            referencedRelation: "ropa_processing_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "us_notice_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "us_notice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      us_notice_documents: {
        Row: {
          client_id: string
          document_format: string
          file_path: string
          file_size_bytes: number | null
          framework_type: string
          generated_at: string
          id: string
          is_combined: boolean
          is_current: boolean
          session_id: string
          state_code: string | null
          version_number: number
        }
        Insert: {
          client_id: string
          document_format: string
          file_path: string
          file_size_bytes?: number | null
          framework_type: string
          generated_at?: string
          id?: string
          is_combined?: boolean
          is_current?: boolean
          session_id: string
          state_code?: string | null
          version_number?: number
        }
        Update: {
          client_id?: string
          document_format?: string
          file_path?: string
          file_size_bytes?: number | null
          framework_type?: string
          generated_at?: string
          id?: string
          is_combined?: boolean
          is_current?: boolean
          session_id?: string
          state_code?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "us_notice_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "us_notice_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "us_notice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      us_notice_sessions: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          is_refresh: boolean
          last_activity_at: string
          mode: string
          paid_at: string | null
          parent_session_id: string | null
          payment_confirmed: boolean
          ropa_session_id: string | null
          scope: string
          started_at: string
          status: string
          updated_at: string
          version_number: number
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_refresh?: boolean
          last_activity_at?: string
          mode?: string
          paid_at?: string | null
          parent_session_id?: string | null
          payment_confirmed?: boolean
          ropa_session_id?: string | null
          scope?: string
          started_at?: string
          status?: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_refresh?: boolean
          last_activity_at?: string
          mode?: string
          paid_at?: string | null
          parent_session_id?: string | null
          payment_confirmed?: boolean
          ropa_session_id?: string | null
          scope?: string
          started_at?: string
          status?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "us_notice_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "us_notice_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "us_notice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "us_notice_sessions_ropa_session_id_fkey"
            columns: ["ropa_session_id"]
            isOneToOne: false
            referencedRelation: "ropa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      us_notice_state_selections: {
        Row: {
          framework_type: string
          id: string
          session_id: string
          state_code: string
          state_name: string
        }
        Insert: {
          framework_type: string
          id?: string
          session_id: string
          state_code: string
          state_name: string
        }
        Update: {
          framework_type?: string
          id?: string
          session_id?: string
          state_code?: string
          state_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "us_notice_state_selections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "us_notice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      us_state_law_notifications: {
        Row: {
          client_id: string
          delivery_status: string
          error: string | null
          id: string
          notified_at: string
          recipient_email: string
          resend_message_id: string | null
          state_code: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          delivery_status?: string
          error?: string | null
          id?: string
          notified_at?: string
          recipient_email: string
          resend_message_id?: string | null
          state_code: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          delivery_status?: string
          error?: string | null
          id?: string
          notified_at?: string
          recipient_email?: string
          resend_message_id?: string | null
          state_code?: string
          user_id?: string | null
        }
        Relationships: []
      }
      us_state_privacy_laws: {
        Row: {
          applicability_threshold: string | null
          effective_date: string | null
          enforcement_body: string | null
          enforcement_url: string | null
          framework_type: string
          has_appeal_right: boolean
          has_correction_right: boolean
          has_opt_out_right: boolean
          has_sensitive_data_category: boolean
          is_active: boolean
          law_name: string
          notes: string | null
          requires_gpc: boolean
          state_code: string
          state_name: string
        }
        Insert: {
          applicability_threshold?: string | null
          effective_date?: string | null
          enforcement_body?: string | null
          enforcement_url?: string | null
          framework_type: string
          has_appeal_right?: boolean
          has_correction_right?: boolean
          has_opt_out_right?: boolean
          has_sensitive_data_category?: boolean
          is_active?: boolean
          law_name: string
          notes?: string | null
          requires_gpc?: boolean
          state_code: string
          state_name: string
        }
        Update: {
          applicability_threshold?: string | null
          effective_date?: string | null
          enforcement_body?: string | null
          enforcement_url?: string | null
          framework_type?: string
          has_appeal_right?: boolean
          has_correction_right?: boolean
          has_opt_out_right?: boolean
          has_sensitive_data_category?: boolean
          is_active?: boolean
          law_name?: string
          notes?: string | null
          requires_gpc?: boolean
          state_code?: string
          state_name?: string
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
      user_enrichment_events: {
        Row: {
          article_category: string | null
          article_id: string | null
          article_jurisdiction: string | null
          created_at: string | null
          event_type: string
          id: string
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          article_category?: string | null
          article_id?: string | null
          article_jurisdiction?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          article_category?: string | null
          article_id?: string | null
          article_jurisdiction?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      verification_queue: {
        Row: {
          attempts: number
          enforcement_action_id: string
          in_flight_until: string | null
          last_attempt_at: string | null
          last_error: string | null
          priority: string
          queued_at: string
        }
        Insert: {
          attempts?: number
          enforcement_action_id: string
          in_flight_until?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          priority?: string
          queued_at?: string
        }
        Update: {
          attempts?: number
          enforcement_action_id?: string
          in_flight_until?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          priority?: string
          queued_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_queue_enforcement_action_id_fkey"
            columns: ["enforcement_action_id"]
            isOneToOne: true
            referencedRelation: "enforcement_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_results: {
        Row: {
          check_category: string
          check_name: string
          enforcement_action_id: string
          evidence_offset_end: number | null
          evidence_offset_start: number | null
          evidence_text: string | null
          id: string
          model_used: string | null
          notes: string | null
          ran_at: string
          source_document_hash: string | null
          verdict: string
        }
        Insert: {
          check_category: string
          check_name: string
          enforcement_action_id: string
          evidence_offset_end?: number | null
          evidence_offset_start?: number | null
          evidence_text?: string | null
          id?: string
          model_used?: string | null
          notes?: string | null
          ran_at?: string
          source_document_hash?: string | null
          verdict: string
        }
        Update: {
          check_category?: string
          check_name?: string
          enforcement_action_id?: string
          evidence_offset_end?: number | null
          evidence_offset_start?: number | null
          evidence_text?: string | null
          id?: string
          model_used?: string | null
          notes?: string | null
          ran_at?: string
          source_document_hash?: string | null
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_results_enforcement_action_id_fkey"
            columns: ["enforcement_action_id"]
            isOneToOne: false
            referencedRelation: "enforcement_actions"
            referencedColumns: ["id"]
          },
        ]
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
          top_enforcement_signals: Json | null
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
          top_enforcement_signals?: Json | null
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
          top_enforcement_signals?: Json | null
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
      founding_subscriber_count: {
        Row: {
          total: number | null
        }
        Relationships: []
      }
      free_user_upgrade_signals: {
        Row: {
          action_brief_views: number | null
          events_last_7d: number | null
          is_premium: boolean | null
          last_engagement: string | null
          primary_jurisdiction: string | null
          sector: string | null
          upgrade_cta_clicks: number | null
          user_id: string | null
          user_role: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_fire_track3_chunk_if_idle: {
        Args: { p_chunk_size?: number; p_regulator: string }
        Returns: Json
      }
      admin_fire_track3_extract: {
        Args: { p_max_rows?: number; p_regulator: string }
        Returns: number
      }
      claim_enforcement_for_enrichment: {
        Args: { _limit: number; _target_version: number }
        Returns: {
          fine_amount: string
          fine_eur: number
          id: string
          jurisdiction: string
          law: string
          raw_text: string
          regulator: string
          sector: string
          subject: string
          violation: string
        }[]
      }
      commit_eu_notice_generation: {
        Args: {
          _docs: Json
          _expected_status: string[]
          _generated_at: string
          _new_version: number
          _session_id: string
        }
        Returns: Json
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobid: number
          jobname: string
          schedule: string
        }[]
      }
      get_enforcement_action_basic: {
        Args: { _id: string }
        Returns: {
          action_type: string
          created_at: string
          decision_date: string
          etid: string
          fine_amount: string
          fine_eur: number
          fine_eur_equivalent: number
          id: string
          jurisdiction: string
          law: string
          regulator: string
          sector: string
          source_database: string
          source_url: string
          subject: string
          violation: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_current_user_premium: { Args: never; Returns: boolean }
      is_founding_rate_available: { Args: never; Returns: boolean }
      my_client_ids: { Args: never; Returns: string[] }
      owns_client: { Args: { _client_id: string }; Returns: boolean }
      recompute_memo_eligible_interim: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

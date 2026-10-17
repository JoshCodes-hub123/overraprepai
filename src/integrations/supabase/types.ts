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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          actor_id: string | null
          course_id: string | null
          created_at: string
          id: string
          meta: Json | null
          object_id: string | null
          object_type: string
          university: string | null
          verb: string
          visibility: string
        }
        Insert: {
          actor_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          object_id?: string | null
          object_type: string
          university?: string | null
          verb: string
          visibility?: string
        }
        Update: {
          actor_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          object_id?: string | null
          object_type?: string
          university?: string | null
          verb?: string
          visibility?: string
        }
        Relationships: []
      }
      admin_import_logs: {
        Row: {
          admin_id: string
          course_codes: string[]
          created_at: string
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
          imported_questions: number
          imported_quizzes: number
          notes: string | null
          rejected_payload: Json | null
          rejected_rows: number
          status: string
          total_rows: number
        }
        Insert: {
          admin_id: string
          course_codes?: string[]
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          imported_questions?: number
          imported_quizzes?: number
          notes?: string | null
          rejected_payload?: Json | null
          rejected_rows?: number
          status?: string
          total_rows?: number
        }
        Update: {
          admin_id?: string
          course_codes?: string[]
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          imported_questions?: number
          imported_quizzes?: number
          notes?: string | null
          rejected_payload?: Json | null
          rejected_rows?: number
          status?: string
          total_rows?: number
        }
        Relationships: []
      }
      affiliate_links: {
        Row: {
          clicks: number
          conversions: number
          created_at: string
          destination: string
          id: string
          slug: string
          tutor_id: string
        }
        Insert: {
          clicks?: number
          conversions?: number
          created_at?: string
          destination: string
          id?: string
          slug: string
          tutor_id: string
        }
        Update: {
          clicks?: number
          conversions?: number
          created_at?: string
          destination?: string
          id?: string
          slug?: string
          tutor_id?: string
        }
        Relationships: []
      }
      ai_generation_history: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          kind: string
          output_ref: string | null
          params: Json
          resource_id: string | null
          resource_label: string | null
          status: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          kind: string
          output_ref?: string | null
          params?: Json
          resource_id?: string | null
          resource_label?: string | null
          status?: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          output_ref?: string | null
          params?: Json
          resource_id?: string | null
          resource_label?: string | null
          status?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_pricing: {
        Row: {
          cost: number
          description: string | null
          free_eligible: boolean
          kind: string
          label: string
          updated_at: string
        }
        Insert: {
          cost: number
          description?: string | null
          free_eligible?: boolean
          kind: string
          label: string
          updated_at?: string
        }
        Update: {
          cost?: number
          description?: string | null
          free_eligible?: boolean
          kind?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_tutor_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          rating: number | null
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          rating?: number | null
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          rating?: number | null
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_tutor_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutor_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          last_message_role: string | null
          last_read_at: string
          persona: string
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          last_message_role?: string | null
          last_read_at?: string
          persona?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          last_message_role?: string | null
          last_read_at?: string
          persona?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_daily: {
        Row: {
          count: number
          day: string
          kind: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          kind: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          path: string | null
          properties: Json
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          path?: string | null
          properties?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          path?: string | null
          properties?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      arena_anti_cheat_events: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          kind: string
          meta: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          kind: string
          meta?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          kind?: string
          meta?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_anti_cheat_events_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "arena_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_challenge_questions: {
        Row: {
          challenge_id: string
          id: string
          ord: number
          question_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          ord: number
          question_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          ord?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_challenge_questions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "arena_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_challenge_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_challenges: {
        Row: {
          course_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          entry_token_cost: number
          featured: boolean
          id: string
          kind: Database["public"]["Enums"]["arena_kind"]
          num_questions: number
          payout_split: Json
          prize_pool_tokens: number
          starts_at: string
          status: Database["public"]["Enums"]["arena_status"]
          time_limit_seconds: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          entry_token_cost?: number
          featured?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["arena_kind"]
          num_questions?: number
          payout_split?: Json
          prize_pool_tokens?: number
          starts_at: string
          status?: Database["public"]["Enums"]["arena_status"]
          time_limit_seconds?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          entry_token_cost?: number
          featured?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["arena_kind"]
          num_questions?: number
          payout_split?: Json
          prize_pool_tokens?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["arena_status"]
          time_limit_seconds?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_challenges_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_entries: {
        Row: {
          accuracy: number
          anti_cheat_flags: Json
          challenge_id: string
          entered_at: string
          id: string
          score: number
          server_started_at: string
          status: Database["public"]["Enums"]["arena_entry_status"]
          submission_hash: string | null
          submitted_at: string | null
          suspicious_score: number
          time_taken_seconds: number
          tokens_spent: number
          user_id: string
        }
        Insert: {
          accuracy?: number
          anti_cheat_flags?: Json
          challenge_id: string
          entered_at?: string
          id?: string
          score?: number
          server_started_at?: string
          status?: Database["public"]["Enums"]["arena_entry_status"]
          submission_hash?: string | null
          submitted_at?: string | null
          suspicious_score?: number
          time_taken_seconds?: number
          tokens_spent?: number
          user_id: string
        }
        Update: {
          accuracy?: number
          anti_cheat_flags?: Json
          challenge_id?: string
          entered_at?: string
          id?: string
          score?: number
          server_started_at?: string
          status?: Database["public"]["Enums"]["arena_entry_status"]
          submission_hash?: string | null
          submitted_at?: string | null
          suspicious_score?: number
          time_taken_seconds?: number
          tokens_spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "arena_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_entry_answers: {
        Row: {
          answered_at: string
          elapsed_ms: number
          entry_id: string
          id: string
          is_correct: boolean
          question_id: string
          selected_option: string | null
        }
        Insert: {
          answered_at?: string
          elapsed_ms?: number
          entry_id: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_option?: string | null
        }
        Update: {
          answered_at?: string
          elapsed_ms?: number
          entry_id?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_option?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_entry_answers_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "arena_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_entry_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_rewards: {
        Row: {
          awarded_at: string
          badge_slug: string | null
          challenge_id: string
          id: string
          rank: number
          tokens_awarded: number
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_slug?: string | null
          challenge_id: string
          id?: string
          rank: number
          tokens_awarded?: number
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_slug?: string | null
          challenge_id?: string
          id?: string
          rank?: number
          tokens_awarded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_rewards_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "arena_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          marked_by: string | null
          note: string | null
          school_id: string
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          note?: string | null
          school_id: string
          status: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          note?: string | null
          school_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          position_seconds: number
          source_hash: string
          title: string
          total_chars: number | null
          updated_at: string
          user_id: string
          voice: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          position_seconds?: number
          source_hash: string
          title: string
          total_chars?: number | null
          updated_at?: string
          user_id: string
          voice?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          position_seconds?: number
          source_hash?: string
          title?: string
          total_chars?: number | null
          updated_at?: string
          user_id?: string
          voice?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          slug: string
          tier: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          slug: string
          tier?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          tier?: string
        }
        Relationships: []
      }
      bookmarked_questions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarked_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_offers: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          price_tokens: number
          quantity: number
          title: string
          tutor_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          price_tokens: number
          quantity: number
          title: string
          tutor_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          price_tokens?: number
          quantity?: number
          title?: string
          tutor_id?: string
        }
        Relationships: []
      }
      campaign_dismissals: {
        Row: {
          campaign_id: string
          dismissed_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          dismissed_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          dismissed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_dismissals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          starts_at: string
          title: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          starts_at?: string
          title: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      campus_ambassadors: {
        Row: {
          active: boolean
          approved_at: string
          approved_by: string | null
          arena_participation: number
          bio: string | null
          community_growth: number
          created_at: string
          social_handle: string | null
          tier: string
          total_onboarded: number
          total_referrals: number
          university: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          approved_at?: string
          approved_by?: string | null
          arena_participation?: number
          bio?: string | null
          community_growth?: number
          created_at?: string
          social_handle?: string | null
          tier?: string
          total_onboarded?: number
          total_referrals?: number
          university?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          approved_at?: string
          approved_by?: string | null
          arena_participation?: number
          bio?: string | null
          community_growth?: number
          created_at?: string
          social_handle?: string | null
          tier?: string
          total_onboarded?: number
          total_referrals?: number
          university?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campus_battle_scores: {
        Row: {
          arena_points: number
          battle_id: string
          id: string
          participant_count: number
          quiz_points: number
          side: string
          streak_points: number
          success_points: number
          total_points: number
          updated_at: string
        }
        Insert: {
          arena_points?: number
          battle_id: string
          id?: string
          participant_count?: number
          quiz_points?: number
          side: string
          streak_points?: number
          success_points?: number
          total_points?: number
          updated_at?: string
        }
        Update: {
          arena_points?: number
          battle_id?: string
          id?: string
          participant_count?: number
          quiz_points?: number
          side?: string
          streak_points?: number
          success_points?: number
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_battle_scores_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "campus_battles"
            referencedColumns: ["id"]
          },
        ]
      }
      campus_battles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          prize_summary: string | null
          scope: string
          side_a: string
          side_b: string
          starts_at: string
          status: string
          title: string
          university_filter: string | null
          updated_at: string
          winner_side: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          prize_summary?: string | null
          scope: string
          side_a: string
          side_b: string
          starts_at?: string
          status?: string
          title: string
          university_filter?: string | null
          updated_at?: string
          winner_side?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          prize_summary?: string | null
          scope?: string
          side_a?: string
          side_b?: string
          starts_at?: string
          status?: string
          title?: string
          university_filter?: string | null
          updated_at?: string
          winner_side?: string | null
        }
        Relationships: []
      }
      campus_impact_snapshots: {
        Row: {
          active_students: number
          avg_success_score: number
          challenge_participation: number
          community_activity: number
          computed_at: string
          id: string
          impact_score: number
          university: string
        }
        Insert: {
          active_students?: number
          avg_success_score?: number
          challenge_participation?: number
          community_activity?: number
          computed_at?: string
          id?: string
          impact_score?: number
          university: string
        }
        Update: {
          active_students?: number
          avg_success_score?: number
          challenge_participation?: number
          community_activity?: number
          computed_at?: string
          id?: string
          impact_score?: number
          university?: string
        }
        Relationships: []
      }
      challenge_enrollments: {
        Row: {
          challenge_id: string
          claimed_at: string | null
          completed_at: string | null
          current_value: number
          ends_at: string
          enrolled_at: string
          id: string
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          claimed_at?: string | null
          completed_at?: string | null
          current_value?: number
          ends_at: string
          enrolled_at?: string
          id?: string
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          claimed_at?: string | null
          completed_at?: string | null
          current_value?: number
          ends_at?: string
          enrolled_at?: string
          id?: string
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_enrollments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress: {
        Row: {
          created_at: string
          delta: number
          enrollment_id: string
          id: string
          meta: Json
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta?: number
          enrollment_id: string
          id?: string
          meta?: Json
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          enrollment_id?: string
          id?: string
          meta?: Json
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "challenge_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          badge_slug: string | null
          created_at: string
          created_by: string | null
          description: string
          duration_days: number
          goal_target: number
          goal_type: string
          icon: string
          id: string
          is_active: boolean
          is_seeded: boolean
          reward_tokens: number
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          badge_slug?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          duration_days?: number
          goal_target?: number
          goal_type: string
          icon?: string
          id?: string
          is_active?: boolean
          is_seeded?: boolean
          reward_tokens?: number
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          badge_slug?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          duration_days?: number
          goal_target?: number
          goal_type?: string
          icon?: string
          id?: string
          is_active?: boolean
          is_seeded?: boolean
          reward_tokens?: number
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_badge_slug_fkey"
            columns: ["badge_slug"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["slug"]
          },
        ]
      }
      chat_message_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          is_ai: boolean
          meta: Json
          thread_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_ai?: boolean
          meta?: Json
          thread_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          meta?: Json
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_thread_members: {
        Row: {
          joined_at: string
          last_read_at: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          last_read_at?: string
          role?: string
          thread_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          last_read_at?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          context_id: string | null
          context_kind: Database["public"]["Enums"]["chat_context_kind"] | null
          created_at: string
          created_by: string
          id: string
          invite_code: string | null
          invite_expires_at: string | null
          invite_single_use: boolean
          invite_used_at: string | null
          kind: Database["public"]["Enums"]["chat_thread_kind"]
          title: string | null
          updated_at: string
        }
        Insert: {
          context_id?: string | null
          context_kind?: Database["public"]["Enums"]["chat_context_kind"] | null
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          invite_single_use?: boolean
          invite_used_at?: string | null
          kind?: Database["public"]["Enums"]["chat_thread_kind"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          context_id?: string | null
          context_kind?: Database["public"]["Enums"]["chat_context_kind"] | null
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          invite_single_use?: boolean
          invite_used_at?: string | null
          kind?: Database["public"]["Enums"]["chat_thread_kind"]
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      class_subjects: {
        Row: {
          class_id: string
          created_at: string
          id: string
          school_id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          school_id: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "school_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_errors: {
        Row: {
          component_stack: string | null
          created_at: string
          id: string
          message: string
          path: string | null
          resolved: boolean
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_stack?: string | null
          created_at?: string
          id?: string
          message: string
          path?: string | null
          resolved?: boolean
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_stack?: string | null
          created_at?: string
          id?: string
          message?: string
          path?: string | null
          resolved?: boolean
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coach_plans: {
        Row: {
          generated_at: string
          id: string
          plan_date: string
          plan_json: Json
          user_id: string
          weak_topics: string[] | null
        }
        Insert: {
          generated_at?: string
          id?: string
          plan_date?: string
          plan_json: Json
          user_id: string
          weak_topics?: string[] | null
        }
        Update: {
          generated_at?: string
          id?: string
          plan_date?: string
          plan_json?: Json
          user_id?: string
          weak_topics?: string[] | null
        }
        Relationships: []
      }
      cohort_snapshots: {
        Row: {
          active_w1: number
          active_w2: number
          active_w4: number
          cohort_size: number
          computed_at: string
          id: string
          signup_week: string
        }
        Insert: {
          active_w1?: number
          active_w2?: number
          active_w4?: number
          cohort_size?: number
          computed_at?: string
          id?: string
          signup_week: string
        }
        Update: {
          active_w1?: number
          active_w2?: number
          active_w4?: number
          cohort_size?: number
          computed_at?: string
          id?: string
          signup_week?: string
        }
        Relationships: []
      }
      community_announcements: {
        Row: {
          community_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          community_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_announcements_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "tutor_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_announcements_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "tutor_communities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "tutor_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "tutor_communities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          community_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          community_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      community_post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          channel_type: string
          comment_count: number
          content: string
          course_id: string | null
          created_at: string
          id: string
          image_url: string | null
          like_count: number
          updated_at: string
        }
        Insert: {
          author_id: string
          channel_type?: string
          comment_count?: number
          content: string
          course_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          like_count?: number
          updated_at?: string
        }
        Update: {
          author_id?: string
          channel_type?: string
          comment_count?: number
          content?: string
          course_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          like_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      community_shared_quizzes: {
        Row: {
          community_id: string
          id: string
          message: string | null
          quiz_id: string
          shared_at: string
        }
        Insert: {
          community_id: string
          id?: string
          message?: string | null
          quiz_id: string
          shared_at?: string
        }
        Update: {
          community_id?: string
          id?: string
          message?: string | null
          quiz_id?: string
          shared_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_shared_quizzes_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "tutor_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_shared_quizzes_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "tutor_communities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_shared_quizzes_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      course_chat_messages: {
        Row: {
          ai_status: string | null
          content: string
          course_id: string
          created_at: string
          id: string
          is_ai: boolean
          parent_id: string | null
          user_id: string
        }
        Insert: {
          ai_status?: string | null
          content: string
          course_id: string
          created_at?: string
          id?: string
          is_ai?: boolean
          parent_id?: string | null
          user_id: string
        }
        Update: {
          ai_status?: string | null
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_chat_messages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_chat_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "course_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      course_chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "course_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      course_discussion_threads: {
        Row: {
          course_id: string
          created_at: string
          thread_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          thread_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_discussion_threads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_discussion_threads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      course_images: {
        Row: {
          caption: string | null
          course_id: string
          created_at: string
          id: string
          storage_path: string | null
          topic_id: string | null
          uploaded_by: string
          url: string
        }
        Insert: {
          caption?: string | null
          course_id: string
          created_at?: string
          id?: string
          storage_path?: string | null
          topic_id?: string | null
          uploaded_by: string
          url: string
        }
        Update: {
          caption?: string | null
          course_id?: string
          created_at?: string
          id?: string
          storage_path?: string | null
          topic_id?: string | null
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_images_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_images_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          preferred_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          preferred_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          preferred_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_pinned_prompts: {
        Row: {
          content: string
          course_id: string
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          created_by: string
          id?: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_pinned_prompts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_survival_kits: {
        Row: {
          contents: Json
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          title: string
          token_cost: number
          tutor_id: string
          updated_at: string
        }
        Insert: {
          contents?: Json
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          token_cost?: number
          tutor_id: string
          updated_at?: string
        }
        Update: {
          contents?: Json
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          token_cost?: number
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          environment_type: Database["public"]["Enums"]["learning_environment"]
          faculty: string | null
          id: string
          is_active: boolean
          level: string | null
          name: string
          path_type: Database["public"]["Enums"]["academic_path"]
          university: string | null
          university_code: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          environment_type: Database["public"]["Enums"]["learning_environment"]
          faculty?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name: string
          path_type: Database["public"]["Enums"]["academic_path"]
          university?: string | null
          university_code?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          environment_type?: Database["public"]["Enums"]["learning_environment"]
          faculty?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name?: string
          path_type?: Database["public"]["Enums"]["academic_path"]
          university?: string | null
          university_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_university_code_fkey"
            columns: ["university_code"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["code"]
          },
        ]
      }
      device_login_history: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          ip_hash: string | null
          last_active_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          ip_hash?: string | null
          last_active_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          ip_hash?: string | null
          last_active_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      discussion_replies: {
        Row: {
          content: string
          created_at: string
          discussion_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          discussion_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          discussion_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          content: string
          course_id: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entity_comments: {
        Row: {
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          hidden: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          hidden?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          hidden?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exam_goals: {
        Row: {
          created_at: string
          exam_label: string | null
          id: string
          is_active: boolean
          target_date: string
          target_score: number
          updated_at: string
          user_id: string
          weekly_quiz_target: number
        }
        Insert: {
          created_at?: string
          exam_label?: string | null
          id?: string
          is_active?: boolean
          target_date: string
          target_score?: number
          updated_at?: string
          user_id: string
          weekly_quiz_target?: number
        }
        Update: {
          created_at?: string
          exam_label?: string | null
          id?: string
          is_active?: boolean
          target_date?: string
          target_score?: number
          updated_at?: string
          user_id?: string
          weekly_quiz_target?: number
        }
        Relationships: []
      }
      exam_proctor_events: {
        Row: {
          attempt_id: string
          duration_ms: number
          id: string
          kind: string
          occurred_at: string
          user_id: string
        }
        Insert: {
          attempt_id: string
          duration_ms?: number
          id?: string
          kind?: string
          occurred_at?: string
          user_id: string
        }
        Update: {
          attempt_id?: string
          duration_ms?: number
          id?: string
          kind?: string
          occurred_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_proctor_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_tutors: {
        Row: {
          created_at: string
          id: string
          student_id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          tutor_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          rollout_percent: number
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          rollout_percent?: number
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          rollout_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      fee_payments: {
        Row: {
          amount_paid: number
          created_at: string
          fee_id: string
          id: string
          method: string | null
          paid_on: string
          receipt_no: string | null
          recorded_by: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          fee_id: string
          id?: string
          method?: string | null
          paid_on?: string
          receipt_no?: string | null
          recorded_by?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          fee_id?: string
          id?: string
          method?: string | null
          paid_on?: string
          receipt_no?: string | null
          recorded_by?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          amount: number
          class_id: string | null
          created_at: string
          id: string
          is_active: boolean
          school_id: string
          term_id: string | null
          title: string
        }
        Insert: {
          amount?: number
          class_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          school_id: string
          term_id?: string | null
          title: string
        }
        Update: {
          amount?: number
          class_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          school_id?: string
          term_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "school_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          academic_path: Database["public"]["Enums"]["academic_path"] | null
          back: string
          course_id: string | null
          created_at: string
          front: string
          id: string
          is_public: boolean
          subject: string | null
          topic: string | null
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_path?: Database["public"]["Enums"]["academic_path"] | null
          back: string
          course_id?: string | null
          created_at?: string
          front: string
          id?: string
          is_public?: boolean
          subject?: string | null
          topic?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_path?: Database["public"]["Enums"]["academic_path"] | null
          back?: string
          course_id?: string | null
          created_at?: string
          front?: string
          id?: string
          is_public?: boolean
          subject?: string | null
          topic?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_share_events: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          kind: string
          target_id: string | null
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          kind: string
          target_id?: string | null
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          kind?: string
          target_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      learning_goals: {
        Row: {
          completed_topics: Json
          course_id: string
          created_at: string
          id: string
          is_archived: boolean
          target_date: string | null
          title: string
          topics: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_topics?: Json
          course_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          target_date?: string | null
          title: string
          topics?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_topics?: Json
          course_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          target_date?: string | null
          title?: string
          topics?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_goals_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_notes: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          download_count: number
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          is_published: boolean
          level: string | null
          thumbnail_url: string | null
          title: string
          topic_id: string | null
          tutor_id: string
          updated_at: string
          view_count: number
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_published?: boolean
          level?: string | null
          thumbnail_url?: string | null
          title: string
          topic_id?: string | null
          tutor_id: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_published?: boolean
          level?: string | null
          thumbnail_url?: string | null
          title?: string
          topic_id?: string | null
          tutor_id?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "lecture_notes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      live_breakouts: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          name: string
          room_suffix: string
          slot_id: string
          tutor_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          name: string
          room_suffix: string
          slot_id: string
          tutor_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          room_suffix?: string
          slot_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_breakouts_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "tutor_session_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      live_recaps: {
        Row: {
          action_items: Json
          created_at: string
          id: string
          key_points: Json
          slot_id: string
          summary: string
          tutor_id: string
        }
        Insert: {
          action_items?: Json
          created_at?: string
          id?: string
          key_points?: Json
          slot_id: string
          summary: string
          tutor_id: string
        }
        Update: {
          action_items?: Json
          created_at?: string
          id?: string
          key_points?: Json
          slot_id?: string
          summary?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_recaps_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: true
            referencedRelation: "tutor_session_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      live_recordings: {
        Row: {
          created_at: string
          duration_s: number | null
          file_url: string
          id: string
          size_bytes: number | null
          slot_id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          duration_s?: number | null
          file_url: string
          id?: string
          size_bytes?: number | null
          slot_id: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          duration_s?: number | null
          file_url?: string
          id?: string
          size_bytes?: number | null
          slot_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_recordings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "tutor_session_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      live_tickets: {
        Row: {
          created_at: string
          id: string
          slot_id: string
          student_id: string
          tokens_paid: number
        }
        Insert: {
          created_at?: string
          id?: string
          slot_id: string
          student_id: string
          tokens_paid?: number
        }
        Update: {
          created_at?: string
          id?: string
          slot_id?: string
          student_id?: string
          tokens_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_tickets_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "tutor_session_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exam_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          mock_exam_id: string
          score: number
          started_at: string
          tab_blur_count: number
          topic_breakdown: Json | null
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          mock_exam_id: string
          score?: number
          started_at?: string
          tab_blur_count?: number
          topic_breakdown?: Json | null
          total?: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          mock_exam_id?: string
          score?: number
          started_at?: string
          tab_blur_count?: number
          topic_breakdown?: Json | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_attempts_mock_exam_id_fkey"
            columns: ["mock_exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exams: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_min: number
          id: string
          is_published: boolean
          title: string
          topic_ids: string[] | null
          total_questions: number
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_min?: number
          id?: string
          is_published?: boolean
          title: string
          topic_ids?: string[] | null
          total_questions?: number
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_min?: number
          id?: string
          is_published?: boolean
          title?: string
          topic_ids?: string[] | null
          total_questions?: number
          updated_at?: string
        }
        Relationships: []
      }
      moderation_queue: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          id: string
          reason: string | null
          reported_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          reason?: string | null
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          reason?: string | null
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean
          email_opportunities: boolean
          email_posts: boolean
          notify_announcements: boolean
          notify_comments: boolean
          notify_likes: boolean
          notify_mentions: boolean
          notify_messages: boolean
          notify_opportunities: boolean
          notify_posts: boolean
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          email_opportunities?: boolean
          email_posts?: boolean
          notify_announcements?: boolean
          notify_comments?: boolean
          notify_likes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_opportunities?: boolean
          notify_posts?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          email_opportunities?: boolean
          email_posts?: boolean
          notify_announcements?: boolean
          notify_comments?: boolean
          notify_likes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_opportunities?: boolean
          notify_posts?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          apply_url: string | null
          bookmark_count: number
          category: Database["public"]["Enums"]["opportunity_category"]
          comment_count: number
          cover_image_url: string | null
          created_at: string
          deadline: string | null
          description: string
          id: string
          organization: string
          posted_by: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          title: string
          university: string | null
          university_code: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          apply_url?: string | null
          bookmark_count?: number
          category: Database["public"]["Enums"]["opportunity_category"]
          comment_count?: number
          cover_image_url?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          organization: string
          posted_by?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title: string
          university?: string | null
          university_code?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          apply_url?: string | null
          bookmark_count?: number
          category?: Database["public"]["Enums"]["opportunity_category"]
          comment_count?: number
          cover_image_url?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          organization?: string
          posted_by?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title?: string
          university?: string | null
          university_code?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_university_code_fkey"
            columns: ["university_code"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["code"]
          },
        ]
      }
      opportunity_applications: {
        Row: {
          created_at: string
          id: string
          note: string | null
          opportunity_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          opportunity_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          opportunity_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_bookmarks: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_bookmarks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          opportunity_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          opportunity_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          opportunity_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_comments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "opportunity_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_reactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          currency: string
          id: string
          plan_id: string
          proof_path: string | null
          reference: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          plan_id: string
          proof_path?: string | null
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          plan_id?: string
          proof_path?: string | null
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          activated: boolean
          activated_at: string | null
          amount_cents: number
          created_at: string
          currency: string
          id: string
          plan_id: string
          provider: string
          raw_payload: Json | null
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated?: boolean
          activated_at?: string | null
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          plan_id: string
          provider?: string
          raw_payload?: Json | null
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated?: boolean
          activated_at?: string | null
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          plan_id?: string
          provider?: string
          raw_payload?: Json | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_announcements: {
        Row: {
          audience: string
          body: string
          category: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_pinned: boolean
          is_published: boolean
          link_label: string | null
          link_url: string | null
          notified_at: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          is_published?: boolean
          link_label?: string | null
          link_url?: string | null
          notified_at?: string | null
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          is_published?: boolean
          link_label?: string | null
          link_url?: string | null
          notified_at?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      post_bookmarks: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          apply_url: string | null
          author_id: string
          body: string
          category: string | null
          comment_count: number
          cover_image_url: string | null
          created_at: string
          deadline: string | null
          gallery_urls: string[]
          id: string
          like_count: number
          organization: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["post_status"]
          subtitle: string | null
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["post_type"]
          university: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          apply_url?: string | null
          author_id: string
          body?: string
          category?: string | null
          comment_count?: number
          cover_image_url?: string | null
          created_at?: string
          deadline?: string | null
          gallery_urls?: string[]
          id?: string
          like_count?: number
          organization?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          subtitle?: string | null
          tags?: string[]
          title: string
          type?: Database["public"]["Enums"]["post_type"]
          university?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          apply_url?: string | null
          author_id?: string
          body?: string
          category?: string | null
          comment_count?: number
          cover_image_url?: string | null
          created_at?: string
          deadline?: string | null
          gallery_urls?: string[]
          id?: string
          like_count?: number
          organization?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          subtitle?: string | null
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["post_type"]
          university?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          academic_metadata: Json
          academic_path: Database["public"]["Enums"]["academic_path"] | null
          ai_token_balance: number
          aspiring_cgpa: number | null
          avatar_url: string | null
          bio: string | null
          cover_photo_url: string | null
          created_at: string
          current_cgpa: number | null
          daily_ai_tokens_reset_at: string
          daily_ai_tokens_used: number
          daily_free_reset_at: string
          daily_free_used: number
          daily_reminder_enabled: boolean
          daily_reminder_opt_out: boolean
          date_of_birth: string | null
          department: string | null
          email: string
          environment_type: Database["public"]["Enums"]["learning_environment"]
          faculty: string | null
          first_purchase_used: boolean
          flw_customer_id: string | null
          full_name: string | null
          gender: string | null
          hobbies: string[] | null
          id: string
          is_official: boolean
          is_pending_verification: boolean
          jamb_subjects: string[] | null
          last_reminder_sent_at: string | null
          last_seen_at: string | null
          level: string | null
          linkedin_handle: string | null
          matric_no: string | null
          onboarding_completed: boolean
          organisation_logo_url: string | null
          organisation_name: string | null
          phone: string | null
          profile_image_url: string | null
          referral_code: string | null
          referred_by: string | null
          reminder_hour_lagos: number
          state_of_origin: string | null
          study_interests: string[] | null
          target_course: string | null
          target_university: string | null
          trial_ends_at: string | null
          tutor_code: string | null
          tutor_match_prefs: Json
          tutor_specialization:
            | Database["public"]["Enums"]["academic_path"]
            | null
          tutor_status: string | null
          university: string | null
          updated_at: string
          x_handle: string | null
        }
        Insert: {
          academic_metadata?: Json
          academic_path?: Database["public"]["Enums"]["academic_path"] | null
          ai_token_balance?: number
          aspiring_cgpa?: number | null
          avatar_url?: string | null
          bio?: string | null
          cover_photo_url?: string | null
          created_at?: string
          current_cgpa?: number | null
          daily_ai_tokens_reset_at?: string
          daily_ai_tokens_used?: number
          daily_free_reset_at?: string
          daily_free_used?: number
          daily_reminder_enabled?: boolean
          daily_reminder_opt_out?: boolean
          date_of_birth?: string | null
          department?: string | null
          email: string
          environment_type?: Database["public"]["Enums"]["learning_environment"]
          faculty?: string | null
          first_purchase_used?: boolean
          flw_customer_id?: string | null
          full_name?: string | null
          gender?: string | null
          hobbies?: string[] | null
          id: string
          is_official?: boolean
          is_pending_verification?: boolean
          jamb_subjects?: string[] | null
          last_reminder_sent_at?: string | null
          last_seen_at?: string | null
          level?: string | null
          linkedin_handle?: string | null
          matric_no?: string | null
          onboarding_completed?: boolean
          organisation_logo_url?: string | null
          organisation_name?: string | null
          phone?: string | null
          profile_image_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          reminder_hour_lagos?: number
          state_of_origin?: string | null
          study_interests?: string[] | null
          target_course?: string | null
          target_university?: string | null
          trial_ends_at?: string | null
          tutor_code?: string | null
          tutor_match_prefs?: Json
          tutor_specialization?:
            | Database["public"]["Enums"]["academic_path"]
            | null
          tutor_status?: string | null
          university?: string | null
          updated_at?: string
          x_handle?: string | null
        }
        Update: {
          academic_metadata?: Json
          academic_path?: Database["public"]["Enums"]["academic_path"] | null
          ai_token_balance?: number
          aspiring_cgpa?: number | null
          avatar_url?: string | null
          bio?: string | null
          cover_photo_url?: string | null
          created_at?: string
          current_cgpa?: number | null
          daily_ai_tokens_reset_at?: string
          daily_ai_tokens_used?: number
          daily_free_reset_at?: string
          daily_free_used?: number
          daily_reminder_enabled?: boolean
          daily_reminder_opt_out?: boolean
          date_of_birth?: string | null
          department?: string | null
          email?: string
          environment_type?: Database["public"]["Enums"]["learning_environment"]
          faculty?: string | null
          first_purchase_used?: boolean
          flw_customer_id?: string | null
          full_name?: string | null
          gender?: string | null
          hobbies?: string[] | null
          id?: string
          is_official?: boolean
          is_pending_verification?: boolean
          jamb_subjects?: string[] | null
          last_reminder_sent_at?: string | null
          last_seen_at?: string | null
          level?: string | null
          linkedin_handle?: string | null
          matric_no?: string | null
          onboarding_completed?: boolean
          organisation_logo_url?: string | null
          organisation_name?: string | null
          phone?: string | null
          profile_image_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          reminder_hour_lagos?: number
          state_of_origin?: string | null
          study_interests?: string[] | null
          target_course?: string | null
          target_university?: string | null
          trial_ends_at?: string | null
          tutor_code?: string | null
          tutor_match_prefs?: Json
          tutor_specialization?:
            | Database["public"]["Enums"]["academic_path"]
            | null
          tutor_status?: string | null
          university?: string | null
          updated_at?: string
          x_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "tutor_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          max_uses: number | null
          tutor_id: string
          uses: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          tutor_id: string
          uses?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          tutor_id?: string
          uses?: number
        }
        Relationships: []
      }
      qa_answers: {
        Row: {
          body: string
          created_at: string
          id: string
          is_accepted: boolean
          question_id: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_accepted?: boolean
          question_id: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_accepted?: boolean
          question_id?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "qa_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_questions: {
        Row: {
          answer_count: number
          body: string
          course_id: string | null
          created_at: string
          id: string
          is_resolved: boolean
          title: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          answer_count?: number
          body: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          title: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          answer_count?: number
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          title?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: []
      }
      question_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          question_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tutor_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          question_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tutor_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          question_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tutor_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_option: string
          course_id: string | null
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          image_url: string | null
          is_approved: boolean
          is_past_question: boolean
          is_premium: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          subject_id: string | null
          topic_id: string
          tutor_id: string | null
          year: number | null
        }
        Insert: {
          correct_option: string
          course_id?: string | null
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_past_question?: boolean
          is_premium?: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          subject_id?: string | null
          topic_id: string
          tutor_id?: string | null
          year?: number | null
        }
        Update: {
          correct_option?: string
          course_id?: string | null
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_past_question?: boolean
          is_premium?: boolean
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          subject_id?: string | null
          topic_id?: string
          tutor_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          correct_answers: number
          id: string
          mode: string
          quiz_id: string
          score: number
          started_at: string
          time_spent_seconds: number | null
          total_questions: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_answers?: number
          id?: string
          mode: string
          quiz_id: string
          score?: number
          started_at?: string
          time_spent_seconds?: number | null
          total_questions: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number
          id?: string
          mode?: string
          quiz_id?: string
          score?: number
          started_at?: string
          time_spent_seconds?: number | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_hidden: boolean
          quiz_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          quiz_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          quiz_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          id: string
          order_index: number
          question_id: string
          quiz_id: string
        }
        Insert: {
          id?: string
          order_index?: number
          question_id: string
          quiz_id: string
        }
        Update: {
          id?: string
          order_index?: number
          question_id?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_ratings: {
        Row: {
          created_at: string
          id: string
          quiz_id: string
          rating: number
          review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quiz_id: string
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quiz_id?: string
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_ratings_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_unlocks: {
        Row: {
          cost_paid: number
          id: string
          quiz_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          cost_paid?: number
          id?: string
          quiz_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          cost_paid?: number
          id?: string
          quiz_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          is_premium: boolean
          is_simulation: boolean
          level: string | null
          question_count: number
          school_class_id: string | null
          school_id: string | null
          title: string
          token_cost: number
          topic_id: string | null
          tutor_id: string | null
          university_code: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_premium?: boolean
          is_simulation?: boolean
          level?: string | null
          question_count?: number
          school_class_id?: string | null
          school_id?: string | null
          title: string
          token_cost?: number
          topic_id?: string | null
          tutor_id?: string | null
          university_code?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_premium?: boolean
          is_simulation?: boolean
          level?: string | null
          question_count?: number
          school_class_id?: string | null
          school_id?: string | null
          title?: string
          token_cost?: number
          topic_id?: string | null
          tutor_id?: string | null
          university_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_school_class_id_fkey"
            columns: ["school_class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_university_code_fkey"
            columns: ["university_code"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["code"]
          },
        ]
      }
      readiness_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          correct: number
          course_id: string
          exam_id: string
          id: string
          readiness_pct: number
          recommendations: Json
          started_at: string
          strengths: Json
          total: number
          user_id: string
          weaknesses: Json
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          correct?: number
          course_id: string
          exam_id: string
          id?: string
          readiness_pct?: number
          recommendations?: Json
          started_at?: string
          strengths?: Json
          total?: number
          user_id: string
          weaknesses?: Json
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          correct?: number
          course_id?: string
          exam_id?: string
          id?: string
          readiness_pct?: number
          recommendations?: Json
          started_at?: string
          strengths?: Json
          total?: number
          user_id?: string
          weaknesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "readiness_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "readiness_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      readiness_exams: {
        Row: {
          course_id: string
          created_at: string
          difficulty: string
          id: string
          questions: Json
          source_material_ids: string[]
          title: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          difficulty?: string
          id?: string
          questions?: Json
          source_material_ids?: string[]
          title?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          difficulty?: string
          id?: string
          questions?: Json
          source_material_ids?: string[]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      recently_opened_courses: {
        Row: {
          course_id: string
          opened_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          opened_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          opened_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_opened_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_milestones: {
        Row: {
          awarded_at: string
          id: string
          milestone: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          id?: string
          milestone: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          id?: string
          milestone?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referee_id: string
          referee_tokens: number
          referrer_id: string
          referrer_tokens: number
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id: string
          referee_tokens?: number
          referrer_id: string
          referrer_tokens?: number
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id?: string
          referee_tokens?: number
          referrer_id?: string
          referrer_tokens?: number
          status?: string
        }
        Relationships: []
      }
      refund_events: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          id: string
          paddle_transaction_id: string | null
          raw: Json | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          paddle_transaction_id?: string | null
          raw?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          paddle_transaction_id?: string | null
          raw?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      remediation_playlists: {
        Row: {
          attempt_id: string | null
          completed_at: string | null
          content: string
          created_at: string
          exam_id: string | null
          id: string
          is_bookmarked: boolean
          items: Json
          title: string
          topic_breakdown: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          completed_at?: string | null
          content?: string
          created_at?: string
          exam_id?: string | null
          id?: string
          is_bookmarked?: boolean
          items?: Json
          title?: string
          topic_breakdown?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          completed_at?: string | null
          content?: string
          created_at?: string
          exam_id?: string | null
          id?: string
          is_bookmarked?: boolean
          items?: Json
          title?: string
          topic_breakdown?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remediation_playlists_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      report_card_verifications: {
        Row: {
          average_score: number | null
          class_id: string | null
          class_label: string | null
          class_size: number | null
          id: string
          issued_at: string
          issued_by: string | null
          position: number | null
          school_id: string
          school_name: string
          student_id: string
          student_name: string
          term_id: string
          term_label: string | null
          total_score: number | null
          verification_id: string
        }
        Insert: {
          average_score?: number | null
          class_id?: string | null
          class_label?: string | null
          class_size?: number | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          position?: number | null
          school_id: string
          school_name: string
          student_id: string
          student_name: string
          term_id: string
          term_label?: string | null
          total_score?: number | null
          verification_id: string
        }
        Update: {
          average_score?: number | null
          class_id?: string | null
          class_label?: string | null
          class_size?: number | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          position?: number | null
          school_id?: string
          school_name?: string
          student_id?: string
          student_name?: string
          term_id?: string
          term_label?: string | null
          total_score?: number | null
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_card_verifications_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_verifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_verifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_verifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_verifications_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "school_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          ca1: number | null
          ca2: number | null
          class_id: string
          created_at: string
          exam: number | null
          grade: string | null
          id: string
          position: number | null
          remark: string | null
          school_id: string
          student_id: string
          subject_id: string
          teacher_id: string | null
          term_id: string
          total: number | null
          updated_at: string
        }
        Insert: {
          ca1?: number | null
          ca2?: number | null
          class_id: string
          created_at?: string
          exam?: number | null
          grade?: string | null
          id?: string
          position?: number | null
          remark?: string | null
          school_id: string
          student_id: string
          subject_id: string
          teacher_id?: string | null
          term_id: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          ca1?: number | null
          ca2?: number | null
          class_id?: string
          created_at?: string
          exam?: number | null
          grade?: string | null
          id?: string
          position?: number | null
          remark?: string | null
          school_id?: string
          student_id?: string
          subject_id?: string
          teacher_id?: string | null
          term_id?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "school_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "school_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      school_announcements: {
        Row: {
          audience: string
          body: string
          class_id: string | null
          created_at: string
          created_by: string | null
          id: string
          school_id: string
          title: string
        }
        Insert: {
          audience?: string
          body: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          school_id: string
          title: string
        }
        Update: {
          audience?: string
          body?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_announcements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      school_classes: {
        Row: {
          arm: string
          class_teacher_id: string | null
          created_at: string
          id: string
          level: string
          school_id: string
        }
        Insert: {
          arm?: string
          class_teacher_id?: string | null
          created_at?: string
          id?: string
          level: string
          school_id: string
        }
        Update: {
          arm?: string
          class_teacher_id?: string | null
          created_at?: string
          id?: string
          level?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      school_members: {
        Row: {
          created_at: string
          id: string
          member_role: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_role: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_role?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      school_students: {
        Row: {
          admission_date: string
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          parent_email: string | null
          parent_phone: string | null
          parent_user_id: string | null
          school_id: string
          student_code: string
          user_id: string | null
        }
        Insert: {
          admission_date?: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          parent_email?: string | null
          parent_phone?: string | null
          parent_user_id?: string | null
          school_id: string
          student_code: string
          user_id?: string | null
        }
        Update: {
          admission_date?: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          parent_email?: string | null
          parent_phone?: string | null
          parent_user_id?: string | null
          school_id?: string
          student_code?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      school_subjects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      school_terms: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          is_current: boolean
          school_id: string
          session: string
          starts_on: string | null
          term: number
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_current?: boolean
          school_id: string
          session: string
          starts_on?: string | null
          term: number
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_current?: boolean
          school_id?: string
          session?: string
          starts_on?: string | null
          term?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_terms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_terms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          admin_notes: string | null
          approval_letter_url: string | null
          approval_number: string | null
          brand_color: string | null
          cac_document_url: string | null
          classes_offered: string[] | null
          created_at: string
          email: string | null
          established_year: number | null
          id: string
          lga: string | null
          logo_url: string | null
          motto: string | null
          name: string
          official_email: string | null
          official_phone: string | null
          owner_id: string
          owner_id_url: string | null
          phone: string | null
          principal_name: string | null
          principal_phone: string | null
          rejection_reason: string | null
          report_footer: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          social_link: string | null
          state: string | null
          status: string
          student_count: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          approval_letter_url?: string | null
          approval_number?: string | null
          brand_color?: string | null
          cac_document_url?: string | null
          classes_offered?: string[] | null
          created_at?: string
          email?: string | null
          established_year?: number | null
          id?: string
          lga?: string | null
          logo_url?: string | null
          motto?: string | null
          name: string
          official_email?: string | null
          official_phone?: string | null
          owner_id: string
          owner_id_url?: string | null
          phone?: string | null
          principal_name?: string | null
          principal_phone?: string | null
          rejection_reason?: string | null
          report_footer?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_link?: string | null
          state?: string | null
          status?: string
          student_count?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          approval_letter_url?: string | null
          approval_number?: string | null
          brand_color?: string | null
          cac_document_url?: string | null
          classes_offered?: string[] | null
          created_at?: string
          email?: string | null
          established_year?: number | null
          id?: string
          lga?: string | null
          logo_url?: string | null
          motto?: string | null
          name?: string
          official_email?: string | null
          official_phone?: string | null
          owner_id?: string
          owner_id_url?: string | null
          phone?: string | null
          principal_name?: string | null
          principal_phone?: string | null
          rejection_reason?: string | null
          report_footer?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_link?: string | null
          state?: string | null
          status?: string
          student_count?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      search_index: {
        Row: {
          body: string | null
          created_at: string
          embedding: string | null
          entity_id: string
          entity_type: string
          id: string
          is_global: boolean
          is_public: boolean
          owner_id: string | null
          scope_environment:
            | Database["public"]["Enums"]["learning_environment"]
            | null
          scope_university: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          embedding?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_global?: boolean
          is_public?: boolean
          owner_id?: string | null
          scope_environment?:
            | Database["public"]["Enums"]["learning_environment"]
            | null
          scope_university?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          body?: string | null
          created_at?: string
          embedding?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_global?: boolean
          is_public?: boolean
          owner_id?: string | null
          scope_environment?:
            | Database["public"]["Enums"]["learning_environment"]
            | null
          scope_university?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      security_audit_findings: {
        Row: {
          check_name: string
          created_at: string
          detail: string
          id: string
          is_new: boolean
          object_name: string | null
          object_schema: string | null
          run_id: string
          severity: string
        }
        Insert: {
          check_name: string
          created_at?: string
          detail: string
          id?: string
          is_new?: boolean
          object_name?: string | null
          object_schema?: string | null
          run_id: string
          severity: string
        }
        Update: {
          check_name?: string
          created_at?: string
          detail?: string
          id?: string
          is_new?: boolean
          object_name?: string | null
          object_schema?: string | null
          run_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "security_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_runs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          high_severity_count: number
          id: string
          started_at: string
          status: string
          total_findings: number
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          high_severity_count?: number
          id?: string
          started_at?: string
          status?: string
          total_findings?: number
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          high_severity_count?: number
          id?: string
          started_at?: string
          status?: string
          total_findings?: number
        }
        Relationships: []
      }
      session_bookings: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          payment_status: string
          released_at: string | null
          slot_id: string
          status: string
          student_id: string
          thread_id: string | null
          tokens_paid: number
          tokens_to_tutor: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          payment_status?: string
          released_at?: string | null
          slot_id: string
          status?: string
          student_id: string
          thread_id?: string | null
          tokens_paid?: number
          tokens_to_tutor?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          payment_status?: string
          released_at?: string | null
          slot_id?: string
          status?: string
          student_id?: string
          thread_id?: string | null
          tokens_paid?: number
          tokens_to_tutor?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "tutor_session_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bookings_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      session_devices: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      srs_cards: {
        Row: {
          back: string
          created_at: string
          due_at: string
          ease_factor: number
          front: string
          id: string
          interval_days: number
          last_reviewed_at: string | null
          repetitions: number
          source_id: string | null
          source_kind: string
          tag: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          due_at?: string
          ease_factor?: number
          front: string
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          repetitions?: number
          source_id?: string | null
          source_kind?: string
          tag?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          due_at?: string
          ease_factor?: number
          front?: string
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          repetitions?: number
          source_id?: string | null
          source_kind?: string
          tag?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      srs_reviews: {
        Row: {
          card_id: string
          id: string
          new_interval_days: number | null
          prev_interval_days: number | null
          quality: number
          reviewed_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          id?: string
          new_interval_days?: number | null
          prev_interval_days?: number | null
          quality: number
          reviewed_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          id?: string
          new_interval_days?: number | null
          prev_interval_days?: number | null
          quality?: number
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "srs_reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "srs_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      student_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_download_history: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          level: string | null
          resource_id: string
          resource_type: string
          title: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          level?: string | null
          resource_id: string
          resource_type: string
          title?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          level?: string | null
          resource_id?: string
          resource_type?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_quiz_purchases: {
        Row: {
          id: string
          purchased_at: string
          quiz_id: string
          student_id: string
          tokens_spent: number
        }
        Insert: {
          id?: string
          purchased_at?: string
          quiz_id: string
          student_id: string
          tokens_spent: number
        }
        Update: {
          id?: string
          purchased_at?: string
          quiz_id?: string
          student_id?: string
          tokens_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_quiz_purchases_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_resource_bookmarks: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          level: string | null
          resource_id: string
          resource_type: string
          title: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          level?: string | null
          resource_id: string
          resource_type: string
          title?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          level?: string | null
          resource_id?: string
          resource_type?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_spotlights: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          featured_until: string | null
          id: string
          image_url: string | null
          link_url: string | null
          summary: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          summary?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          summary?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      study_material_artifacts: {
        Row: {
          content: Json
          generated_at: string
          id: string
          kind: string
          material_id: string
        }
        Insert: {
          content: Json
          generated_at?: string
          id?: string
          kind: string
          material_id: string
        }
        Update: {
          content?: Json
          generated_at?: string
          id?: string
          kind?: string
          material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_material_artifacts_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "study_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      study_materials: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          owner_id: string
          tags: string[]
          title: string
          topic_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number
          file_type: string
          file_url: string
          id?: string
          owner_id: string
          tags?: string[]
          title: string
          topic_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          owner_id?: string
          tags?: string[]
          title?: string
          topic_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          plan_data: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_data?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_data?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_streaks: {
        Row: {
          created_at: string
          current_streak: number
          daily_goal_quizzes: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          daily_goal_quizzes?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          daily_goal_quizzes?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          category: Database["public"]["Enums"]["academic_path"]
          created_at: string
          description: string | null
          environment_type: Database["public"]["Enums"]["learning_environment"]
          id: string
          is_active: boolean
          level: string | null
          name: string
          university: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["academic_path"]
          created_at?: string
          description?: string | null
          environment_type?: Database["public"]["Enums"]["learning_environment"]
          id?: string
          is_active?: boolean
          level?: string | null
          name: string
          university?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["academic_path"]
          created_at?: string
          description?: string | null
          environment_type?: Database["public"]["Enums"]["learning_environment"]
          id?: string
          is_active?: boolean
          level?: string | null
          name?: string
          university?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          currency: string
          features: Json
          id: string
          interval: string
          is_active: boolean
          name: string
          paddle_price_id: string | null
          price_cents: number
        }
        Insert: {
          currency?: string
          features?: Json
          id: string
          interval?: string
          is_active?: boolean
          name: string
          paddle_price_id?: string | null
          price_cents?: number
        }
        Update: {
          currency?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          name?: string
          paddle_price_id?: string | null
          price_cents?: number
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          current_progress: number
          id: string
          reward_claimed: boolean
          team_id: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          reward_claimed?: boolean
          team_id: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          reward_claimed?: boolean
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "team_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_challenge_progress_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_challenges: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string
          goal_type: string
          goal_value: number
          id: string
          is_active: boolean
          reward_tokens: number
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at: string
          goal_type: string
          goal_value: number
          id?: string
          is_active?: boolean
          reward_tokens?: number
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string
          goal_type?: string
          goal_value?: number
          id?: string
          is_active?: boolean
          reward_tokens?: number
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          code: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          max_members: number
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          max_members?: number
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          max_members?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      theory_attempts: {
        Row: {
          ai_feedback: Json | null
          ai_score: number | null
          answer_text: string
          created_at: string
          id: string
          question_id: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_feedback?: Json | null
          ai_score?: number | null
          answer_text?: string
          created_at?: string
          id?: string
          question_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_feedback?: Json | null
          ai_score?: number | null
          answer_text?: string
          created_at?: string
          id?: string
          question_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      theory_questions: {
        Row: {
          course_id: string
          created_at: string
          difficulty: string
          id: string
          is_approved: boolean
          key_points: Json
          marks: number
          model_answer: string | null
          question_text: string
          source: string | null
          topic_id: string | null
          tutor_id: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          course_id: string
          created_at?: string
          difficulty?: string
          id?: string
          is_approved?: boolean
          key_points?: Json
          marks?: number
          model_answer?: string | null
          question_text: string
          source?: string | null
          topic_id?: string | null
          tutor_id?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string
          difficulty?: string
          id?: string
          is_approved?: boolean
          key_points?: Json
          marks?: number
          model_answer?: string | null
          question_text?: string
          source?: string | null
          topic_id?: string | null
          tutor_id?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      timetable: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string | null
          id: string
          period_no: number
          school_id: string
          start_time: string | null
          subject_id: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time?: string | null
          id?: string
          period_no: number
          school_id: string
          start_time?: string | null
          subject_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          period_no?: number
          school_id?: string
          start_time?: string | null
          subject_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "school_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      token_purchase_requests: {
        Row: {
          admin_notes: string | null
          amount_paid: number
          created_at: string
          id: string
          payment_method: string
          payment_reference: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tokens_requested: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_paid: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tokens_requested: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_paid?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tokens_requested?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      token_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          id: string
          paddle_transaction_id: string
          price_id: string
          status: string
          tokens_credited: number
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency: string
          environment?: string
          id?: string
          paddle_transaction_id: string
          price_id: string
          status?: string
          tokens_credited: number
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          paddle_transaction_id?: string
          price_id?: string
          status?: string
          tokens_credited?: number
          user_id?: string
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          reference_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          reference_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "token_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      token_transfers: {
        Row: {
          amount: number
          created_at: string
          from_user: string
          id: string
          status: string
          to_email: string | null
          to_user: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          from_user: string
          id?: string
          status?: string
          to_email?: string | null
          to_user?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          from_user?: string
          id?: string
          status?: string
          to_email?: string | null
          to_user?: string | null
        }
        Relationships: []
      }
      token_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topic_mastery: {
        Row: {
          attempts: number
          id: string
          last_seen: string
          mastery_score: number
          questions_attempted: number
          questions_incorrect: number
          topic: string
          user_id: string
        }
        Insert: {
          attempts?: number
          id?: string
          last_seen?: string
          mastery_score?: number
          questions_attempted?: number
          questions_incorrect?: number
          topic: string
          user_id: string
        }
        Update: {
          attempts?: number
          id?: string
          last_seen?: string
          mastery_score?: number
          questions_attempted?: number
          questions_incorrect?: number
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          subject_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          subject_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_announcements: {
        Row: {
          body: string
          course_id: string | null
          created_at: string
          id: string
          is_pinned: boolean
          title: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          body: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          title: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutor_applications: {
        Row: {
          admin_notes: string | null
          bio: string | null
          certificate_url: string | null
          courses_to_teach: string
          created_at: string
          current_position: string | null
          email: string
          experience: string
          full_name: string
          gov_id_url: string | null
          highest_qualification: string | null
          id: string
          institution: string | null
          phone: string | null
          profile_image_url: string | null
          qualifications: string
          reviewed_at: string | null
          reviewed_by: string | null
          sample_explanation: string | null
          sample_question_1: string | null
          sample_question_2: string | null
          sample_question_3: string | null
          sample_video_url: string | null
          specialization: Database["public"]["Enums"]["academic_path"] | null
          status: Database["public"]["Enums"]["application_status"]
          subjects_taught: string[] | null
          updated_at: string
          user_id: string
          why_join: string | null
          years_experience: number | null
        }
        Insert: {
          admin_notes?: string | null
          bio?: string | null
          certificate_url?: string | null
          courses_to_teach: string
          created_at?: string
          current_position?: string | null
          email: string
          experience: string
          full_name: string
          gov_id_url?: string | null
          highest_qualification?: string | null
          id?: string
          institution?: string | null
          phone?: string | null
          profile_image_url?: string | null
          qualifications: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_explanation?: string | null
          sample_question_1?: string | null
          sample_question_2?: string | null
          sample_question_3?: string | null
          sample_video_url?: string | null
          specialization?: Database["public"]["Enums"]["academic_path"] | null
          status?: Database["public"]["Enums"]["application_status"]
          subjects_taught?: string[] | null
          updated_at?: string
          user_id: string
          why_join?: string | null
          years_experience?: number | null
        }
        Update: {
          admin_notes?: string | null
          bio?: string | null
          certificate_url?: string | null
          courses_to_teach?: string
          created_at?: string
          current_position?: string | null
          email?: string
          experience?: string
          full_name?: string
          gov_id_url?: string | null
          highest_qualification?: string | null
          id?: string
          institution?: string | null
          phone?: string | null
          profile_image_url?: string | null
          qualifications?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_explanation?: string | null
          sample_question_1?: string | null
          sample_question_2?: string | null
          sample_question_3?: string | null
          sample_video_url?: string | null
          specialization?: Database["public"]["Enums"]["academic_path"] | null
          status?: Database["public"]["Enums"]["application_status"]
          subjects_taught?: string[] | null
          updated_at?: string
          user_id?: string
          why_join?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      tutor_communities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_code: string
          is_active: boolean
          name: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code: string
          is_active?: boolean
          name: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean
          name?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutor_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          tutor_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          tutor_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_curricula: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          level: string | null
          slug: string | null
          title: string
          tutor_id: string
          university_code: string | null
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          slug?: string | null
          title: string
          tutor_id: string
          university_code?: string | null
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          slug?: string | null
          title?: string
          tutor_id?: string
          university_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_curricula_university_code_fkey"
            columns: ["university_code"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["code"]
          },
        ]
      }
      tutor_curriculum_materials: {
        Row: {
          content_text: string | null
          created_at: string
          external_url: string | null
          id: string
          kind: Database["public"]["Enums"]["tutor_material_kind"]
          meta: Json
          order_index: number
          storage_path: string | null
          title: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          kind: Database["public"]["Enums"]["tutor_material_kind"]
          meta?: Json
          order_index?: number
          storage_path?: string | null
          title: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          content_text?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["tutor_material_kind"]
          meta?: Json
          order_index?: number
          storage_path?: string | null
          title?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_curriculum_materials_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "tutor_curriculum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_curriculum_topics: {
        Row: {
          created_at: string
          curriculum_id: string
          id: string
          order_index: number
          summary: string | null
          title: string
          university_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          curriculum_id: string
          id?: string
          order_index?: number
          summary?: string | null
          title: string
          university_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          curriculum_id?: string
          id?: string
          order_index?: number
          summary?: string | null
          title?: string
          university_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_curriculum_topics_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "tutor_curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_curriculum_topics_university_code_fkey"
            columns: ["university_code"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["code"]
          },
        ]
      }
      tutor_earnings: {
        Row: {
          created_at: string
          id: string
          platform_share: number
          quiz_id: string | null
          session_id: string | null
          student_id: string
          tokens_paid: number
          tutor_id: string
          tutor_share: number
        }
        Insert: {
          created_at?: string
          id?: string
          platform_share: number
          quiz_id?: string | null
          session_id?: string | null
          student_id: string
          tokens_paid: number
          tutor_id: string
          tutor_share: number
        }
        Update: {
          created_at?: string
          id?: string
          platform_share?: number
          quiz_id?: string | null
          session_id?: string | null
          student_id?: string
          tokens_paid?: number
          tutor_id?: string
          tutor_share?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutor_earnings_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_follows: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          tutor_id?: string
        }
        Relationships: []
      }
      tutor_onboarding: {
        Row: {
          bank_added: boolean
          community_created: boolean
          course_created: boolean
          dismissed: boolean
          profile_completed: boolean
          quiz_created: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_added?: boolean
          community_created?: boolean
          course_created?: boolean
          dismissed?: boolean
          profile_completed?: boolean
          quiz_created?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_added?: boolean
          community_created?: boolean
          course_created?: boolean
          dismissed?: boolean
          profile_completed?: boolean
          quiz_created?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          review: string | null
          student_id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          student_id: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          student_id?: string
          tutor_id?: string
        }
        Relationships: []
      }
      tutor_scorecards: {
        Row: {
          avg_rating: number
          completion_rate: number
          computed_at: string
          last_active: string | null
          total_earnings: number
          total_quizzes: number
          total_students: number
          tutor_id: string
        }
        Insert: {
          avg_rating?: number
          completion_rate?: number
          computed_at?: string
          last_active?: string | null
          total_earnings?: number
          total_quizzes?: number
          total_students?: number
          tutor_id: string
        }
        Update: {
          avg_rating?: number
          completion_rate?: number
          computed_at?: string
          last_active?: string | null
          total_earnings?: number
          total_quizzes?: number
          total_students?: number
          tutor_id?: string
        }
        Relationships: []
      }
      tutor_session_slots: {
        Row: {
          capacity: number
          created_at: string
          curriculum_id: string | null
          description: string | null
          duration_min: number
          id: string
          meeting_url: string | null
          payout_share_bps: number
          price_tokens: number
          starts_at: string
          status: string
          ticket_price_tokens: number
          title: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          curriculum_id?: string | null
          description?: string | null
          duration_min?: number
          id?: string
          meeting_url?: string | null
          payout_share_bps?: number
          price_tokens?: number
          starts_at: string
          status?: string
          ticket_price_tokens?: number
          title: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          curriculum_id?: string | null
          description?: string | null
          duration_min?: number
          id?: string
          meeting_url?: string | null
          payout_share_bps?: number
          price_tokens?: number
          starts_at?: string
          status?: string
          ticket_price_tokens?: number
          title?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutor_storefronts: {
        Row: {
          banner_url: string | null
          bio: string | null
          created_at: string
          headline: string | null
          is_published: boolean
          slug: string
          tutor_id: string
          university_code: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          headline?: string | null
          is_published?: boolean
          slug: string
          tutor_id: string
          university_code?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          headline?: string | null
          is_published?: boolean
          slug?: string
          tutor_id?: string
          university_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_storefronts_university_code_fkey"
            columns: ["university_code"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["code"]
          },
        ]
      }
      universities: {
        Row: {
          city: string | null
          code: string
          created_at: string
          is_active: boolean
          name: string
          short_name: string | null
          state: string | null
          type: string | null
          website: string | null
        }
        Insert: {
          city?: string | null
          code: string
          created_at?: string
          is_active?: boolean
          name: string
          short_name?: string | null
          state?: string | null
          type?: string | null
          website?: string | null
        }
        Update: {
          city?: string | null
          code?: string
          created_at?: string
          is_active?: boolean
          name?: string
          short_name?: string | null
          state?: string | null
          type?: string | null
          website?: string | null
        }
        Relationships: []
      }
      university_requests: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          website: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_slug: string
          id: string
          source: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_slug: string
          id?: string
          source?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_slug?: string
          id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_slug_fkey"
            columns: ["badge_slug"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["slug"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          is_active: boolean
          last_seen_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_performance_snapshots: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          readiness_score: number
          snapshot_date: string
          strong_topics: Json
          user_id: string
          weak_topics: Json
        }
        Insert: {
          created_at?: string
          id?: string
          metrics?: Json
          readiness_score?: number
          snapshot_date?: string
          strong_topics?: Json
          user_id: string
          weak_topics?: Json
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          readiness_score?: number
          snapshot_date?: string
          strong_topics?: Json
          user_id?: string
          weak_topics?: Json
        }
        Relationships: []
      }
      user_resources: {
        Row: {
          course_id: string | null
          created_at: string
          folder: string
          id: string
          kind: Database["public"]["Enums"]["resource_kind"]
          meta: Json
          mime: string | null
          size_bytes: number | null
          storage_path: string
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          folder?: string
          id?: string
          kind: Database["public"]["Enums"]["resource_kind"]
          meta?: Json
          mime?: string | null
          size_bytes?: number | null
          storage_path: string
          title: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          folder?: string
          id?: string
          kind?: Database["public"]["Enums"]["resource_kind"]
          meta?: Json
          mime?: string | null
          size_bytes?: number | null
          storage_path?: string
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          paddle_subscription_id: string | null
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          paddle_subscription_id?: string | null
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          paddle_subscription_id?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          action_kind: string | null
          balance_after: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["wallet_txn_kind"]
          naira_amount: number | null
          reason: string | null
          ref_id: string | null
          tokens: number
          user_id: string
        }
        Insert: {
          action_kind?: string | null
          balance_after?: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["wallet_txn_kind"]
          naira_amount?: number | null
          reason?: string | null
          ref_id?: string | null
          tokens?: number
          user_id: string
        }
        Update: {
          action_kind?: string | null
          balance_after?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["wallet_txn_kind"]
          naira_amount?: number | null
          reason?: string | null
          ref_id?: string | null
          tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      weakness_signals: {
        Row: {
          course_id: string | null
          id: string
          last_seen_at: string
          miss_count: number
          source: string
          topic: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          id?: string
          last_seen_at?: string
          miss_count?: number
          source?: string
          topic: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          id?: string
          last_seen_at?: string
          miss_count?: number
          source?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_leaderboards: {
        Row: {
          awarded: boolean
          created_at: string
          id: string
          prize_tokens: number
          rank: number
          score: number
          user_id: string
          week_start: string
        }
        Insert: {
          awarded?: boolean
          created_at?: string
          id?: string
          prize_tokens?: number
          rank: number
          score?: number
          user_id: string
          week_start: string
        }
        Update: {
          awarded?: boolean
          created_at?: string
          id?: string
          prize_tokens?: number
          rank?: number
          score?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_quest_progress: {
        Row: {
          completed_at: string
          day_index: number
          goal_key: string
          id: string
          quest_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          day_index: number
          goal_key: string
          id?: string
          quest_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          day_index?: number
          goal_key?: string
          id?: string
          quest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "weekly_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_quests: {
        Row: {
          completed_days: number
          created_at: string
          goals: Json
          id: string
          is_hero: boolean
          user_id: string
          week_start: string
        }
        Insert: {
          completed_days?: number
          created_at?: string
          goals?: Json
          id?: string
          is_hero?: boolean
          user_id: string
          week_start: string
        }
        Update: {
          completed_days?: number
          created_at?: string
          goals?: Json
          id?: string
          is_hero?: boolean
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_name: string
          account_number: string
          admin_notes: string | null
          amount: number
          bank_name: string
          created_at: string
          id: string
          payout_email: string | null
          payout_method: string
          processed_at: string | null
          processed_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_notes?: string | null
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          payout_email?: string | null
          payout_method?: string
          processed_at?: string | null
          processed_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_notes?: string | null
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          payout_email?: string | null
          payout_method?: string
          processed_at?: string | null
          processed_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_tutor_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          department: string | null
          faculty: string | null
          full_name: string | null
          id: string | null
          profile_image_url: string | null
          tutor_code: string | null
          tutor_specialization:
            | Database["public"]["Enums"]["academic_path"]
            | null
          university: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          department?: string | null
          faculty?: string | null
          full_name?: string | null
          id?: string | null
          profile_image_url?: string | null
          tutor_code?: string | null
          tutor_specialization?:
            | Database["public"]["Enums"]["academic_path"]
            | null
          university?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          department?: string | null
          faculty?: string | null
          full_name?: string | null
          id?: string | null
          profile_image_url?: string | null
          tutor_code?: string | null
          tutor_specialization?:
            | Database["public"]["Enums"]["academic_path"]
            | null
          university?: string | null
        }
        Relationships: []
      }
      schools_public: {
        Row: {
          address: string | null
          brand_color: string | null
          classes_offered: string[] | null
          created_at: string | null
          established_year: number | null
          id: string | null
          lga: string | null
          logo_url: string | null
          motto: string | null
          name: string | null
          owner_id: string | null
          principal_name: string | null
          report_footer: string | null
          social_link: string | null
          state: string | null
          status: string | null
          student_count: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          classes_offered?: string[] | null
          created_at?: string | null
          established_year?: number | null
          id?: string | null
          lga?: string | null
          logo_url?: string | null
          motto?: string | null
          name?: string | null
          owner_id?: string | null
          principal_name?: string | null
          report_footer?: string | null
          social_link?: string | null
          state?: string | null
          status?: string | null
          student_count?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          classes_offered?: string[] | null
          created_at?: string | null
          established_year?: number | null
          id?: string | null
          lga?: string | null
          logo_url?: string | null
          motto?: string | null
          name?: string | null
          owner_id?: string | null
          principal_name?: string | null
          report_footer?: string | null
          social_link?: string | null
          state?: string | null
          status?: string | null
          student_count?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      tutor_communities_public: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          tutor_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          tutor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          tutor_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tutor_public_profiles: {
        Row: {
          academic_path: Database["public"]["Enums"]["academic_path"] | null
          avatar_url: string | null
          cover_photo_url: string | null
          created_at: string | null
          department: string | null
          full_name: string | null
          id: string | null
          profile_image_url: string | null
          tutor_code: string | null
          tutor_specialization:
            | Database["public"]["Enums"]["academic_path"]
            | null
        }
        Insert: {
          academic_path?: Database["public"]["Enums"]["academic_path"] | null
          avatar_url?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          department?: string | null
          full_name?: string | null
          id?: string | null
          profile_image_url?: string | null
          tutor_code?: string | null
          tutor_specialization?:
            | Database["public"]["Enums"]["academic_path"]
            | null
        }
        Update: {
          academic_path?: Database["public"]["Enums"]["academic_path"] | null
          avatar_url?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          department?: string | null
          full_name?: string | null
          id?: string | null
          profile_image_url?: string | null
          tutor_code?: string | null
          tutor_specialization?:
            | Database["public"]["Enums"]["academic_path"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_pro_subscription: {
        Args: {
          _days: number
          _plan_id: string
          _reference?: string
          _source?: string
          _user_id: string
        }
        Returns: string
      }
      admin_adjust_wallet: {
        Args: { _delta_tokens: number; _reason: string; _user_id: string }
        Returns: Json
      }
      admin_change_plan: {
        Args: {
          _days?: number
          _plan_id: string
          _reason?: string
          _user_id: string
        }
        Returns: string
      }
      admin_extend_pro: {
        Args: { _days: number; _reason?: string; _user_id: string }
        Returns: string
      }
      admin_get_profile_contacts: {
        Args: { _ids: string[] }
        Returns: {
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          phone: string
          tutor_code: string
          university: string
        }[]
      }
      admin_get_school: {
        Args: { _school_id: string }
        Returns: {
          address: string | null
          admin_notes: string | null
          approval_letter_url: string | null
          approval_number: string | null
          brand_color: string | null
          cac_document_url: string | null
          classes_offered: string[] | null
          created_at: string
          email: string | null
          established_year: number | null
          id: string
          lga: string | null
          logo_url: string | null
          motto: string | null
          name: string
          official_email: string | null
          official_phone: string | null
          owner_id: string
          owner_id_url: string | null
          phone: string | null
          principal_name: string | null
          principal_phone: string | null
          rejection_reason: string | null
          report_footer: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          social_link: string | null
          state: string | null
          status: string
          student_count: number | null
          updated_at: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "schools"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_get_user_wallets: {
        Args: { _ids: string[] }
        Returns: {
          ai_token_balance: number
          email: string
          full_name: string
          id: string
        }[]
      }
      admin_list_users: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: {
          academic_path: string
          ai_token_balance: number
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          last_seen_at: string
          phone: string
          purchase_count: number
          total_amount_spent_ngn: number
          total_tokens_bought: number
          total_users: number
          university: string
        }[]
      }
      admin_revoke_all_sessions: { Args: { _user_id: string }; Returns: number }
      admin_set_tutor_status: {
        Args: { _reason?: string; _status: string; _user_id: string }
        Returns: undefined
      }
      approve_payment_request: {
        Args: { _id: string; _note?: string }
        Returns: undefined
      }
      arena_broadcast_to_entrants: {
        Args: { _challenge_id: string; _message: string; _title: string }
        Returns: Json
      }
      arena_disqualify_entry: {
        Args: { _entry_id: string; _reason?: string }
        Returns: Json
      }
      arena_enter_challenge: { Args: { _challenge_id: string }; Returns: Json }
      arena_get_play_questions: {
        Args: { _challenge_id: string }
        Returns: {
          image_url: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          ord: number
          question_id: string
          question_text: string
        }[]
      }
      arena_global_leaderboard: {
        Args: {
          _course_id?: string
          _limit?: number
          _scope?: string
          _university?: string
        }
        Returns: {
          avatar_url: string
          entries_count: number
          full_name: string
          rank: number
          total_score: number
          total_winnings: number
          university: string
          user_id: string
        }[]
      }
      arena_leaderboard: {
        Args: { _challenge_id: string; _limit?: number }
        Returns: {
          accuracy: number
          avatar_url: string
          full_name: string
          rank: number
          score: number
          submitted_at: string
          time_taken_seconds: number
          university: string
          user_id: string
        }[]
      }
      arena_log_anti_cheat_event: {
        Args: { _entry_id: string; _kind: string; _meta?: Json }
        Returns: Json
      }
      arena_publish_challenge: {
        Args: { _challenge_id: string }
        Returns: Json
      }
      arena_settle_challenge: { Args: { _challenge_id: string }; Returns: Json }
      arena_submit_entry: {
        Args: { _answers: Json; _entry_id: string; _time_taken_seconds: number }
        Returns: Json
      }
      book_session: { Args: { _slot_id: string }; Returns: string }
      bump_challenge_progress: {
        Args: {
          _delta?: number
          _goal_type: string
          _source?: string
          _user_id: string
        }
        Returns: undefined
      }
      cancel_session_booking: {
        Args: { _booking_id: string }
        Returns: undefined
      }
      claim_challenge_reward: {
        Args: { _enrollment_id: string }
        Returns: Json
      }
      claim_team_challenge_reward: {
        Args: { _challenge_id: string }
        Returns: undefined
      }
      complete_session: { Args: { _booking_id: string }; Returns: undefined }
      consume_ai_token: { Args: { _kind: string }; Returns: Json }
      course_image_storage_path_from_url: {
        Args: { _url: string }
        Returns: string
      }
      course_in_my_university: {
        Args: { _course_id: string }
        Returns: boolean
      }
      course_owner: { Args: { _course_id: string }; Returns: boolean }
      course_scope_is_valid: {
        Args: {
          _environment_type: Database["public"]["Enums"]["learning_environment"]
          _path_type: Database["public"]["Enums"]["academic_path"]
          _university: string
        }
        Returns: boolean
      }
      course_topic_question_counts: {
        Args: { _course_id: string }
        Returns: {
          question_count: number
          topic_id: string
        }[]
      }
      credit_tokens_for_purchase: {
        Args: {
          p_amount_cents: number
          p_currency: string
          p_environment: string
          p_paddle_transaction_id: string
          p_price_id: string
          p_tokens: number
          p_user_id: string
        }
        Returns: string
      }
      credit_wallet: {
        Args: {
          _kind?: Database["public"]["Enums"]["wallet_txn_kind"]
          _naira_amount: number
          _ref_id: string
          _tokens: number
          _user_id: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_community_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_team_code: { Args: never; Returns: string }
      generate_tutor_code: { Args: never; Returns: string }
      get_admin_insights: { Args: never; Returns: Json }
      get_admin_kpis: {
        Args: never
        Returns: {
          low_trust_users_24h: number
          open_moderation_reports: number
          opportunities_expiring_7d: number
          pending_tutor_apps: number
          refunds_24h: number
        }[]
      }
      get_course_snapshots: { Args: { _user_id: string }; Returns: Json }
      get_health_metrics: {
        Args: { days?: number }
        Returns: {
          active_users: number
          day: string
          errors: number
          quizzes_completed: number
          quizzes_started: number
        }[]
      }
      get_my_leaderboard_rank: {
        Args: { _user: string }
        Returns: {
          percentile: number
          rank: number
          score: number
          total: number
        }[]
      }
      get_my_profile: {
        Args: never
        Returns: {
          academic_metadata: Json
          academic_path: Database["public"]["Enums"]["academic_path"] | null
          ai_token_balance: number
          aspiring_cgpa: number | null
          avatar_url: string | null
          bio: string | null
          cover_photo_url: string | null
          created_at: string
          current_cgpa: number | null
          daily_ai_tokens_reset_at: string
          daily_ai_tokens_used: number
          daily_free_reset_at: string
          daily_free_used: number
          daily_reminder_enabled: boolean
          daily_reminder_opt_out: boolean
          date_of_birth: string | null
          department: string | null
          email: string
          environment_type: Database["public"]["Enums"]["learning_environment"]
          faculty: string | null
          first_purchase_used: boolean
          flw_customer_id: string | null
          full_name: string | null
          gender: string | null
          hobbies: string[] | null
          id: string
          is_official: boolean
          is_pending_verification: boolean
          jamb_subjects: string[] | null
          last_reminder_sent_at: string | null
          last_seen_at: string | null
          level: string | null
          linkedin_handle: string | null
          matric_no: string | null
          onboarding_completed: boolean
          organisation_logo_url: string | null
          organisation_name: string | null
          phone: string | null
          profile_image_url: string | null
          referral_code: string | null
          referred_by: string | null
          reminder_hour_lagos: number
          state_of_origin: string | null
          study_interests: string[] | null
          target_course: string | null
          target_university: string | null
          trial_ends_at: string | null
          tutor_code: string | null
          tutor_match_prefs: Json
          tutor_specialization:
            | Database["public"]["Enums"]["academic_path"]
            | null
          tutor_status: string | null
          university: string | null
          updated_at: string
          x_handle: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_sensitive_profile: {
        Args: never
        Returns: {
          ai_token_balance: number
          daily_ai_tokens_used: number
          daily_free_used: number
          date_of_birth: string
          first_purchase_used: boolean
          flw_customer_id: string
          matric_no: string
          phone: string
          referred_by: string
          trial_ends_at: string
        }[]
      }
      get_my_sent_transfers: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          from_user: string
          id: string
          to_email: string
          to_user: string
        }[]
      }
      get_my_wallet: {
        Args: never
        Returns: {
          ai_token_balance: number
          daily_free_reset_at: string
          daily_free_used: number
        }[]
      }
      get_public_profile_stats: {
        Args: { _user_id: string }
        Returns: {
          ai_activity: number
          avg_rating: number
          cards_reviewed: number
          current_streak: number
          engagement: number
          followers_count: number
          longest_streak: number
          quiz_accuracy: number
          quizzes_taken: number
          students_impacted: number
          uploads_count: number
        }[]
      }
      get_public_tutor_directory: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          department: string
          full_name: string
          id: string
          profile_image_url: string
          tutor_code: string
          university: string
        }[]
      }
      get_recent_scoring_activity: {
        Args: { _limit?: number }
        Returns: {
          actor_id: string
          avatar_url: string
          course_id: string
          created_at: string
          full_name: string
          id: string
          meta: Json
          object_type: string
          verb: string
        }[]
      }
      get_session_meeting_url: { Args: { _slot_id: string }; Returns: string }
      get_student_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          ai_activity: number
          avatar_url: string
          cards_reviewed: number
          engagement: number
          full_name: string
          quiz_accuracy: number
          score: number
          streak_days: number
          university: string
          user_id: string
        }[]
      }
      get_student_leaderboard_filtered: {
        Args: { _course_id?: string; _limit?: number; _scope?: string }
        Returns: {
          ai_activity: number
          avatar_url: string
          cards_reviewed: number
          engagement: number
          full_name: string
          quiz_accuracy: number
          score: number
          streak_days: number
          university: string
          user_id: string
        }[]
      }
      get_student_parent_contact: {
        Args: { _student_id: string }
        Returns: {
          parent_email: string
          parent_phone: string
        }[]
      }
      get_trust_score: {
        Args: { _uid?: string }
        Returns: {
          age_days: number
          has_subscription: boolean
          profile_pct: number
          score: number
          study_days: number
        }[]
      }
      get_tutor_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          avg_rating: number
          followers_count: number
          full_name: string
          score: number
          students_impacted: number
          tutor_id: string
          uploads_count: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      growth_ambassador_leaderboard: {
        Args: { _period?: string }
        Returns: {
          full_name: string
          score: number
          tier: string
          total_onboarded: number
          total_referrals: number
          university: string
          user_id: string
        }[]
      }
      growth_campus_impact: {
        Args: never
        Returns: {
          active_students: number
          avg_success: number
          challenge_participation: number
          community_activity: number
          impact_score: number
          university: string
        }[]
      }
      growth_claim_milestone: { Args: { _milestone: string }; Returns: boolean }
      growth_department_rankings: {
        Args: { _university?: string }
        Returns: {
          active_students: number
          avg_quiz: number
          department: string
          score: number
          university: string
        }[]
      }
      growth_my_referral_summary: { Args: never; Returns: Json }
      growth_promote_ambassador: {
        Args: { _tier?: string; _user_id: string }
        Returns: string
      }
      growth_recompute_battle: {
        Args: { _battle_id: string }
        Returns: undefined
      }
      growth_settle_battle: { Args: { _battle_id: string }; Returns: string }
      growth_university_rankings: {
        Args: never
        Returns: {
          active_students: number
          arena_count: number
          avg_quiz: number
          score: number
          university: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage: {
        Args: { _kind: string; _limit: number }
        Returns: {
          allowed: boolean
          remaining: number
          used: number
        }[]
      }
      increment_lecture_note_download: {
        Args: { p_note_id: string }
        Returns: undefined
      }
      increment_lecture_note_view: {
        Args: { p_note_id: string }
        Returns: undefined
      }
      increment_opportunity_view: {
        Args: { p_opportunity_id: string }
        Returns: undefined
      }
      intelligence_exam_readiness: {
        Args: { _course: string; _user: string }
        Returns: Json
      }
      intelligence_exam_readiness_all: {
        Args: { _user?: string }
        Returns: Json
      }
      intelligence_opportunity_matches: {
        Args: { _limit?: number; _user?: string }
        Returns: {
          category: string
          cover_image_url: string
          deadline: string
          id: string
          match_score: number
          organization: string
          reasons: Json
          title: string
          university: string
        }[]
      }
      intelligence_success_score: { Args: { _user?: string }; Returns: Json }
      intelligence_today_mission: { Args: { _user?: string }; Returns: Json }
      intelligence_weekly_report: { Args: { _user?: string }; Returns: Json }
      is_chat_member: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      is_course_participant: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_pro: { Args: { _user_id: string }; Returns: boolean }
      is_school_member: {
        Args: { _role?: string; _school_id: string }
        Returns: boolean
      }
      join_brainstorm_thread: { Args: { _code: string }; Returns: string }
      list_course_ai_generations: {
        Args: { _course_id: string }
        Returns: {
          course_id: string | null
          created_at: string
          id: string
          kind: string
          output_ref: string | null
          params: Json
          resource_id: string | null
          resource_label: string | null
          status: string
          topic_id: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ai_generation_history"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_admin_id: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id: string
          p_table_name: string
        }
        Returns: string
      }
      match_search_index: {
        Args: {
          filter_type?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          body: string
          entity_id: string
          entity_type: string
          id: string
          similarity: number
          title: string
          url: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_environment: {
        Args: never
        Returns: Database["public"]["Enums"]["learning_environment"]
      }
      my_university: { Args: never; Returns: string }
      notify_admins_of_new_findings: {
        Args: { _run_id: string }
        Returns: number
      }
      notify_course_students: {
        Args: {
          _course_id: string
          _exclude_user?: string
          _link: string
          _message: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      notify_course_tutors: {
        Args: { _course_id: string; _link: string; _snippet: string }
        Returns: number
      }
      opportunities_needing_reminder: {
        Args: never
        Returns: {
          deadline: string
          hours_left: number
          opportunity_id: string
          title: string
          user_id: string
        }[]
      }
      ping_session: { Args: { _token: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recommend_opportunities: {
        Args: { _limit?: number }
        Returns: {
          apply_url: string | null
          bookmark_count: number
          category: Database["public"]["Enums"]["opportunity_category"]
          comment_count: number
          cover_image_url: string | null
          created_at: string
          deadline: string | null
          description: string
          id: string
          organization: string
          posted_by: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          title: string
          university: string | null
          university_code: string | null
          updated_at: string
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "opportunities"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      recommend_tutors_for_me: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          avg_rating: number
          course_code: string
          course_id: string
          course_name: string
          department: string
          full_name: string
          profile_image_url: string
          rating_count: number
          reason: string
          tutor_id: string
        }[]
      }
      record_device_login: {
        Args: { _label: string; _ua: string }
        Returns: string
      }
      record_device_session: {
        Args: { _token: string; _ua: string }
        Returns: undefined
      }
      register_device: {
        Args: { _fingerprint: string; _user_agent?: string }
        Returns: Json
      }
      reject_payment_request: {
        Args: { _id: string; _note?: string }
        Returns: undefined
      }
      request_withdrawal: {
        Args: { _payout_email: string; _tokens: number }
        Returns: string
      }
      resolve_affiliate_slug: {
        Args: { _slug: string }
        Returns: {
          destination: string
          id: string
        }[]
      }
      run_security_audit: { Args: never; Returns: string }
      search_courses_scoped: {
        Args: { _q: string }
        Returns: {
          course_id: string
          id: string
          kind: string
          subtitle: string
          title: string
        }[]
      }
      start_dm: { Args: { _other_user: string }; Returns: string }
      unlock_quiz: { Args: { _quiz_id: string }; Returns: Json }
      verify_device: { Args: { _fingerprint: string }; Returns: Json }
    }
    Enums: {
      academic_path: "secondary" | "jamb" | "university"
      app_role:
        | "student"
        | "tutor"
        | "admin"
        | "school_owner"
        | "school_admin"
        | "teacher"
        | "parent"
      application_status: "pending" | "approved" | "rejected"
      arena_entry_status: "in_progress" | "submitted" | "disqualified"
      arena_kind: "daily" | "weekly"
      arena_status: "draft" | "scheduled" | "live" | "ended" | "settled"
      chat_context_kind: "study_pack" | "tutor_curriculum"
      chat_thread_kind: "dm" | "group" | "brainstorm"
      learning_environment: "university" | "jamb"
      opportunity_category:
        | "internship"
        | "scholarship"
        | "hackathon"
        | "competition"
        | "tech_program"
        | "career"
      opportunity_status: "draft" | "published" | "archived"
      post_status: "draft" | "pending" | "published" | "archived"
      post_type: "showcase" | "opportunity" | "article" | "announcement"
      resource_kind:
        | "pdf"
        | "image"
        | "note"
        | "flashcard"
        | "study_pack"
        | "audio"
      tutor_material_kind: "pdf" | "note" | "flashcard_set" | "link"
      wallet_txn_kind:
        | "topup"
        | "spend"
        | "admin_credit"
        | "admin_debit"
        | "refund"
        | "free"
        | "arena_entry"
        | "arena_prize"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      academic_path: ["secondary", "jamb", "university"],
      app_role: [
        "student",
        "tutor",
        "admin",
        "school_owner",
        "school_admin",
        "teacher",
        "parent",
      ],
      application_status: ["pending", "approved", "rejected"],
      arena_entry_status: ["in_progress", "submitted", "disqualified"],
      arena_kind: ["daily", "weekly"],
      arena_status: ["draft", "scheduled", "live", "ended", "settled"],
      chat_context_kind: ["study_pack", "tutor_curriculum"],
      chat_thread_kind: ["dm", "group", "brainstorm"],
      learning_environment: ["university", "jamb"],
      opportunity_category: [
        "internship",
        "scholarship",
        "hackathon",
        "competition",
        "tech_program",
        "career",
      ],
      opportunity_status: ["draft", "published", "archived"],
      post_status: ["draft", "pending", "published", "archived"],
      post_type: ["showcase", "opportunity", "article", "announcement"],
      resource_kind: [
        "pdf",
        "image",
        "note",
        "flashcard",
        "study_pack",
        "audio",
      ],
      tutor_material_kind: ["pdf", "note", "flashcard_set", "link"],
      wallet_txn_kind: [
        "topup",
        "spend",
        "admin_credit",
        "admin_debit",
        "refund",
        "free",
        "arena_entry",
        "arena_prize",
      ],
    },
  },
} as const

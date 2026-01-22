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
      bible_comments: {
        Row: {
          book: string
          chapter: number
          content: string
          created_at: string | null
          group_id: string
          id: string
          updated_at: string | null
          user_id: string
          verse: number
        }
        Insert: {
          book: string
          chapter: number
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          updated_at?: string | null
          user_id: string
          verse: number
        }
        Update: {
          book?: string
          chapter?: number
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          verse?: number
        }
        Relationships: [
          {
            foreignKeyName: "bible_comments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrations: {
        Row: {
          celebration_type: string
          created_at: string | null
          group_id: string
          id: string
          post_date: string | null
          related_id: string | null
          shown_at: string | null
          user_id: string
        }
        Insert: {
          celebration_type: string
          created_at?: string | null
          group_id: string
          id?: string
          post_date?: string | null
          related_id?: string | null
          shown_at?: string | null
          user_id: string
        }
        Update: {
          celebration_type?: string
          created_at?: string | null
          group_id?: string
          id?: string
          post_date?: string | null
          related_id?: string | null
          shown_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebrations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string | null
          description: string | null
          group_id: string
          id: string
          title: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_id: string
          id?: string
          title: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_id?: string
          id?: string
          title?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_devotional_completions: {
        Row: {
          created_at: string | null
          date: string
          devotional_completed: boolean | null
          group_id: string
          id: string
          prayer_completed: boolean | null
          scripture_completed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          devotional_completed?: boolean | null
          group_id: string
          id?: string
          prayer_completed?: boolean | null
          scripture_completed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          devotional_completed?: boolean | null
          group_id?: string
          id?: string
          prayer_completed?: boolean | null
          scripture_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_devotional_completions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_devotional_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      devotional_comments: {
        Row: {
          content: string
          created_at: string | null
          devotional_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          devotional_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          devotional_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotional_comments_devotional_id_fkey"
            columns: ["devotional_id"]
            isOneToOne: false
            referencedRelation: "devotionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devotional_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      devotional_likes: {
        Row: {
          created_at: string | null
          devotional_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          devotional_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          devotional_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotional_likes_devotional_id_fkey"
            columns: ["devotional_id"]
            isOneToOne: false
            referencedRelation: "devotionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devotional_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      devotionals: {
        Row: {
          content: string | null
          created_at: string | null
          group_id: string
          id: string
          image_url: string | null
          post_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          group_id: string
          id?: string
          image_url?: string | null
          post_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          group_id?: string
          id?: string
          image_url?: string | null
          post_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotionals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devotionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_poll_options: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          option_datetime: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          option_datetime: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          option_datetime?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_poll_options_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_poll_votes: {
        Row: {
          created_at: string | null
          id: string
          poll_option_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          poll_option_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          poll_option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_poll_votes_poll_option_id_fkey"
            columns: ["poll_option_id"]
            isOneToOne: false
            referencedRelation: "event_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          ai_questions: string[] | null
          ai_summary: string | null
          ai_themes: string[] | null
          chapter_to_discuss: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string | null
          group_id: string
          id: string
          is_poll: boolean | null
          location: string | null
          poll_deadline: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          ai_questions?: string[] | null
          ai_summary?: string | null
          ai_themes?: string[] | null
          chapter_to_discuss?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          group_id: string
          id?: string
          is_poll?: boolean | null
          location?: string | null
          poll_deadline?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          ai_questions?: string[] | null
          ai_summary?: string | null
          ai_themes?: string[] | null
          chapter_to_discuss?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          group_id?: string
          id?: string
          is_poll?: boolean | null
          location?: string | null
          poll_deadline?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          invite_code: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          invite_code: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_interactions: {
        Row: {
          id: string
          last_prayed_at: string | null
          prayed_count: number | null
          prayer_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_prayed_at?: string | null
          prayed_count?: number | null
          prayer_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_prayed_at?: string | null
          prayed_count?: number | null
          prayer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_interactions_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayers: {
        Row: {
          answered_at: string | null
          content: string | null
          created_at: string | null
          group_id: string
          id: string
          is_answered: boolean | null
          prayer_count: number
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          content?: string | null
          created_at?: string | null
          group_id: string
          id?: string
          is_answered?: boolean | null
          prayer_count?: number
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string | null
          content?: string | null
          created_at?: string | null
          group_id?: string
          id?: string
          is_answered?: boolean | null
          prayer_count?: number
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string
          id?: string
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          devotional_reminder_count: number | null
          devotional_reminder_hour: number | null
          devotional_reminder_minute: number | null
          devotional_reminder_time_1_hour: number | null
          devotional_reminder_time_1_minute: number | null
          devotional_reminder_time_2_hour: number | null
          devotional_reminder_time_2_minute: number | null
          devotional_reminder_time_3_hour: number | null
          devotional_reminder_time_3_minute: number | null
          devotional_reminders: boolean | null
          event_alerts: boolean | null
          id: string
          prayer_notifications: boolean | null
          prayer_reminder_enabled: boolean | null
          prayer_reminder_hour: number | null
          prayer_reminder_minute: number | null
          smart_notifications_enabled: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          devotional_reminder_count?: number | null
          devotional_reminder_hour?: number | null
          devotional_reminder_minute?: number | null
          devotional_reminder_time_1_hour?: number | null
          devotional_reminder_time_1_minute?: number | null
          devotional_reminder_time_2_hour?: number | null
          devotional_reminder_time_2_minute?: number | null
          devotional_reminder_time_3_hour?: number | null
          devotional_reminder_time_3_minute?: number | null
          devotional_reminders?: boolean | null
          event_alerts?: boolean | null
          id?: string
          prayer_notifications?: boolean | null
          prayer_reminder_enabled?: boolean | null
          prayer_reminder_hour?: number | null
          prayer_reminder_minute?: number | null
          smart_notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          devotional_reminder_count?: number | null
          devotional_reminder_hour?: number | null
          devotional_reminder_minute?: number | null
          devotional_reminder_time_1_hour?: number | null
          devotional_reminder_time_1_minute?: number | null
          devotional_reminder_time_2_hour?: number | null
          devotional_reminder_time_2_minute?: number | null
          devotional_reminder_time_3_hour?: number | null
          devotional_reminder_time_3_minute?: number | null
          devotional_reminders?: boolean | null
          event_alerts?: boolean | null
          id?: string
          prayer_notifications?: boolean | null
          prayer_reminder_enabled?: boolean | null
          prayer_reminder_hour?: number | null
          prayer_reminder_minute?: number | null
          smart_notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          current_streak: number | null
          group_id: string
          id: string
          last_post_date: string | null
          longest_streak: number | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          group_id: string
          id?: string
          last_post_date?: string | null
          longest_streak?: number | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          group_id?: string
          id?: string
          last_post_date?: string | null
          longest_streak?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_group_by_invite_code: {
        Args: { code: string }
        Returns: {
          description: string
          id: string
          name: string
        }[]
      }
      get_user_group_ids: { Args: never; Returns: string[] }
      increment_prayer_count: {
        Args: { prayer_id_param: string }
        Returns: undefined
      }
      is_group_admin: { Args: { check_group_id: string }; Returns: boolean }
      is_group_member: { Args: { check_group_id: string }; Returns: boolean }
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

// Convenience types
export type Profile = Tables<'profiles'>;
export type Group = Tables<'groups'>;
export type GroupMember = Tables<'group_members'>;
export type Devotional = Tables<'devotionals'>;
export type Prayer = Tables<'prayers'>;
export type Event = Tables<'events'>;
export type EventRsvp = Tables<'event_rsvps'>;
export type UserPreferences = Tables<'user_preferences'>;
export type Challenge = Tables<'challenges'>;
export type DailyDevotionalCompletion = Tables<'daily_devotional_completions'>;

// Extended types with relations
export type PrayerWithAuthor = Prayer & {
  profiles: Profile;
  total_prayed: number;
};

export type DevotionalWithAuthor = Devotional & {
  profiles: Profile;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
};

export type EventWithRsvps = Event & {
  rsvp_counts: {
    yes: number;
    no: number;
    maybe: number;
  };
  user_rsvp: 'yes' | 'no' | 'maybe' | null;
};

export type GroupMemberWithProfile = GroupMember & {
  profiles: Profile;
};

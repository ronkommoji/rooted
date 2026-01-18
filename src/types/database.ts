export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
          invite_code?: string
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
      user_preferences: {
        Row: {
          created_at: string | null
          devotional_reminders: boolean | null
          devotional_reminder_hour: number | null
          devotional_reminder_minute: number | null
          event_alerts: boolean | null
          id: string
          prayer_notifications: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          devotional_reminders?: boolean | null
          devotional_reminder_hour?: number | null
          devotional_reminder_minute?: number | null
          event_alerts?: boolean | null
          id?: string
          prayer_notifications?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          devotional_reminders?: boolean | null
          devotional_reminder_hour?: number | null
          devotional_reminder_minute?: number | null
          event_alerts?: boolean | null
          id?: string
          prayer_notifications?: boolean | null
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
      daily_devotional_completions: {
        Row: {
          id: string
          user_id: string
          group_id: string
          date: string
          scripture_completed: boolean | null
          devotional_completed: boolean | null
          prayer_completed: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          group_id: string
          date: string
          scripture_completed?: boolean | null
          devotional_completed?: boolean | null
          prayer_completed?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string
          date?: string
          scripture_completed?: boolean | null
          devotional_completed?: boolean | null
          prayer_completed?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_devotional_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_devotional_completions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
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
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Exported row types
export type Profile = Tables<'profiles'>;
export type Group = Tables<'groups'>;
export type GroupMember = Tables<'group_members'>;
export type Prayer = Tables<'prayers'>;
export type PrayerInteraction = Tables<'prayer_interactions'>;
export type Devotional = Tables<'devotionals'>;
export type DevotionalLike = Tables<'devotional_likes'>;
export type DevotionalComment = Tables<'devotional_comments'>;
export type UserStreak = Tables<'user_streaks'>;
export type Event = Tables<'events'>;
export type EventPollOption = Tables<'event_poll_options'>;
export type EventPollVote = Tables<'event_poll_votes'>;
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

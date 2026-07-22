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
      advisors: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name_en: string
          name_th: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name_en: string
          name_th: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name_en?: string
          name_th?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      equipment_maintenance: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          equipment_name: string
          id: string
          reason: string | null
          room_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          equipment_name: string
          id?: string
          reason?: string | null
          room_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          equipment_name?: string
          id?: string
          reason?: string | null
          room_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms_public_heads"
            referencedColumns: ["room_id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          id: string
          name_en: string
          name_th: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name_en: string
          name_th: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name_en?: string
          name_th?: string
          updated_at?: string
        }
        Relationships: []
      }
      no_show_counters: {
        Row: {
          count: number
          last_no_show_at: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          count?: number
          last_no_show_at?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          count?: number
          last_no_show_at?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          role: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_emails: {
        Row: {
          body_html: string
          created_at: string
          id: string
          reservation_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template: string
          to_email: string
        }
        Insert: {
          body_html: string
          created_at?: string
          id?: string
          reservation_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template: string
          to_email: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          reservation_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_emails_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "public_reservation_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_emails_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "public_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_emails_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservation_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_emails_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          admin_note: string | null
          admin_notes: string | null
          admin_notified_at: string | null
          admin_reminded_at: string | null
          advisor_decided_at: string | null
          advisor_email: string | null
          advisor_id: string | null
          advisor_name: string | null
          advisor_reminded_at: string | null
          advisor_status: string
          advisor_token: string
          attendees: number
          completed_at: string | null
          confirmed_calendar: boolean
          confirmed_contact: boolean
          confirmed_rules: boolean
          created_at: string
          department: string | null
          end_at: string
          equipment: string | null
          equipment_selected: Json
          expires_at: string | null
          flow_type: Database["public"]["Enums"]["flow_type"] | null
          id: string
          no_show: boolean
          professor_endorsement: string
          professor_note: string | null
          purpose: string
          rejected_stage: string | null
          rejection_reason: string | null
          requester_email: string
          requester_name: string
          requester_phone: string | null
          room_id: string
          sample_count: string | null
          staff_decided_at: string | null
          staff_decided_by: string | null
          staff_reminded_at: string | null
          start_at: string
          status: Database["public"]["Enums"]["reservation_status"]
          student_id: string | null
          ta_decided_at: string | null
          ta_email: string | null
          ta_note: string | null
          ta_status: string
          ta_token: string
          tracking_token: string
          updated_at: string
          user_status: Database["public"]["Enums"]["user_status"] | null
        }
        Insert: {
          admin_note?: string | null
          admin_notes?: string | null
          admin_notified_at?: string | null
          admin_reminded_at?: string | null
          advisor_decided_at?: string | null
          advisor_email?: string | null
          advisor_id?: string | null
          advisor_name?: string | null
          advisor_reminded_at?: string | null
          advisor_status?: string
          advisor_token?: string
          attendees?: number
          completed_at?: string | null
          confirmed_calendar?: boolean
          confirmed_contact?: boolean
          confirmed_rules?: boolean
          created_at?: string
          department?: string | null
          end_at: string
          equipment?: string | null
          equipment_selected?: Json
          expires_at?: string | null
          flow_type?: Database["public"]["Enums"]["flow_type"] | null
          id?: string
          no_show?: boolean
          professor_endorsement?: string
          professor_note?: string | null
          purpose: string
          rejected_stage?: string | null
          rejection_reason?: string | null
          requester_email: string
          requester_name: string
          requester_phone?: string | null
          room_id: string
          sample_count?: string | null
          staff_decided_at?: string | null
          staff_decided_by?: string | null
          staff_reminded_at?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["reservation_status"]
          student_id?: string | null
          ta_decided_at?: string | null
          ta_email?: string | null
          ta_note?: string | null
          ta_status?: string
          ta_token?: string
          tracking_token?: string
          updated_at?: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
        }
        Update: {
          admin_note?: string | null
          admin_notes?: string | null
          admin_notified_at?: string | null
          admin_reminded_at?: string | null
          advisor_decided_at?: string | null
          advisor_email?: string | null
          advisor_id?: string | null
          advisor_name?: string | null
          advisor_reminded_at?: string | null
          advisor_status?: string
          advisor_token?: string
          attendees?: number
          completed_at?: string | null
          confirmed_calendar?: boolean
          confirmed_contact?: boolean
          confirmed_rules?: boolean
          created_at?: string
          department?: string | null
          end_at?: string
          equipment?: string | null
          equipment_selected?: Json
          expires_at?: string | null
          flow_type?: Database["public"]["Enums"]["flow_type"] | null
          id?: string
          no_show?: boolean
          professor_endorsement?: string
          professor_note?: string | null
          purpose?: string
          rejected_stage?: string | null
          rejection_reason?: string | null
          requester_email?: string
          requester_name?: string
          requester_phone?: string | null
          room_id?: string
          sample_count?: string | null
          staff_decided_at?: string | null
          staff_decided_by?: string | null
          staff_reminded_at?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          student_id?: string | null
          ta_decided_at?: string | null
          ta_email?: string | null
          ta_note?: string | null
          ta_status?: string
          ta_token?: string
          tracking_token?: string
          updated_at?: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "rooms_public_heads"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms_public_heads"
            referencedColumns: ["room_id"]
          },
        ]
      }
      room_staff: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notify: boolean
          role: string
          room_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notify?: boolean
          role?: string
          room_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notify?: boolean
          role?: string
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_staff_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_staff_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms_public_heads"
            referencedColumns: ["room_id"]
          },
        ]
      }
      rooms: {
        Row: {
          active: boolean
          capacity: number
          code: string
          contact_phone: string | null
          created_at: string
          description_en: string | null
          description_th: string | null
          equipment: Json
          flow_type: Database["public"]["Enums"]["flow_type"]
          google_calendar_url: string | null
          head_of_lab: string | null
          id: string
          lab_head_ids: string[]
          location: string | null
          name_en: string
          name_th: string
          officer_group: Database["public"]["Enums"]["officer_group"]
          responsible_staff_ids: string[]
          staff_in_charge: string | null
          type: Database["public"]["Enums"]["room_type"]
        }
        Insert: {
          active?: boolean
          capacity?: number
          code: string
          contact_phone?: string | null
          created_at?: string
          description_en?: string | null
          description_th?: string | null
          equipment?: Json
          flow_type?: Database["public"]["Enums"]["flow_type"]
          google_calendar_url?: string | null
          head_of_lab?: string | null
          id?: string
          lab_head_ids?: string[]
          location?: string | null
          name_en: string
          name_th: string
          officer_group?: Database["public"]["Enums"]["officer_group"]
          responsible_staff_ids?: string[]
          staff_in_charge?: string | null
          type: Database["public"]["Enums"]["room_type"]
        }
        Update: {
          active?: boolean
          capacity?: number
          code?: string
          contact_phone?: string | null
          created_at?: string
          description_en?: string | null
          description_th?: string | null
          equipment?: Json
          flow_type?: Database["public"]["Enums"]["flow_type"]
          google_calendar_url?: string | null
          head_of_lab?: string | null
          id?: string
          lab_head_ids?: string[]
          location?: string | null
          name_en?: string
          name_th?: string
          officer_group?: Database["public"]["Enums"]["officer_group"]
          responsible_staff_ids?: string[]
          staff_in_charge?: string | null
          type?: Database["public"]["Enums"]["room_type"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          officer_group: Database["public"]["Enums"]["officer_group"] | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          officer_group?: Database["public"]["Enums"]["officer_group"] | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          officer_group?: Database["public"]["Enums"]["officer_group"] | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      advisors_public: {
        Row: {
          active: boolean | null
          id: string | null
          name_en: string | null
          name_th: string | null
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          id?: string | null
          name_en?: string | null
          name_th?: string | null
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          id?: string | null
          name_en?: string | null
          name_th?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      public_reservation_slots: {
        Row: {
          end_at: string | null
          id: string | null
          room_id: string | null
          start_at: string | null
          status: Database["public"]["Enums"]["reservation_status"] | null
        }
        Insert: {
          end_at?: string | null
          id?: string | null
          room_id?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"] | null
        }
        Update: {
          end_at?: string | null
          id?: string | null
          room_id?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms_public_heads"
            referencedColumns: ["room_id"]
          },
        ]
      }
      public_reservations: {
        Row: {
          end_at: string | null
          id: string | null
          room_id: string | null
          start_at: string | null
          status: Database["public"]["Enums"]["reservation_status"] | null
        }
        Insert: {
          end_at?: string | null
          id?: string | null
          room_id?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"] | null
        }
        Update: {
          end_at?: string | null
          id?: string | null
          room_id?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms_public_heads"
            referencedColumns: ["room_id"]
          },
        ]
      }
      reservation_slots: {
        Row: {
          end_at: string | null
          id: string | null
          room_id: string | null
          start_at: string | null
          status: Database["public"]["Enums"]["reservation_status"] | null
        }
        Insert: {
          end_at?: string | null
          id?: string | null
          room_id?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"] | null
        }
        Update: {
          end_at?: string | null
          id?: string | null
          room_id?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms_public_heads"
            referencedColumns: ["room_id"]
          },
        ]
      }
      rooms_public_heads: {
        Row: {
          advisor_id: string | null
          name_en: string | null
          name_th: string | null
          room_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_working_days: { Args: { n: number; ts: string }; Returns: string }
      can_manage_room: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      decide_reservation_by_token: {
        Args: {
          _decision: string
          _reason?: string
          _role: string
          _token: string
        }
        Returns: Json
      }
      earliest_booking_start: { Args: never; Returns: string }
      get_reservation_by_token: {
        Args: { _role: string; _token: string }
        Returns: {
          advisor_decided_at: string
          advisor_name: string
          advisor_status: string
          attendees: number
          end_at: string
          id: string
          purpose: string
          requester_email: string
          requester_name: string
          start_at: string
          status: string
          ta_status: string
        }[]
      }
      get_reservation_by_tracking_token: {
        Args: { _token: string }
        Returns: {
          admin_decided_at: string
          advisor_decided_at: string
          advisor_name: string
          advisor_status: string
          attendees: number
          created_at: string
          end_at: string
          equipment: string
          expires_at: string
          has_advisor: boolean
          id: string
          purpose: string
          rejected_stage: string
          rejection_reason: string
          requester_name: string
          room_code: string
          room_name_en: string
          room_name_th: string
          staff_decided_at: string
          start_at: string
          status: string
          ta_status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_working_day: { Args: { d: string }; Returns: boolean }
      render_reservation_details: {
        Args: {
          r: Database["public"]["Tables"]["reservations"]["Row"]
          room_code: string
          room_name: string
        }
        Returns: string
      }
      run_reservation_maintenance: { Args: never; Returns: number }
      working_days_between: { Args: { e: string; s: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user" | "ta" | "lab_officer"
      flow_type: "equipment" | "computer" | "classroom"
      officer_group: "sopit" | "kanchalika" | "wiyada" | "none"
      reservation_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "pending_ta_advisor"
        | "pending_admin"
        | "ta_approved"
        | "confirmed"
        | "expired"
        | "completed"
        | "no_show"
        | "pending_advisor"
        | "pending_staff"
      room_type: "lab" | "pc"
      user_status: "bachelor" | "master" | "phd" | "staff"
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
      app_role: ["admin", "user", "ta", "lab_officer"],
      flow_type: ["equipment", "computer", "classroom"],
      officer_group: ["sopit", "kanchalika", "wiyada", "none"],
      reservation_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "pending_ta_advisor",
        "pending_admin",
        "ta_approved",
        "confirmed",
        "expired",
        "completed",
        "no_show",
        "pending_advisor",
        "pending_staff",
      ],
      room_type: ["lab", "pc"],
      user_status: ["bachelor", "master", "phd", "staff"],
    },
  },
} as const

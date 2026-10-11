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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      billing_links: {
        Row: {
          created_at: string
          expires_at: string
          stripe_customer_id: string
          stripe_env: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          stripe_customer_id: string
          stripe_env: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          stripe_customer_id?: string
          stripe_env?: string
          token?: string
        }
        Relationships: []
      }
      call_list: {
        Row: {
          address: string
          appointment_at: string | null
          area: string
          brief: string
          brief_at: string | null
          budget: string
          business_name: string
          called_at: string | null
          called_by: string | null
          caller_name: string
          category: string
          contact_name: string
          contact_role: string
          expected_by: string | null
          follow_up_date: string | null
          found_at: string
          found_by: string | null
          id: string
          interested_package: string
          needs: string
          outcome: string
          phone: string
          place_id: string
          profile_notes: string
          profile_updated_at: string | null
          profile_updated_by_name: string
          rep_employee_id: string
          rep_id: string | null
          rep_name: string
          status: string
          website: string
          website_check_note: string
          website_checked_at: string | null
          website_status: string
        }
        Insert: {
          address?: string
          appointment_at?: string | null
          area?: string
          brief?: string
          brief_at?: string | null
          budget?: string
          business_name: string
          called_at?: string | null
          called_by?: string | null
          caller_name?: string
          category?: string
          contact_name?: string
          contact_role?: string
          expected_by?: string | null
          follow_up_date?: string | null
          found_at?: string
          found_by?: string | null
          id?: string
          interested_package?: string
          needs?: string
          outcome?: string
          phone?: string
          place_id: string
          profile_notes?: string
          profile_updated_at?: string | null
          profile_updated_by_name?: string
          rep_employee_id?: string
          rep_id?: string | null
          rep_name?: string
          status?: string
          website?: string
          website_check_note?: string
          website_checked_at?: string | null
          website_status?: string
        }
        Update: {
          address?: string
          appointment_at?: string | null
          area?: string
          brief?: string
          brief_at?: string | null
          budget?: string
          business_name?: string
          called_at?: string | null
          called_by?: string | null
          caller_name?: string
          category?: string
          contact_name?: string
          contact_role?: string
          expected_by?: string | null
          follow_up_date?: string | null
          found_at?: string
          found_by?: string | null
          id?: string
          interested_package?: string
          needs?: string
          outcome?: string
          phone?: string
          place_id?: string
          profile_notes?: string
          profile_updated_at?: string | null
          profile_updated_by_name?: string
          rep_employee_id?: string
          rep_id?: string | null
          rep_name?: string
          status?: string
          website?: string
          website_check_note?: string
          website_checked_at?: string | null
          website_status?: string
        }
        Relationships: []
      }
      call_list_skips: {
        Row: {
          call_list_id: string
          skipped_at: string
          user_id: string
        }
        Insert: {
          call_list_id: string
          skipped_at?: string
          user_id: string
        }
        Update: {
          call_list_id?: string
          skipped_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_list_skips_call_list_id_fkey"
            columns: ["call_list_id"]
            isOneToOne: false
            referencedRelation: "call_list"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellations: {
        Row: {
          business_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          notes: string
          quote_id: string | null
          reason: string
          refund_amount: number
          refund_type: string
          review_note: string
          reviewed_at: string | null
          scope: string
          status: string
          submitted_by: string | null
          submitted_by_employee_id: string
          submitted_by_name: string
        }
        Insert: {
          business_name: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          notes?: string
          quote_id?: string | null
          reason?: string
          refund_amount?: number
          refund_type?: string
          review_note?: string
          reviewed_at?: string | null
          scope?: string
          status?: string
          submitted_by?: string | null
          submitted_by_employee_id?: string
          submitted_by_name?: string
        }
        Update: {
          business_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          notes?: string
          quote_id?: string | null
          reason?: string
          refund_amount?: number
          refund_type?: string
          review_note?: string
          reviewed_at?: string | null
          scope?: string
          status?: string
          submitted_by?: string | null
          submitted_by_employee_id?: string
          submitted_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          commission_amount: number
          created_at: string
          created_by: string | null
          customer_name: string
          description: string
          employee_id: string
          flag_note: string
          id: string
          kind: string
          member_id: string | null
          paid_at: string | null
          paid_note: string
          quote_id: string | null
          sale_amount: number
          sale_date: string
          status: string
          stripe_invoice_id: string | null
        }
        Insert: {
          commission_amount: number
          created_at?: string
          created_by?: string | null
          customer_name: string
          description?: string
          employee_id: string
          flag_note?: string
          id?: string
          kind?: string
          member_id?: string | null
          paid_at?: string | null
          paid_note?: string
          quote_id?: string | null
          sale_amount: number
          sale_date?: string
          status?: string
          stripe_invoice_id?: string | null
        }
        Update: {
          commission_amount?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string
          description?: string
          employee_id?: string
          flag_note?: string
          id?: string
          kind?: string
          member_id?: string | null
          paid_at?: string | null
          paid_note?: string
          quote_id?: string | null
          sale_amount?: number
          sale_date?: string
          status?: string
          stripe_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_expenses: {
        Row: {
          allocation: string
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          project: string
          receipt_path: string
          vendor: string
        }
        Insert: {
          allocation?: string
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          project?: string
          receipt_path?: string
          vendor?: string
        }
        Update: {
          allocation?: string
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          project?: string
          receipt_path?: string
          vendor?: string
        }
        Relationships: []
      }
      contractor_tax_info: {
        Row: {
          address: string
          business_name: string
          certified_at: string
          city: string
          legal_name: string
          phone: string
          state: string
          tax_classification: string
          tin: string
          tin_type: string
          updated_at: string
          user_id: string
          zip: string
        }
        Insert: {
          address: string
          business_name?: string
          certified_at?: string
          city: string
          legal_name: string
          phone?: string
          state: string
          tax_classification: string
          tin: string
          tin_type: string
          updated_at?: string
          user_id: string
          zip: string
        }
        Update: {
          address?: string
          business_name?: string
          certified_at?: string
          city?: string
          legal_name?: string
          phone?: string
          state?: string
          tax_classification?: string
          tin?: string
          tin_type?: string
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          id: number
          total: number
          updated_at: string
        }
        Insert: {
          id?: number
          total?: number
          updated_at?: string
        }
        Update: {
          id?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          city: string
          country: string
          created_at: string
          email: string
          id: string
          ip_address: string
          name: string
          note: string
          phone: string
          region: string
          website: string
        }
        Insert: {
          city?: string
          country?: string
          created_at?: string
          email: string
          id?: string
          ip_address?: string
          name: string
          note?: string
          phone?: string
          region?: string
          website?: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: string
          name?: string
          note?: string
          phone?: string
          region?: string
          website?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          billing_cycle: string
          business_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          join_date: string
          next_billing_date: string | null
          notes: string
          phone: string
          plan_name: string
          plan_price: number
          status: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          business_name?: string
          created_at?: string
          email?: string
          full_name: string
          id?: string
          join_date?: string
          next_billing_date?: string | null
          notes?: string
          phone?: string
          plan_name?: string
          plan_price?: number
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          business_name?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          join_date?: string
          next_billing_date?: string | null
          notes?: string
          phone?: string
          plan_name?: string
          plan_price?: number
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_photos: {
        Row: {
          created_at: string
          file_name: string
          id: string
          path: string
          quote_id: string
          source: string
          uploaded_by_name: string
        }
        Insert: {
          created_at?: string
          file_name?: string
          id?: string
          path: string
          quote_id: string
          source?: string
          uploaded_by_name?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          path?: string
          quote_id?: string
          source?: string
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_photos_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string
          id: string
          member_id: string
          payment_date: string
          status: string
          stripe_invoice_id: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string
          id?: string
          member_id: string
          payment_date?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string
          id?: string
          member_id?: string
          payment_date?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          employee_id: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          employee_id?: string
          id: string
          username?: string
        }
        Update: {
          created_at?: string
          email?: string
          employee_id?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          addons: Json
          appointment_at: string | null
          build_notes: string
          build_ready_at: string | null
          build_status: string
          business_name: string
          call_list_id: string | null
          contact_email: string
          contact_name: string
          created_at: string
          created_by: string | null
          created_by_name: string
          discount_type: string
          discount_value: number
          expected_by: string | null
          id: string
          installment_failures: number
          installments: number
          installments_paid: number
          last_charge_error: string
          membership_free_month: boolean
          membership_name: string
          membership_price: number
          next_installment_at: string | null
          one_time_total: number
          package_name: string
          package_price: number
          promo_note: string
          refunded_at: string | null
          sales_rep_employee_id: string
          status: string
          stripe_customer_id: string
          stripe_env: string
          stripe_payment_method_id: string
          updated_at: string
        }
        Insert: {
          addons?: Json
          appointment_at?: string | null
          build_notes?: string
          build_ready_at?: string | null
          build_status?: string
          business_name: string
          call_list_id?: string | null
          contact_email?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          discount_type?: string
          discount_value?: number
          expected_by?: string | null
          id?: string
          installment_failures?: number
          installments?: number
          installments_paid?: number
          last_charge_error?: string
          membership_free_month?: boolean
          membership_name?: string
          membership_price?: number
          next_installment_at?: string | null
          one_time_total?: number
          package_name?: string
          package_price?: number
          promo_note?: string
          refunded_at?: string | null
          sales_rep_employee_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_env?: string
          stripe_payment_method_id?: string
          updated_at?: string
        }
        Update: {
          addons?: Json
          appointment_at?: string | null
          build_notes?: string
          build_ready_at?: string | null
          build_status?: string
          business_name?: string
          call_list_id?: string | null
          contact_email?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          discount_type?: string
          discount_value?: number
          expected_by?: string | null
          id?: string
          installment_failures?: number
          installments?: number
          installments_paid?: number
          last_charge_error?: string
          membership_free_month?: boolean
          membership_name?: string
          membership_price?: number
          next_installment_at?: string | null
          one_time_total?: number
          package_name?: string
          package_price?: number
          promo_note?: string
          refunded_at?: string | null
          sales_rep_employee_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_env?: string
          stripe_payment_method_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_call_list_id_fkey"
            columns: ["call_list_id"]
            isOneToOne: false
            referencedRelation: "call_list"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          requester_email: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          requester_email?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          requester_email?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      site_views: {
        Row: {
          id: number
          total: number
          updated_at: string
        }
        Insert: {
          id?: number
          total?: number
          updated_at?: string
        }
        Update: {
          id?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visitor_logs: {
        Row: {
          city: string
          client_sent_at: string | null
          country: string
          created_at: string
          device_type: string
          id: string
          ip_address: string
          page_path: string
          referrer: string
          region: string
          session_id: string
          user_agent: string
        }
        Insert: {
          city?: string
          client_sent_at?: string | null
          country?: string
          created_at?: string
          device_type?: string
          id?: string
          ip_address?: string
          page_path?: string
          referrer?: string
          region?: string
          session_id?: string
          user_agent?: string
        }
        Update: {
          city?: string
          client_sent_at?: string | null
          country?: string
          created_at?: string
          device_type?: string
          id?: string
          ip_address?: string
          page_path?: string
          referrer?: string
          region?: string
          session_id?: string
          user_agent?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_form_submissions: { Args: never; Returns: number }
      increment_site_views: { Args: never; Returns: number }
      purge_old_visitor_logs: { Args: never; Returns: undefined }
      redeem_signup_code: {
        Args: { _code: string; _user_id: string }
        Returns: undefined
      }
      submit_lead:
        | {
            Args: {
              _email: string
              _name: string
              _note: string
              _website: string
            }
            Returns: string
          }
        | {
            Args: {
              _email: string
              _name: string
              _note: string
              _phone: string
              _website: string
            }
            Returns: string
          }
      validate_signup_code: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "telemarketer" | "pending" | "revoked" | "suspended"
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
      app_role: ["admin", "telemarketer", "pending", "revoked", "suspended"],
    },
  },
} as const

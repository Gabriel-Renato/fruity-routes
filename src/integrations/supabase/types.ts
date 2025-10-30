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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      },
      products: {
        Row: {
          id: string
          store_id: string
          name: string
          price_milli: number
          created_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          price_milli: number
          created_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          price_milli?: number
          created_at?: string | null
        }
        Relationships: []
      },
      stores: {
        Row: { id: string; owner_id: string; name: string; active: boolean; delivery_radius_km: string | null; created_at: string | null }
        Insert: { id?: string; owner_id: string; name: string; active?: boolean; delivery_radius_km?: string | null; created_at?: string | null }
        Update: { id?: string; owner_id?: string; name?: string; active?: boolean; delivery_radius_km?: string | null; created_at?: string | null }
        Relationships: []
      },
      categories: {
        Row: { id: string; name: string }
        Insert: { id?: string; name: string }
        Update: { id?: string; name?: string }
        Relationships: []
      },
      product_categories: {
        Row: { product_id: string; category_id: string }
        Insert: { product_id: string; category_id: string }
        Update: { product_id?: string; category_id?: string }
        Relationships: []
      },
      addresses: {
        Row: { id: string; user_id: string; label: string | null; street: string | null; city: string | null; state: string | null; zip: string | null; lat: number | null; lng: number | null; created_at: string | null }
        Insert: { id?: string; user_id: string; label?: string | null; street?: string | null; city?: string | null; state?: string | null; zip?: string | null; lat?: number | null; lng?: number | null; created_at?: string | null }
        Update: { id?: string; user_id?: string; label?: string | null; street?: string | null; city?: string | null; state?: string | null; zip?: string | null; lat?: number | null; lng?: number | null; created_at?: string | null }
        Relationships: []
      },
      carts: {
        Row: { id: string; user_id: string; store_id: string | null; created_at: string | null }
        Insert: { id?: string; user_id: string; store_id?: string | null; created_at?: string | null }
        Update: { id?: string; user_id?: string; store_id?: string | null; created_at?: string | null }
        Relationships: []
      },
      cart_items: {
        Row: { id: string; cart_id: string; product_id: string; qty: number; unit_price_milli: number; created_at: string | null }
        Insert: { id?: string; cart_id: string; product_id: string; qty: number; unit_price_milli: number; created_at?: string | null }
        Update: { id?: string; cart_id?: string; product_id?: string; qty?: number; unit_price_milli?: number; created_at?: string | null }
        Relationships: []
      },
      orders: {
        Row: { id: string; customer_id: string; store_id: string; status: string; total_milli: number; created_at: string | null }
        Insert: { id?: string; customer_id: string; store_id: string; status?: string; total_milli?: number; created_at?: string | null }
        Update: { id?: string; customer_id?: string; store_id?: string; status?: string; total_milli?: number; created_at?: string | null }
        Relationships: []
      },
      order_items: {
        Row: { id: string; order_id: string; product_id: string; qty: number; unit_price_milli: number; subtotal_milli: number; created_at: string | null }
        Insert: { id?: string; order_id: string; product_id: string; qty: number; unit_price_milli: number; subtotal_milli: number; created_at?: string | null }
        Update: { id?: string; order_id?: string; product_id?: string; qty?: number; unit_price_milli?: number; subtotal_milli?: number; created_at?: string | null }
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
      user_type: "customer" | "store" | "rider"
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
      user_type: ["customer", "store", "rider"],
    },
  },
} as const

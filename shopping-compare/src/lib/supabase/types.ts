export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          price: number | null;
          currency: string;
          image_url: string | null;
          images: string[];
          product_url: string;
          store_name: string;
          store_domain: string;
          specs: Json;
          notes: string | null;
          created_at: string;
          previous_price: number | null;
          price_updated_at: string | null;
          last_checked_at: string | null;
          price_check_failed: boolean;
          price_alerts: boolean;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          price?: number | null;
          currency?: string;
          image_url?: string | null;
          images?: string[];
          product_url: string;
          store_name: string;
          store_domain: string;
          specs?: Json;
          notes?: string | null;
          created_at?: string;
          previous_price?: number | null;
          price_updated_at?: string | null;
          last_checked_at?: string | null;
          price_check_failed?: boolean;
          price_alerts?: boolean;
          valid_from?: string;
          valid_to?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          price?: number | null;
          currency?: string;
          image_url?: string | null;
          images?: string[];
          product_url?: string;
          store_name?: string;
          store_domain?: string;
          specs?: Json;
          notes?: string | null;
          created_at?: string;
          previous_price?: number | null;
          price_updated_at?: string | null;
          last_checked_at?: string | null;
          price_check_failed?: boolean;
          price_alerts?: boolean;
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [];
      };
      comparison_groups: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: { user_id: string; price_alerts: boolean; created_at: string };
        Insert: { user_id: string; price_alerts?: boolean; created_at?: string };
        Update: { user_id?: string; price_alerts?: boolean; created_at?: string };
        Relationships: [];
      };
      shared_comparisons: {
        Row: {
          id: string;
          slug: string;
          user_id: string;
          group_id: string | null;
          title: string;
          products: Json;
          created_at: string;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          id?: string;
          slug: string;
          user_id: string;
          group_id?: string | null;
          title: string;
          products: Json;
          created_at?: string;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          id?: string;
          slug?: string;
          user_id?: string;
          group_id?: string | null;
          title?: string;
          products?: Json;
          created_at?: string;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [];
      };
      comparison_items: {
        Row: {
          id: string;
          group_id: string;
          product_id: string;
          position: number;
        };
        Insert: {
          id?: string;
          group_id: string;
          product_id: string;
          position?: number;
        };
        Update: {
          id?: string;
          group_id?: string;
          product_id?: string;
          position?: number;
        };
        Relationships: [];
      };
      price_history: {
        Row: {
          id: string;
          product_url: string;
          price: number;
          currency: string;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          product_url: string;
          price: number;
          currency: string;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          product_url?: string;
          price?: number;
          currency?: string;
          recorded_at?: string;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          user_id: string | null;
          email: string | null;
          category: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          category: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          category?: string;
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience types
export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ComparisonGroup = Database['public']['Tables']['comparison_groups']['Row'];
export type ComparisonItem = Database['public']['Tables']['comparison_items']['Row'];

export type ProductWithGroup = Product & {
  group_id?: string;
  group_name?: string;
};

export type SharedProduct = {
  name: string;
  price: number | null;
  currency: string;
  image_url: string | null;
  images: string[];
  product_url: string;
  store_name: string;
  store_domain: string;
  specs: Json;
  previous_price: number | null;
};

export type SharedComparison = Omit<Database['public']['Tables']['shared_comparisons']['Row'], 'products'> & {
  products: SharedProduct[];
};

export type Feedback = Database['public']['Tables']['feedback']['Row'];
export type FeedbackInsert = Database['public']['Tables']['feedback']['Insert'];
export type Referral = Database['public']['Tables']['referrals']['Row'];

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          category: string;
          product_name: string;
          model_number: string;
          base_price: number;
          summary: string | null;
          is_synthetic: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          product_name: string;
          model_number: string;
          base_price: number;
          summary?: string | null;
          is_synthetic?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          product_name?: string;
          model_number?: string;
          base_price?: number;
          summary?: string | null;
          is_synthetic?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      marketplaces: {
        Row: {
          id: string;
          name: string;
          logo: string;
          color: string;
          base_url: string;
        };
        Insert: {
          id: string;
          name: string;
          logo: string;
          color: string;
          base_url: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo?: string;
          color?: string;
          base_url?: string;
        };
      };
      marketplace_listings: {
        Row: {
          id: string;
          product_id: string;
          marketplace_id: string;
          price: number;
          original_price: number;
          discount: number;
          currency: string;
          star_rating: number;
          review_count: number;
          delivery_days: string;
          in_stock: boolean;
          url: string;
          overall_score: number;
          pros: Json;
          cons: Json;
          is_synthetic: boolean;
          source_url: string | null;
          source_listing_id: string | null;
          last_seen_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          marketplace_id: string;
          price: number;
          original_price: number;
          discount?: number;
          currency?: string;
          star_rating: number;
          review_count?: number;
          delivery_days: string;
          in_stock?: boolean;
          url: string;
          overall_score: number;
          pros?: Json;
          cons?: Json;
          is_synthetic?: boolean;
          source_url?: string | null;
          source_listing_id?: string | null;
          last_seen_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          marketplace_id?: string;
          price?: number;
          original_price?: number;
          discount?: number;
          currency?: string;
          star_rating?: number;
          review_count?: number;
          delivery_days?: string;
          in_stock?: boolean;
          url?: string;
          overall_score?: number;
          pros?: Json;
          cons?: Json;
          is_synthetic?: boolean;
          source_url?: string | null;
          source_listing_id?: string | null;
          last_seen_at?: string;
          created_at?: string;
        };
      };
      rating_categories: {
        Row: {
          id: string;
          listing_id: string;
          label: string;
          score: number;
          icon: string;
          detail: string;
          weight: number;
          breakdown: Json;
        };
        Insert: {
          id?: string;
          listing_id: string;
          label: string;
          score: number;
          icon: string;
          detail: string;
          weight: number;
          breakdown?: Json;
        };
        Update: {
          id?: string;
          listing_id?: string;
          label?: string;
          score?: number;
          icon?: string;
          detail?: string;
          weight?: number;
          breakdown?: Json;
        };
      };
      reviews: {
        Row: {
          id: string;
          listing_id: string;
          author: string;
          text: string;
          rating: number;
          date_text: string;
          marketplace_name: string;
          verified: boolean;
          sentiment: 'positive' | 'neutral' | 'negative';
          is_synthetic: boolean;
          source_marketplace: string | null;
          source_url: string | null;
          source_review_id: string | null;
          scraped_at: string;
          embedding: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          author: string;
          text: string;
          rating: number;
          date_text: string;
          marketplace_name: string;
          verified?: boolean;
          sentiment: 'positive' | 'neutral' | 'negative';
          is_synthetic?: boolean;
          source_marketplace?: string | null;
          source_url?: string | null;
          source_review_id?: string | null;
          scraped_at?: string;
          embedding?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          author?: string;
          text?: string;
          rating?: number;
          date_text?: string;
          marketplace_name?: string;
          verified?: boolean;
          sentiment?: 'positive' | 'neutral' | 'negative';
          is_synthetic?: boolean;
          source_marketplace?: string | null;
          source_url?: string | null;
          source_review_id?: string | null;
          scraped_at?: string;
          embedding?: string | null;
          created_at?: string;
        };
      };
      user_searches: {
        Row: {
          id: string;
          user_id: string;
          query: string;
          category: string | null;
          answers: Json;
          product_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          query: string;
          category?: string | null;
          answers?: Json;
          product_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          query?: string;
          category?: string | null;
          answers?: Json;
          product_id?: string | null;
          created_at?: string;
        };
      };
      scraping_jobs: {
        Row: {
          id: string;
          search_id: string | null;
          user_id: string;
          status: 'pending' | 'scraping' | 'analyzing' | 'completed' | 'failed';
          progress_message: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          search_id?: string | null;
          user_id: string;
          status?: 'pending' | 'scraping' | 'analyzing' | 'completed' | 'failed';
          progress_message?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          search_id?: string | null;
          user_id?: string;
          status?: 'pending' | 'scraping' | 'analyzing' | 'completed' | 'failed';
          progress_message?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_tracked_products: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          target_price: number | null;
          notify_email: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          target_price?: number | null;
          notify_email?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          target_price?: number | null;
          notify_email?: boolean;
          created_at?: string;
        };
      };
    };
  };
}

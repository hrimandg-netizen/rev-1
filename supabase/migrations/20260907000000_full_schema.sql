-- ============================================================================
-- ReviewRadar Full Database Schema Migration
-- Migration: 20260907000000_full_schema.sql
-- Description: Sets up full PostgreSQL backend including pgvector extension,
--              products (with provenance), marketplace listings, rating categories,
--              reviews (with vector embeddings & provenance), user searches,
--              scraping jobs queue, and user tracked products. Hardens RLS.
-- ============================================================================

-- 1. Enable vector extension for semantic review analysis & defect tracking
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products (with Provenance)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  product_name TEXT NOT NULL,
  model_number TEXT NOT NULL,
  base_price NUMERIC(12,2) NOT NULL,
  summary TEXT,
  is_synthetic BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_model ON public.products(model_number);

-- 4. Marketplaces
CREATE TABLE IF NOT EXISTS public.marketplaces (
  id TEXT PRIMARY KEY, -- 'amazon', 'flipkart', 'croma', 'reliance', 'snapdeal', 'tatacliq'
  name TEXT NOT NULL,
  logo TEXT NOT NULL,
  color TEXT NOT NULL,
  base_url TEXT NOT NULL
);

-- 5. Marketplace Listings (with Provenance)
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  marketplace_id TEXT NOT NULL REFERENCES public.marketplaces(id),
  price NUMERIC(12,2) NOT NULL,
  original_price NUMERIC(12,2) NOT NULL,
  discount INT DEFAULT 0,
  currency TEXT DEFAULT 'Rs',
  star_rating NUMERIC(3,2) NOT NULL,
  review_count INT DEFAULT 0,
  delivery_days TEXT NOT NULL,
  in_stock BOOLEAN DEFAULT TRUE,
  url TEXT NOT NULL,
  overall_score NUMERIC(3,1) NOT NULL,
  pros JSONB DEFAULT '[]'::jsonb,
  cons JSONB DEFAULT '[]'::jsonb,
  -- Provenance fields
  is_synthetic BOOLEAN DEFAULT FALSE,
  source_url TEXT,
  source_listing_id TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_listings_product ON public.marketplace_listings(product_id);

-- 6. Rating Categories
CREATE TABLE IF NOT EXISTS public.rating_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  score NUMERIC(3,1) NOT NULL,
  icon TEXT NOT NULL,
  detail TEXT NOT NULL,
  weight NUMERIC(3,2) NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_ratings_listing ON public.rating_categories(listing_id);

-- 7. Reviews with pgvector & Provenance
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  rating INT NOT NULL,
  date_text TEXT NOT NULL,
  marketplace_name TEXT NOT NULL,
  verified BOOLEAN DEFAULT TRUE,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  -- Provenance & Vector
  is_synthetic BOOLEAN DEFAULT FALSE,
  source_marketplace TEXT,
  source_url TEXT,
  source_review_id TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  embedding vector(1536), -- 1536-dim OpenAI embedding vector
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON public.reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment ON public.reviews(sentiment);
-- HNSW Cosine Similarity Index for fast semantic review retrieval
CREATE INDEX IF NOT EXISTS idx_reviews_embedding_hnsw 
  ON public.reviews USING hnsw (embedding vector_cosine_ops);

-- 8. User Searches
CREATE TABLE IF NOT EXISTS public.user_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  category TEXT,
  answers JSONB DEFAULT '{}'::jsonb,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_searches_user ON public.user_searches(user_id, created_at DESC);

-- 9. Scraping Jobs Queue (references user_searches via search_id)
CREATE TABLE IF NOT EXISTS public.scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.user_searches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'scraping', 'analyzing', 'completed', 'failed')) DEFAULT 'pending',
  progress_message TEXT DEFAULT 'Initializing scanner...',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON public.scraping_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_search ON public.scraping_jobs(search_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.scraping_jobs(status);

-- 10. User Tracked Products
CREATE TABLE IF NOT EXISTS public.user_tracked_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_price NUMERIC(12,2),
  notify_email BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_tracked_user ON public.user_tracked_products(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tracked_products ENABLE ROW LEVEL SECURITY;

-- Public Read Policies for Catalog
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Marketplaces" ON public.marketplaces FOR SELECT USING (true);
CREATE POLICY "Public Read Listings" ON public.marketplace_listings FOR SELECT USING (true);
CREATE POLICY "Public Read Ratings" ON public.rating_categories FOR SELECT USING (true);
CREATE POLICY "Public Read Reviews" ON public.reviews FOR SELECT USING (true);

-- Owner Isolation Policies with Explicit WITH CHECK Rules
CREATE POLICY "Profiles Select Own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles Update Own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Searches Select Own" ON public.user_searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Searches Insert Own" ON public.user_searches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Searches Delete Own" ON public.user_searches FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Jobs Select Own" ON public.scraping_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Jobs Insert Own" ON public.scraping_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Jobs Update Own" ON public.scraping_jobs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Jobs Delete Own" ON public.scraping_jobs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Tracked Select Own" ON public.user_tracked_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tracked Insert Own" ON public.user_tracked_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tracked Update Own" ON public.user_tracked_products FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tracked Delete Own" ON public.user_tracked_products FOR DELETE USING (auth.uid() = user_id);

-- Hardened Trigger Function (SECURITY DEFINER + search_path = public)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed Default Marketplaces
INSERT INTO public.marketplaces (id, name, logo, color, base_url)
VALUES
  ('amazon', 'Amazon', 'a', 'from-blue-500 to-blue-700', 'amazon.in'),
  ('flipkart', 'Flipkart', 'f', 'from-sky-400 to-blue-600', 'flipkart.com'),
  ('croma', 'Croma', 'C', 'from-blue-600 to-indigo-500', 'croma.com'),
  ('reliance', 'Reliance Digital', 'R', 'from-sky-500 to-blue-800', 'reliancedigital.in'),
  ('snapdeal', 'Snapdeal', 'S', 'from-blue-400 to-sky-600', 'snapdeal.com'),
  ('tatacliq', 'Tata CLiQ', 'T', 'from-blue-500 to-cyan-600', 'tatacliq.com')
ON CONFLICT (id) DO NOTHING;

-- Enable Realtime on scraping_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.scraping_jobs;

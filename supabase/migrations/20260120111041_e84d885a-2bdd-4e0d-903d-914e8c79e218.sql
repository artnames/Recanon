-- Create sealed_claims table for storing sealed claim bundles
CREATE TABLE public.sealed_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  bundle_version text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('static', 'loop')),
  claim_type text,
  title text,
  statement text,
  subject text,
  event_date timestamptz,
  poster_hash text UNIQUE NOT NULL,
  animation_hash text,
  sources jsonb,
  bundle_json jsonb NOT NULL,
  keywords text
);

-- Enable Row Level Security
ALTER TABLE public.sealed_claims ENABLE ROW LEVEL SECURITY;

-- Allow public read access (demo mode)
CREATE POLICY "Allow public read access"
  ON public.sealed_claims
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public insert access (demo mode)
CREATE POLICY "Allow public insert access"
  ON public.sealed_claims
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create indexes for common queries
CREATE INDEX idx_sealed_claims_created_at ON public.sealed_claims (created_at DESC);
CREATE INDEX idx_sealed_claims_poster_hash ON public.sealed_claims (poster_hash);
CREATE INDEX idx_sealed_claims_claim_type ON public.sealed_claims (claim_type);

-- Create GIN index for full-text search on keywords
CREATE INDEX idx_sealed_claims_keywords ON public.sealed_claims USING GIN (to_tsvector('english', COALESCE(keywords, '')));

-- Comment on table
COMMENT ON TABLE public.sealed_claims IS 'Registry of sealed claim bundles from the Canonical Renderer';
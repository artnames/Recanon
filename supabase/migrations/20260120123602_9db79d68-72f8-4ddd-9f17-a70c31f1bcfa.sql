-- ============================================================
-- SEALED CLAIMS VALIDATION HARDENING
-- Adds CHECK constraints and validation trigger for data integrity
-- ============================================================

-- 1. Add CHECK constraints for text field lengths
ALTER TABLE public.sealed_claims 
  ADD CONSTRAINT chk_title_length CHECK (title IS NULL OR length(title) <= 500),
  ADD CONSTRAINT chk_statement_length CHECK (statement IS NULL OR length(statement) <= 5000),
  ADD CONSTRAINT chk_subject_length CHECK (subject IS NULL OR length(subject) <= 500),
  ADD CONSTRAINT chk_keywords_length CHECK (keywords IS NULL OR length(keywords) <= 2000);

-- 2. Add constraint for bundle_version whitelist
ALTER TABLE public.sealed_claims 
  ADD CONSTRAINT chk_bundle_version CHECK (bundle_version IN ('recanon.event.v1'));

-- 3. Add constraint for mode whitelist
ALTER TABLE public.sealed_claims 
  ADD CONSTRAINT chk_mode CHECK (mode IN ('static', 'loop'));

-- 4. Add regex validation for hash formats (sha256: prefix + 64 hex chars OR just 64 hex chars)
ALTER TABLE public.sealed_claims 
  ADD CONSTRAINT chk_poster_hash_format CHECK (poster_hash ~ '^(sha256:)?[a-fA-F0-9]{64}$'),
  ADD CONSTRAINT chk_animation_hash_format CHECK (animation_hash IS NULL OR animation_hash ~ '^(sha256:)?[a-fA-F0-9]{64}$');

-- 5. Add size limit on JSONB columns
ALTER TABLE public.sealed_claims
  ADD CONSTRAINT chk_bundle_json_size CHECK (pg_column_size(bundle_json) <= 200000),
  ADD CONSTRAINT chk_sources_size CHECK (sources IS NULL OR pg_column_size(sources) <= 100000);

-- 6. Add constraint: bundle_json must be an object (not array, string, etc.)
ALTER TABLE public.sealed_claims
  ADD CONSTRAINT chk_bundle_json_is_object CHECK (jsonb_typeof(bundle_json) = 'object');

-- 7. Add constraint: sources must be array or null
ALTER TABLE public.sealed_claims
  ADD CONSTRAINT chk_sources_is_array CHECK (sources IS NULL OR jsonb_typeof(sources) = 'array');

-- 8. Create validation trigger function for complex JSON structure validation
CREATE OR REPLACE FUNCTION public.validate_sealed_claim_bundle()
RETURNS TRIGGER AS $$
DECLARE
  snapshot jsonb;
  vars_length int;
BEGIN
  -- Extract snapshot
  snapshot := NEW.bundle_json->'snapshot';
  
  -- Validate snapshot exists
  IF snapshot IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR:SNAPSHOT_MISSING:Bundle must contain snapshot object';
  END IF;
  
  -- Validate snapshot.code exists and is non-empty string
  IF snapshot->>'code' IS NULL OR length(trim(snapshot->>'code')) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR:CODE_MISSING:Snapshot must contain non-empty code string';
  END IF;
  
  -- Validate snapshot.seed is a number
  IF NOT (jsonb_typeof(snapshot->'seed') = 'number') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR:SEED_INVALID:Snapshot seed must be a number';
  END IF;
  
  -- Validate snapshot.vars is an array with exactly 10 elements
  IF jsonb_typeof(snapshot->'vars') != 'array' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR:VARS_INVALID:Snapshot vars must be an array';
  END IF;
  
  vars_length := jsonb_array_length(snapshot->'vars');
  IF vars_length != 10 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR:VARS_LENGTH:Snapshot vars must have exactly 10 elements, got %', vars_length;
  END IF;
  
  -- Validate loop mode requires animation_hash
  IF NEW.mode = 'loop' AND (NEW.animation_hash IS NULL OR length(trim(NEW.animation_hash)) = 0) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR:LOOP_NO_ANIMATION:Loop mode claims require animation_hash';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 9. Attach trigger to sealed_claims table
DROP TRIGGER IF EXISTS trg_validate_sealed_claim ON public.sealed_claims;
CREATE TRIGGER trg_validate_sealed_claim
  BEFORE INSERT ON public.sealed_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_sealed_claim_bundle();
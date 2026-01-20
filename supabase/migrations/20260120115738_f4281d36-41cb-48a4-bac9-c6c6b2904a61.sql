-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Allow public insert access" ON public.sealed_claims;

-- Create a new INSERT policy that requires authentication
CREATE POLICY "Authenticated users can insert claims"
ON public.sealed_claims
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add explicit DENY policies for UPDATE and DELETE to document immutability
-- (By not having policies, RLS already denies these, but explicit is clearer)
CREATE POLICY "No updates allowed - claims are immutable"
ON public.sealed_claims
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No deletes allowed - claims are permanent"
ON public.sealed_claims
FOR DELETE
TO authenticated
USING (false);
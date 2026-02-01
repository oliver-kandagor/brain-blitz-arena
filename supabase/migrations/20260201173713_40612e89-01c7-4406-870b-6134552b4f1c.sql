-- ============================================
-- FIX 1: Secure profiles table - Create a view for leaderboard
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a policy that allows users to view only their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Create a public leaderboard view with only non-sensitive fields
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
  id,
  username,
  avatar_url,
  total_points
FROM public.profiles
ORDER BY total_points DESC;

-- Grant access to the view
GRANT SELECT ON public.leaderboard_view TO anon, authenticated;

-- ============================================
-- FIX 2: Secure challenges table - Hide answers from direct queries
-- ============================================

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Anyone can view challenges" ON public.challenges;

-- Create a policy that only allows authenticated users to see questions (not answers)
-- We'll create a secure function to serve questions without answers
CREATE POLICY "No direct access to challenges"
ON public.challenges
FOR SELECT
USING (false);

-- Create a secure function to get challenges WITHOUT correct_answer
CREATE OR REPLACE FUNCTION public.get_challenges_without_answers(
  p_subject_id uuid,
  p_difficulty text,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  subject_id uuid,
  difficulty text,
  question text,
  options jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.subject_id,
    c.difficulty::text,
    c.question,
    c.options
  FROM challenges c
  WHERE c.subject_id = p_subject_id
    AND c.difficulty::text = p_difficulty
  ORDER BY random()
  LIMIT p_limit;
END;
$$;

-- Create a secure function to validate an answer
CREATE OR REPLACE FUNCTION public.validate_answer(
  p_challenge_id uuid,
  p_answer text
)
RETURNS TABLE (
  is_correct boolean,
  correct_answer text,
  explanation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.correct_answer = p_answer as is_correct,
    c.correct_answer,
    c.explanation
  FROM challenges c
  WHERE c.id = p_challenge_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_challenges_without_answers TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_answer TO authenticated;
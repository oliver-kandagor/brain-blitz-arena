-- Fix 1: Recreate leaderboard_view without SECURITY DEFINER
DROP VIEW IF EXISTS public.leaderboard_view;

CREATE VIEW public.leaderboard_view AS
SELECT 
  p.id,
  p.username,
  p.total_points,
  p.avatar_url
FROM public.profiles p
WHERE p.total_points > 0
ORDER BY p.total_points DESC;

-- Fix 2: Update game_participants RLS to restrict SELECT to session participants only
DROP POLICY IF EXISTS "Anyone can view game participants" ON public.game_participants;

CREATE POLICY "Users can view participants in their sessions"
ON public.game_participants
FOR SELECT
USING (
  auth.uid() IN (
    SELECT gp.user_id 
    FROM public.game_participants gp 
    WHERE gp.session_id = game_participants.session_id
  )
  OR is_ai = true
);
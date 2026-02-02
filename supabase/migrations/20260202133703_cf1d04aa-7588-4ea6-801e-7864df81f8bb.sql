-- Fix: Recreate leaderboard_view with security_invoker = true
DROP VIEW IF EXISTS public.leaderboard_view;

CREATE VIEW public.leaderboard_view 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.username,
  p.total_points,
  p.avatar_url
FROM public.profiles p
WHERE p.total_points > 0
ORDER BY p.total_points DESC;
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create difficulty levels enum
CREATE TYPE public.difficulty_level AS ENUM ('basic', 'intermediate', 'advanced');

-- Create challenges table
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  difficulty difficulty_level NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create game sessions table
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  difficulty difficulty_level NOT NULL,
  status TEXT DEFAULT 'waiting',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create game participants table
CREATE TABLE public.game_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_ai BOOLEAN DEFAULT false,
  ai_name TEXT,
  score INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  answers JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create badges table
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  difficulty difficulty_level,
  badge_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user badges table
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create user progress table
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  difficulty difficulty_level NOT NULL,
  completed BOOLEAN DEFAULT false,
  wins INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, subject_id, difficulty)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subjects policies (public read)
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);

-- Challenges policies (public read)
CREATE POLICY "Anyone can view challenges" ON public.challenges FOR SELECT USING (true);

-- Game sessions policies
CREATE POLICY "Anyone can view game sessions" ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create game sessions" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update game sessions" ON public.game_sessions FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Game participants policies
CREATE POLICY "Anyone can view game participants" ON public.game_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join games" ON public.game_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update own participation" ON public.game_participants FOR UPDATE USING (auth.uid() = user_id OR is_ai = true);

-- Badges policies (public read)
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);

-- User badges policies
CREATE POLICY "Users can view all user badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System can insert user badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User progress policies
CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);

-- Create profile trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, new.raw_user_meta_data ->> 'username');
  RETURN new;
END;
$$;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default subjects
INSERT INTO public.subjects (name, icon, color, description) VALUES
  ('Mathematics', '🔢', 'cyan', 'Numbers, algebra, geometry and problem solving'),
  ('English', '📚', 'emerald', 'Grammar, vocabulary, reading and writing'),
  ('Kiswahili', '🌍', 'amber', 'Sarufi, msamiati na uandishi'),
  ('Science', '🔬', 'purple', 'Physics, chemistry, biology and experiments'),
  ('Social Studies', '🌐', 'rose', 'History, geography and civics'),
  ('Computer Science', '💻', 'blue', 'Programming, logic and digital skills');

-- Insert default badges
INSERT INTO public.badges (name, description, icon, subject_id, difficulty, badge_type)
SELECT 
  s.name || ' Basic', 
  'Complete Basic and Intermediate levels in ' || s.name, 
  '🥉', 
  s.id, 
  'basic'::difficulty_level, 
  'level'
FROM public.subjects s;

INSERT INTO public.badges (name, description, icon, subject_id, difficulty, badge_type)
SELECT 
  s.name || ' Intermediate', 
  'Complete Intermediate and Advanced levels in ' || s.name, 
  '🥈', 
  s.id, 
  'intermediate'::difficulty_level, 
  'level'
FROM public.subjects s;

INSERT INTO public.badges (name, description, icon, subject_id, difficulty, badge_type)
SELECT 
  s.name || ' Master', 
  'Master all levels in ' || s.name, 
  '🥇', 
  s.id, 
  'advanced'::difficulty_level, 
  'mastery'
FROM public.subjects s;

-- Enable realtime for game sessions and participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_participants;
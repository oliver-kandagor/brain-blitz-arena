import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Trophy, Zap, Star, BookOpen } from 'lucide-react';
import SubjectCard from '@/components/SubjectCard';
import { useToast } from '@/hooks/use-toast';

interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface Profile {
  username: string;
  total_points: number;
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [subjectsRes, profileRes] = await Promise.all([
        supabase.from('subjects').select('*'),
        supabase.from('profiles').select('username, total_points').eq('user_id', user?.id).single()
      ]);

      if (subjectsRes.data) {
        setSubjects(subjectsRes.data);
      }
      if (profileRes.data) {
        setProfile(profileRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading arena...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-display text-2xl font-bold text-gradient">
                BRAIN<span className="text-accent">BATTLE</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-6">
                <div className="flex items-center gap-2 text-accent">
                  <Trophy className="w-5 h-5" />
                  <span className="font-semibold">{profile?.total_points || 0}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="font-semibold">{profile?.username || 'Champion'}</p>
                  <p className="text-xs text-muted-foreground">Ready to battle</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSignOut}>
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-12">
          <div className="glass rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Choose Your <span className="text-gradient">Subject</span>
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Select a subject to start competing. Answer questions faster and more accurately 
                than your opponents to climb the ranks and earn badges!
              </p>
              
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm">Real-time Battles</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                  <Star className="w-4 h-4 text-accent" />
                  <span className="text-sm">Earn Points</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                  <BookOpen className="w-4 h-4 text-secondary" />
                  <span className="text-sm">AI Challenges</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject, index) => (
            <SubjectCard 
              key={subject.id} 
              subject={subject} 
              index={index}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

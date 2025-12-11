import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Lock, CheckCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface UserProgress {
  difficulty: string;
  completed: boolean;
  wins: number;
}

const difficulties = [
  {
    level: 'basic',
    name: 'Basic',
    description: 'Perfect for beginners',
    color: 'from-success/20 to-transparent border-success/30 hover:border-success/60',
    glow: 'hover:shadow-[0_0_30px_hsl(142,76%,45%,0.3)]',
    icon: '🌱',
  },
  {
    level: 'intermediate',
    name: 'Intermediate',
    description: 'For confident learners',
    color: 'from-accent/20 to-transparent border-accent/30 hover:border-accent/60',
    glow: 'hover:shadow-[0_0_30px_hsl(45,100%,51%,0.3)]',
    icon: '⚡',
  },
  {
    level: 'advanced',
    name: 'Advanced',
    description: 'Challenge yourself',
    color: 'from-secondary/20 to-transparent border-secondary/30 hover:border-secondary/60',
    glow: 'hover:shadow-[0_0_30px_hsl(262,83%,58%,0.3)]',
    icon: '🔥',
  },
];

const SubjectDetail = () => {
  const { subjectId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (subjectId && user) {
      fetchSubjectData();
    }
  }, [subjectId, user]);

  const fetchSubjectData = async () => {
    try {
      const [subjectRes, progressRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('id', subjectId).single(),
        supabase.from('user_progress').select('difficulty, completed, wins').eq('subject_id', subjectId).eq('user_id', user?.id)
      ]);

      if (subjectRes.data) {
        setSubject(subjectRes.data);
      }
      if (progressRes.data) {
        setProgress(progressRes.data);
      }
    } catch (error) {
      console.error('Error fetching subject:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressForDifficulty = (difficulty: string) => {
    return progress.find(p => p.difficulty === difficulty);
  };

  const handleStartGame = (difficulty: string) => {
    navigate(`/waiting-room/${subjectId}/${difficulty}`);
  };

  if (loading || !subject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading subject...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">{subject.icon}</span>
                {subject.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Subject Header */}
        <div className="glass rounded-2xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex items-center gap-6">
            <div className="text-7xl">{subject.icon}</div>
            <div>
              <h2 className="font-display text-3xl font-bold mb-2">{subject.name}</h2>
              <p className="text-muted-foreground">{subject.description}</p>
            </div>
          </div>
        </div>

        {/* Difficulty Selection */}
        <h3 className="font-display text-xl font-bold mb-6">Choose Difficulty</h3>
        
        <div className="space-y-4">
          {difficulties.map((diff, index) => {
            const prog = getProgressForDifficulty(diff.level);
            const isCompleted = prog?.completed;
            const wins = prog?.wins || 0;

            return (
              <button
                key={diff.level}
                onClick={() => handleStartGame(diff.level)}
                className={cn(
                  'w-full group relative p-6 rounded-2xl border bg-gradient-to-r transition-all duration-500 text-left',
                  'hover:scale-[1.01]',
                  diff.color,
                  diff.glow
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl group-hover:scale-110 transition-transform">
                      {diff.icon}
                    </div>
                    <div>
                      <h4 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                        {diff.name}
                        {isCompleted && <CheckCircle className="w-5 h-5 text-success" />}
                      </h4>
                      <p className="text-sm text-muted-foreground">{diff.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {wins > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent">
                        <Trophy className="w-4 h-4" />
                        <span className="font-semibold">{wins} wins</span>
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Badge Progress */}
        <div className="mt-12">
          <h3 className="font-display text-xl font-bold mb-6">Badge Progress</h3>
          <div className="glass rounded-2xl p-6">
            <div className="grid grid-cols-3 gap-4">
              {['🥉', '🥈', '🥇'].map((badge, index) => {
                const labels = ['Basic Badge', 'Intermediate Badge', 'Master Badge'];
                const requirements = [
                  'Win Basic & Complete Intermediate',
                  'Win Intermediate & Complete Advanced',
                  'Master all levels'
                ];
                
                return (
                  <div key={index} className="text-center p-4 rounded-xl bg-muted/30">
                    <div className="text-4xl mb-2 opacity-30">{badge}</div>
                    <h4 className="font-semibold text-sm mb-1">{labels[index]}</h4>
                    <p className="text-xs text-muted-foreground">{requirements[index]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubjectDetail;

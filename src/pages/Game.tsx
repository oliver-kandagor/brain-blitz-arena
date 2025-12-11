import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Users, Trophy } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
}

interface Participant {
  id: string;
  user_id: string | null;
  is_ai: boolean;
  ai_name: string | null;
  score: number;
  completed_at: string | null;
}

const Game = () => {
  const { sessionId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameComplete, setGameComplete] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const aiIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (sessionId && user) {
      fetchGameData();
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    };
  }, [sessionId, user]);

  useEffect(() => {
    if (questions.length > 0 && !gameComplete) {
      startTimer();
      simulateAIProgress();
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestionIndex, questions.length, gameComplete]);

  const fetchGameData = async () => {
    try {
      // Get session details
      const { data: session } = await supabase
        .from('game_sessions')
        .select('subject_id, difficulty')
        .eq('id', sessionId)
        .single();

      if (!session) {
        navigate('/dashboard');
        return;
      }

      // Generate questions using AI
      const { data: questionsData, error: questionsError } = await supabase.functions.invoke('generate-challenges', {
        body: { 
          subjectId: session.subject_id, 
          difficulty: session.difficulty,
          count: 5
        }
      });

      if (questionsError) throw questionsError;
      
      setQuestions(questionsData.questions || []);

      // Fetch participants
      const { data: participantsData } = await supabase
        .from('game_participants')
        .select('*')
        .eq('session_id', sessionId);

      if (participantsData) {
        setParticipants(participantsData);
      }

      // Subscribe to participant updates
      subscribeToParticipants();
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching game data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load game. Using sample questions.',
        variant: 'destructive'
      });
      
      // Fallback to sample questions
      setQuestions([
        { id: '1', question: 'What is 2 + 2?', options: ['3', '4', '5', '6'], correct_answer: '4' },
        { id: '2', question: 'What is 5 × 3?', options: ['10', '12', '15', '18'], correct_answer: '15' },
        { id: '3', question: 'What is 10 - 7?', options: ['2', '3', '4', '5'], correct_answer: '3' },
        { id: '4', question: 'What is 8 ÷ 2?', options: ['2', '3', '4', '5'], correct_answer: '4' },
        { id: '5', question: 'What is 6 + 9?', options: ['13', '14', '15', '16'], correct_answer: '15' }
      ]);
      setLoading(false);
    }
  };

  const subscribeToParticipants = () => {
    const channel = supabase
      .channel(`game-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_participants',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setParticipants(prev => 
            prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startTimer = () => {
    setTimeLeft(15);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeout();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    if (!showResult && !gameComplete) {
      setShowResult(true);
      setTimeout(() => moveToNextQuestion(), 2000);
    }
  };

  const simulateAIProgress = () => {
    // Simulate AI answering questions
    const aiParticipants = participants.filter(p => p.is_ai);
    
    aiIntervalRef.current = setInterval(async () => {
      for (const ai of aiParticipants) {
        if (Math.random() > 0.3) { // 70% chance to answer correctly
          const newScore = ai.score + (Math.random() > 0.5 ? 100 : 80);
          await supabase
            .from('game_participants')
            .update({ score: Math.min(newScore, questions.length * 100) })
            .eq('id', ai.id);
        }
      }
    }, 3000);
  };

  const handleAnswerSelect = async (answer: string) => {
    if (showResult || selectedAnswer) return;
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const isCorrect = answer === questions[currentQuestionIndex].correct_answer;
    const timeBonus = Math.floor(timeLeft * 5);
    const pointsEarned = isCorrect ? 100 + timeBonus : 0;
    
    if (isCorrect) {
      setScore(prev => prev + pointsEarned);
      
      // Update score in database
      await supabase
        .from('game_participants')
        .update({ score: score + pointsEarned })
        .eq('session_id', sessionId)
        .eq('user_id', user?.id);
    }
    
    setTimeout(() => moveToNextQuestion(), 2000);
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      finishGame();
    }
  };

  const finishGame = async () => {
    setGameComplete(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    
    // Mark as completed
    await supabase
      .from('game_participants')
      .update({ 
        score,
        completed_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('user_id', user?.id);

    // Update session status
    await supabase
      .from('game_sessions')
      .update({ 
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Fetch final results
    const { data: finalParticipants } = await supabase
      .from('game_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false });

    if (finalParticipants) {
      setParticipants(finalParticipants);
      
      // Update user's total points in profile
      if (user && score > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('user_id', user.id)
          .single();
        
        const currentPoints = profile?.total_points || 0;
        await supabase
          .from('profiles')
          .update({ total_points: currentPoints + score })
          .eq('user_id', user.id);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading challenges...</p>
        </div>
      </div>
    );
  }

  if (gameComplete) {
    const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);
    const userRank = sortedParticipants.findIndex(p => p.user_id === user?.id) + 1;
    const isWinner = userRank === 1;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="glass rounded-3xl p-8 text-center">
            <div className={cn(
              "text-8xl mb-6",
              isWinner ? "animate-bounce" : ""
            )}>
              {isWinner ? '🏆' : userRank <= 3 ? '🎉' : '💪'}
            </div>
            
            <h1 className="font-display text-4xl font-bold mb-2">
              {isWinner ? 'VICTORY!' : `Rank #${userRank}`}
            </h1>
            <p className="text-muted-foreground mb-8">
              {isWinner ? 'You dominated this battle!' : 'Great effort! Keep practicing!'}
            </p>

            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-4xl font-display font-bold text-accent">{score}</div>
                <div className="text-sm text-muted-foreground">Points Earned</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display font-bold text-primary">#{userRank}</div>
                <div className="text-sm text-muted-foreground">Final Rank</div>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-muted/30 rounded-2xl p-6 mb-8">
              <h3 className="font-display text-lg font-bold mb-4 flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-accent" />
                Final Standings
              </h3>
              <div className="space-y-3">
                {sortedParticipants.slice(0, 5).map((p, index) => (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-xl',
                      p.user_id === user?.id ? 'bg-primary/20' : 'bg-muted/30'
                    )}
                  >
                    <div className="font-display text-xl font-bold w-8">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">
                        {p.is_ai ? p.ai_name : p.user_id === user?.id ? 'You' : 'Player'}
                      </p>
                    </div>
                    <div className="font-display font-bold text-accent">{p.score}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Back to Subjects
              </Button>
              <Button variant="gaming" onClick={() => window.location.reload()}>
                Play Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">{participants.length} players</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Question</span>
              <span className="font-display font-bold text-primary">
                {currentQuestionIndex + 1}/{questions.length}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              <span className="font-display font-bold">{score}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Timer */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          <Clock className={cn(
            "w-5 h-5",
            timeLeft <= 5 ? "text-destructive animate-pulse" : "text-primary"
          )} />
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-1000",
                timeLeft <= 5 ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${(timeLeft / 15) * 100}%` }}
            />
          </div>
          <span className={cn(
            "font-display font-bold w-8 text-right",
            timeLeft <= 5 ? "text-destructive" : "text-foreground"
          )}>
            {timeLeft}
          </span>
        </div>
      </div>

      {/* Question */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="glass rounded-3xl p-8 mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center">
            {currentQuestion?.question}
          </h2>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQuestion?.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === currentQuestion.correct_answer;
            const showCorrectness = showResult;

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                disabled={showResult}
                className={cn(
                  'p-6 rounded-2xl border-2 text-left transition-all duration-300',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  !showResult && 'border-border hover:border-primary hover:bg-primary/5',
                  showCorrectness && isCorrect && 'border-success bg-success/20',
                  showCorrectness && isSelected && !isCorrect && 'border-destructive bg-destructive/20',
                  isSelected && !showResult && 'border-primary bg-primary/10'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold',
                    showCorrectness && isCorrect ? 'bg-success text-success-foreground' :
                    showCorrectness && isSelected && !isCorrect ? 'bg-destructive text-destructive-foreground' :
                    'bg-muted'
                  )}>
                    {showCorrectness && isCorrect ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : showCorrectness && isSelected && !isCorrect ? (
                      <XCircle className="w-6 h-6" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </div>
                  <span className="font-medium text-lg">{option}</span>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Game;

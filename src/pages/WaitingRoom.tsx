import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Participant {
  id: string;
  user_id: string | null;
  is_ai: boolean;
  ai_name: string | null;
  profile?: {
    username: string;
  };
}

const AI_NAMES = ['AlphaBot', 'BrainMaster', 'QuizWiz', 'SmartBot', 'ChallengeBot'];

const WaitingRoom = () => {
  const { subjectId, difficulty } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [countdown, setCountdown] = useState(20);
  const [cycle, setCycle] = useState(1);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameStarting, setGameStarting] = useState(false);
  const [profile, setProfile] = useState<{ username: string } | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      joinOrCreateSession();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, subjectId, difficulty]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user?.id)
      .single();
    if (data) setProfile(data);
  };

  const joinOrCreateSession = async () => {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    try {
      // Look for existing waiting session
      const { data: existingSession } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('difficulty', difficulty)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      let currentSessionId: string;

      if (existingSession) {
        currentSessionId = existingSession.id;
      } else {
        // Create new session
        const { data: newSession, error } = await supabase
          .from('game_sessions')
          .insert({
            subject_id: subjectId!,
            difficulty: difficulty as 'basic' | 'intermediate' | 'advanced',
            status: 'waiting'
          })
          .select('id')
          .single();

        if (error) throw error;
        currentSessionId = newSession.id;
      }

      setSessionId(currentSessionId);

      // Join as participant
      await supabase
        .from('game_participants')
        .insert({
          session_id: currentSessionId,
          user_id: user?.id,
          is_ai: false
        });

      // Start countdown
      startCountdown(currentSessionId);
      
      // Subscribe to realtime updates
      subscribeToSession(currentSessionId);
      
      // Fetch current participants
      fetchParticipants(currentSessionId);
    } catch (error) {
      console.error('Error joining session:', error);
      toast({
        title: 'Error',
        description: 'Failed to join game session',
        variant: 'destructive'
      });
    }
  };

  const fetchParticipants = async (sid: string) => {
    const { data } = await supabase
      .from('game_participants')
      .select('id, user_id, is_ai, ai_name')
      .eq('session_id', sid);
    
    if (data) {
      // Fetch profiles for human participants
      const humanParticipants = data.filter(p => !p.is_ai && p.user_id);
      const profilePromises = humanParticipants.map(p => 
        supabase.from('profiles').select('username').eq('user_id', p.user_id).single()
      );
      
      const profiles = await Promise.all(profilePromises);
      
      const enrichedData = data.map((p, i) => {
        if (!p.is_ai && p.user_id) {
          const profileIndex = humanParticipants.findIndex(hp => hp.user_id === p.user_id);
          return { ...p, profile: profiles[profileIndex]?.data };
        }
        return p;
      });
      
      setParticipants(enrichedData);
    }
  };

  const subscribeToSession = (sid: string) => {
    const channel = supabase
      .channel(`session-${sid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          filter: `session_id=eq.${sid}`
        },
        () => {
          fetchParticipants(sid);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startCountdown = (sid: string) => {
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Check participants and decide action
          handleCountdownEnd(sid);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCountdownEnd = async (sid: string) => {
    const { data: currentParticipants } = await supabase
      .from('game_participants')
      .select('id, is_ai')
      .eq('session_id', sid);

    const humanCount = currentParticipants?.filter(p => !p.is_ai).length || 0;
    const totalCount = currentParticipants?.length || 0;

    if (totalCount >= 2) {
      // Start the game
      startGame(sid);
    } else if (cycle >= 3) {
      // Add AI opponents after 3 cycles
      addAIOpponents(sid);
    } else {
      // Add another cycle
      setCycle(prev => prev + 1);
      toast({
        title: 'Waiting for players...',
        description: 'Adding more time to find opponents',
      });
    }
  };

  const addAIOpponents = async (sid: string) => {
    const numAI = Math.floor(Math.random() * 2) + 1; // 1-2 AI opponents
    
    for (let i = 0; i < numAI; i++) {
      await supabase
        .from('game_participants')
        .insert({
          session_id: sid,
          is_ai: true,
          ai_name: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)]
        });
    }

    toast({
      title: 'AI Opponents joined!',
      description: 'Get ready to compete!',
    });

    // Start game after adding AI
    setTimeout(() => startGame(sid), 2000);
  };

  const startGame = async (sid: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setGameStarting(true);
    
    await supabase
      .from('game_sessions')
      .update({ status: 'starting', started_at: new Date().toISOString() })
      .eq('id', sid);

    // Navigate to game after 3 second countdown
    setTimeout(() => {
      navigate(`/game/${sid}`);
    }, 3000);
  };

  const handleLeave = async () => {
    if (sessionId) {
      await supabase
        .from('game_participants')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user?.id);
    }
    navigate(`/subject/${subjectId}`);
  };

  if (gameStarting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl font-display font-bold text-gradient animate-pulse mb-8">
            GET READY!
          </div>
          <p className="text-xl text-muted-foreground">Game starting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={handleLeave}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display text-xl font-bold">Waiting Room</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Countdown */}
        <div className="text-center mb-12">
          <div className="relative w-48 h-48 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="553"
                strokeDashoffset={553 - (553 * countdown) / 20}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-5xl font-bold text-primary">{countdown}</span>
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold mb-2">
            Finding Opponents...
          </h2>
          <p className="text-muted-foreground">
            {cycle > 1 ? `Cycle ${cycle} of 3` : 'Searching for players'}
          </p>
          {cycle >= 3 && (
            <p className="text-sm text-accent mt-2">AI opponents will join soon!</p>
          )}
        </div>

        {/* Participants */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Players ({participants.length})
            </h3>
            <span className="text-sm text-muted-foreground">
              Need 2+ to start
            </span>
          </div>

          <div className="space-y-3">
            {participants.map((participant, index) => (
              <div
                key={participant.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl bg-muted/30',
                  'animate-slide-up'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  participant.is_ai ? 'bg-secondary/20' : 'bg-primary/20'
                )}>
                  {participant.is_ai ? (
                    <Bot className="w-6 h-6 text-secondary" />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">
                    {participant.is_ai 
                      ? participant.ai_name 
                      : participant.user_id === user?.id 
                        ? `${profile?.username || 'You'} (You)`
                        : participant.profile?.username || 'Player'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {participant.is_ai ? 'AI Opponent' : 'Human Player'}
                  </p>
                </div>
                {!participant.is_ai && participant.user_id === user?.id && (
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                    You
                  </span>
                )}
              </div>
            ))}

            {participants.length < 2 && (
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-muted">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground">Waiting for opponent...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leave Button */}
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={handleLeave}>
            Leave Room
          </Button>
        </div>
      </main>
    </div>
  );
};

export default WaitingRoom;

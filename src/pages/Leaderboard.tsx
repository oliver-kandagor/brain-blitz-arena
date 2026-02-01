import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, Trophy, Medal, Star, Crown } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  username: string | null;
  total_points: number;
  avatar_url: string | null;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      // Use the secure leaderboard_view instead of profiles table
      const { data, error } = await supabase
        .from('leaderboard_view')
        .select('id, username, total_points, avatar_url')
        .order('total_points', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLeaderboard(data || []);
      
      // Get current user's own profile for rank display
      if (user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('user_id', user.id)
          .single();
          
        if (userProfile) {
          setUserPoints(userProfile.total_points);
          // Find rank based on points in leaderboard
          const rank = (data || []).findIndex(p => p.total_points <= (userProfile.total_points || 0));
          setUserRank(rank >= 0 ? rank + 1 : (data?.length || 0) + 1);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="font-display font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50';
      case 2: return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/50';
      case 3: return 'bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/50';
      default: return 'bg-muted/30 border-border';
    }
  };

  // Check if current user is in the leaderboard entry (compare by points since we don't have user_id in view)
  const isCurrentUser = (entry: LeaderboardEntry, index: number) => {
    if (!user || userPoints === null) return false;
    return entry.total_points === userPoints && userRank === index + 1;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-accent" />
                <span className="font-display text-xl font-bold">Global Leaderboard</span>
              </div>
            </div>
            
            {userRank && (
              <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full">
                <Star className="w-4 h-4 text-primary" />
                <span className="font-display font-bold">Your Rank: #{userRank}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="flex justify-center items-end gap-4 mb-12">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-3xl mb-2">
                {leaderboard[1].avatar_url ? (
                  <img src={leaderboard[1].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : '🥈'}
              </div>
              <p className="font-display font-bold">{leaderboard[1].username || 'Player'}</p>
              <p className="text-accent font-bold">{leaderboard[1].total_points?.toLocaleString() || 0}</p>
              <div className="w-24 h-20 bg-gradient-to-t from-gray-500 to-gray-400 rounded-t-lg mt-2" />
            </div>
            
            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <Crown className="w-8 h-8 text-yellow-400 mb-1 animate-bounce" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-4xl mb-2 ring-4 ring-yellow-400/50">
                {leaderboard[0].avatar_url ? (
                  <img src={leaderboard[0].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : '🥇'}
              </div>
              <p className="font-display font-bold text-lg">{leaderboard[0].username || 'Player'}</p>
              <p className="text-accent font-bold text-xl">{leaderboard[0].total_points?.toLocaleString() || 0}</p>
              <div className="w-28 h-28 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg mt-2" />
            </div>
            
            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-3xl mb-2">
                {leaderboard[2].avatar_url ? (
                  <img src={leaderboard[2].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : '🥉'}
              </div>
              <p className="font-display font-bold">{leaderboard[2].username || 'Player'}</p>
              <p className="text-accent font-bold">{leaderboard[2].total_points?.toLocaleString() || 0}</p>
              <div className="w-24 h-16 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg mt-2" />
            </div>
          </div>
        )}

        {/* Full Leaderboard List */}
        <div className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold mb-6">All Rankings</h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                const isCurrent = isCurrentUser(entry, index);
                
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border transition-all',
                      getRankBg(rank),
                      isCurrent && 'ring-2 ring-primary'
                    )}
                  >
                    <div className="w-10 flex justify-center">
                      {getRankIcon(rank)}
                    </div>
                    
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">{entry.username?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-display font-bold">
                        {entry.username || 'Anonymous Player'}
                        {isCurrent && <span className="text-primary ml-2">(You)</span>}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-display font-bold text-accent text-lg">
                        {entry.total_points?.toLocaleString() || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                );
              })}
              
              {leaderboard.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No players yet. Be the first to compete!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;

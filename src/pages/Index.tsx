import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Zap, Trophy, Users, Brain, Sparkles, Target, ArrowRight } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <div className="relative">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-20 right-20 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Navigation */}
        <nav className="relative z-10 container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold text-gradient">
              BRAIN<span className="text-accent">BATTLE</span>
            </h1>
            <Link to="/auth">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Learning Games</span>
          </div>

          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6 animate-slide-up">
            <span className="block">Challenge Your</span>
            <span className="text-gradient">Knowledge</span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '100ms' }}>
            Compete in real-time multiplayer battles across multiple subjects. 
            Answer faster, score higher, and become the ultimate champion.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Link to="/auth">
              <Button variant="gaming" size="xl" className="group">
                Start Playing
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="outline" size="xl">
              How It Works
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '300ms' }}>
            <div>
              <div className="font-display text-4xl font-bold text-primary">6</div>
              <div className="text-sm text-muted-foreground">Subjects</div>
            </div>
            <div>
              <div className="font-display text-4xl font-bold text-accent">∞</div>
              <div className="text-sm text-muted-foreground">AI Questions</div>
            </div>
            <div>
              <div className="font-display text-4xl font-bold text-secondary">24/7</div>
              <div className="text-sm text-muted-foreground">Competition</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="relative z-10 py-24 bg-gradient-to-b from-background to-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Why <span className="text-gradient">BrainBattle?</span>
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              The ultimate educational gaming platform that makes learning competitive and fun.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Real-time Multiplayer',
                description: 'Compete against players worldwide or challenge AI opponents when no one is around.',
                color: 'text-primary',
                bg: 'bg-primary/10'
              },
              {
                icon: Brain,
                title: 'AI-Generated Challenges',
                description: 'Fresh, unique questions every time powered by advanced AI technology.',
                color: 'text-secondary',
                bg: 'bg-secondary/10'
              },
              {
                icon: Trophy,
                title: 'Earn Badges',
                description: 'Progress through difficulty levels and earn prestigious badges for your achievements.',
                color: 'text-accent',
                bg: 'bg-accent/10'
              },
              {
                icon: Zap,
                title: 'Speed Matters',
                description: 'Answer faster to earn bonus points. Quick thinking leads to victory!',
                color: 'text-neon-pink',
                bg: 'bg-neon-pink/10'
              },
              {
                icon: Target,
                title: 'Multiple Subjects',
                description: 'From Mathematics to Computer Science - choose your battlefield.',
                color: 'text-success',
                bg: 'bg-success/10'
              },
              {
                icon: Sparkles,
                title: 'Progressive Difficulty',
                description: 'Start basic, advance through intermediate, and master the advanced level.',
                color: 'text-primary',
                bg: 'bg-primary/10'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="glass rounded-2xl p-8 hover:scale-[1.02] transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl ${feature.bg} flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h4 className="font-display text-xl font-bold mb-3">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <div className="glass rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />
            
            <div className="relative z-10">
              <h3 className="font-display text-4xl md:text-5xl font-bold mb-6">
                Ready to <span className="text-gradient">Compete?</span>
              </h3>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Join thousands of learners battling it out for knowledge supremacy. 
                Create your account and start your journey today!
              </p>
              <Link to="/auth">
                <Button variant="gaming" size="xl" className="group">
                  Create Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 BrainBattle. Learn. Compete. Conquer.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

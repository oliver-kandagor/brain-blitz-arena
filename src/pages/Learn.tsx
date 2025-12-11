import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  BookOpen, ArrowLeft, ArrowRight, ChevronLeft, 
  Lightbulb, CheckCircle, XCircle, Loader2, Sparkles 
} from 'lucide-react';

interface ContentSlide {
  slide_number: number;
  type: 'content';
  title: string;
  content: string;
  example: string;
  visual_description: string;
  key_points: string[];
}

interface QuizSlide {
  slide_number: number;
  type: 'quiz';
  title: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

type Slide = ContentSlide | QuizSlide;

interface Lesson {
  title: string;
  slides: Slide[];
}

const Learn = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'basic' | 'intermediate' | 'advanced'>('basic');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);

  const generateLesson = async () => {
    if (!topic.trim()) {
      toast({ title: 'Please enter a topic', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lesson', {
        body: { topic, difficulty }
      });

      if (error) throw error;
      
      if (data.lesson) {
        setLesson(data.lesson);
        setCurrentSlide(0);
        setSelectedAnswer(null);
        setShowQuizResult(false);
      }
    } catch (error) {
      console.error('Error generating lesson:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate lesson. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuizAnswer = (answer: string) => {
    if (showQuizResult) return;
    setSelectedAnswer(answer);
    setShowQuizResult(true);
  };

  const nextSlide = () => {
    if (lesson && currentSlide < lesson.slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
      setSelectedAnswer(null);
      setShowQuizResult(false);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
      setSelectedAnswer(null);
      setShowQuizResult(false);
    }
  };

  const resetLesson = () => {
    setLesson(null);
    setCurrentSlide(0);
    setTopic('');
    setSelectedAnswer(null);
    setShowQuizResult(false);
  };

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <span className="font-display text-xl font-bold">AI Teaching Engine</span>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="glass rounded-3xl p-8 text-center">
            <Sparkles className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold mb-2">Learn Anything</h1>
            <p className="text-muted-foreground mb-8">
              Enter any topic and our AI will create a personalized lesson just for you
            </p>

            <div className="space-y-6">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic (e.g., Photosynthesis, World War II, Python Basics)"
                className="text-lg py-6"
                onKeyDown={(e) => e.key === 'Enter' && generateLesson()}
              />

              <div className="flex justify-center gap-3">
                {(['basic', 'intermediate', 'advanced'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={cn(
                      'px-6 py-3 rounded-xl font-medium capitalize transition-all',
                      difficulty === level
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <Button 
                variant="gaming" 
                size="lg" 
                onClick={generateLesson}
                disabled={loading || !topic.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Lesson...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Lesson
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const slide = lesson.slides[currentSlide];
  const isQuiz = slide.type === 'quiz';
  const quizSlide = isQuiz ? slide as QuizSlide : null;
  const contentSlide = !isQuiz ? slide as ContentSlide : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={resetLesson}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-display font-bold">{lesson.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Slide {currentSlide + 1} of {lesson.slides.length}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {lesson.slides.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i === currentSlide ? 'bg-primary w-6' : 
                    i < currentSlide ? 'bg-primary/50' : 'bg-muted'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="glass rounded-3xl p-8 min-h-[60vh]">
          {isQuiz && quizSlide ? (
            <div className="space-y-8">
              <div className="flex items-center gap-3 text-primary">
                <Lightbulb className="w-6 h-6" />
                <span className="font-display font-bold">Quick Check</span>
              </div>
              
              <h2 className="font-display text-2xl font-bold">{quizSlide.question}</h2>
              
              <div className="grid gap-4">
                {quizSlide.options.map((option, i) => {
                  const isCorrect = option === quizSlide.correct_answer;
                  const isSelected = selectedAnswer === option;
                  
                  return (
                    <button
                      key={i}
                      onClick={() => handleQuizAnswer(option)}
                      disabled={showQuizResult}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        !showQuizResult && 'hover:border-primary hover:bg-primary/5',
                        !showQuizResult && 'border-border',
                        showQuizResult && isCorrect && 'border-success bg-success/20',
                        showQuizResult && isSelected && !isCorrect && 'border-destructive bg-destructive/20'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center font-bold',
                          showQuizResult && isCorrect ? 'bg-success text-success-foreground' :
                          showQuizResult && isSelected && !isCorrect ? 'bg-destructive text-destructive-foreground' :
                          'bg-muted'
                        )}>
                          {showQuizResult && isCorrect ? <CheckCircle className="w-5 h-5" /> :
                           showQuizResult && isSelected && !isCorrect ? <XCircle className="w-5 h-5" /> :
                           String.fromCharCode(65 + i)}
                        </div>
                        <span className="font-medium">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {showQuizResult && (
                <div className={cn(
                  'p-4 rounded-xl',
                  selectedAnswer === quizSlide.correct_answer ? 'bg-success/20' : 'bg-muted'
                )}>
                  <p className="font-medium mb-1">
                    {selectedAnswer === quizSlide.correct_answer ? '✅ Correct!' : '❌ Not quite!'}
                  </p>
                  <p className="text-muted-foreground">{quizSlide.explanation}</p>
                </div>
              )}
            </div>
          ) : contentSlide ? (
            <div className="space-y-6">
              <h2 className="font-display text-3xl font-bold">{contentSlide.title}</h2>
              
              <div className="prose prose-invert max-w-none">
                <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {contentSlide.content}
                </p>
              </div>
              
              {contentSlide.example && (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-6">
                  <h4 className="font-display font-bold mb-2 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Example
                  </h4>
                  <p className="text-muted-foreground">{contentSlide.example}</p>
                </div>
              )}
              
              {contentSlide.key_points && contentSlide.key_points.length > 0 && (
                <div className="bg-muted/30 rounded-xl p-6">
                  <h4 className="font-display font-bold mb-3">Key Points</h4>
                  <ul className="space-y-2">
                    {contentSlide.key_points.map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {contentSlide.visual_description && (
                <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center text-sm text-muted-foreground italic">
                  📸 Visual: {contentSlide.visual_description}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={prevSlide}
              disabled={currentSlide === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {currentSlide === lesson.slides.length - 1 ? (
              <Button variant="gaming" onClick={resetLesson}>
                Start New Lesson
              </Button>
            ) : (
              <Button variant="gaming" onClick={nextSlide}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Learn;
